"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  FileText,
  Heart,
  MessageCircle,
  GraduationCap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEntidade } from "@/lib/data/store";
import { UploadFotoAluno } from "@/components/alunos/upload-foto";
import { formatDateBR, formatBRL } from "@/lib/utils";
import type { FichaSaude } from "@/lib/types";

export default function AlunoDetalhePage() {
  const params = useParams<{ alunoId: string }>();
  const { items: alunos, carregando, erro: erroAlunos, update } = useEntidade("alunos");
  const { items: turmas } = useEntidade("turmas");
  const { items: mensalidades } = useEntidade("mensalidades");

  const aluno = alunos.find((a) => a.id === params.alunoId);
  const turma = aluno ? turmas.find((t) => t.id === aluno.turmaId) : null;

  if (carregando && !aluno) {
    return (
      <div className="space-y-6">
        <Link href="/alunos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para Alunos
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Carregando aluno...</CardContent>
        </Card>
      </div>
    );
  }

  if (erroAlunos && !aluno) {
    return (
      <div className="space-y-6">
        <Link href="/alunos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para Alunos
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="font-medium">Não foi possível carregar este aluno</div>
            <div className="mt-1 text-sm text-muted-foreground">{erroAlunos}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!aluno) return notFound();

  const mensalidadesAluno = mensalidades.filter((m) => m.alunoId === aluno.id);
  const idade = calcularIdade(aluno.dataNascimento);
  const responsavelPrincipal = aluno.responsaveis.find((responsavel) => responsavel.principal)
    ?? aluno.responsaveis[0];
  const whatsappPrincipal = linkWhatsApp(responsavelPrincipal?.telefone);
  const saude = aluno.fichaSaude;
  const doencas = saude ? listarDoencas(saude.doencas) : [];

  return (
    <div className="space-y-6">
      <Link
        href="/alunos"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para Alunos
      </Link>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6">
            <UploadFotoAluno
              alunoId={aluno.id}
              nomeAluno={aluno.nome}
              fotoAtual={aluno.foto}
              cor={turma?.cor}
              size="xl"
              onAtualizado={(url) => update(aluno.id, { foto: url })}
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{aluno.nome}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{turma?.nome ?? "Sem turma"}</span>
                <span>•</span>
                <span>{idade} anos</span>
                <span>•</span>
                <span>Matrícula {aluno.matricula}</span>
                {aluno.bilingue && (
                  <Badge variant="info" className="text-[10px]">
                    Bilíngue
                  </Badge>
                )}
                <Badge variant="success" className="text-[10px]">
                  {aluno.status}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/pedagogico/${aluno.id}`}>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Acompanhamento pedagógico
                </Link>
              </Button>
              {whatsappPrincipal ? (
                <Button asChild>
                  <a href={whatsappPrincipal} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" /> Enviar WhatsApp
                  </a>
                </Button>
              ) : (
                <Button disabled title="Cadastre o telefone de um responsável">
                  <MessageCircle className="mr-2 h-4 w-4" /> Enviar WhatsApp
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="responsaveis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="responsaveis">Responsáveis</TabsTrigger>
          <TabsTrigger value="dados">Dados do aluno</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="saude">Saúde</TabsTrigger>
        </TabsList>

        <TabsContent value="responsaveis">
          <div className="grid gap-4 md:grid-cols-2">
            {aluno.responsaveis.map((r, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {r.nome}
                    {r.principal && <Badge variant="info">Principal</Badge>}
                  </CardTitle>
                  <CardDescription>{r.parentesco}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    CPF: {r.cpf}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {r.telefone}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {r.email}
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    {r.endereco}
                  </div>
                  <div className="flex gap-2 pt-2">
                    {r.telefone ? (
                      <Button size="sm" variant="outline" className="flex-1" asChild>
                        <a href={`tel:${r.telefone.replace(/\D/g, "")}`}>
                          <Phone className="mr-2 h-4 w-4" /> Ligar
                        </a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1" disabled>
                        <Phone className="mr-2 h-4 w-4" /> Ligar
                      </Button>
                    )}
                    {linkWhatsApp(r.telefone) ? (
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" asChild>
                        <a href={linkWhatsApp(r.telefone)!} target="_blank" rel="noreferrer">
                          <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                        </a>
                      </Button>
                    ) : (
                      <Button size="sm" className="flex-1" disabled>
                        <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle>Dados pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome completo" value={aluno.nome} />
                <Field label="Data de nascimento" value={formatDateBR(aluno.dataNascimento)} />
                <Field label="CPF" value={aluno.cpf || "—"} />
                <Field label="RG" value={aluno.rg ?? "—"} />
                <Field label="Turma" value={turma?.nome ?? "—"} />
                <Field label="Turno" value={turma?.turno ?? "—"} />
                <Field label="Bilíngue" value={aluno.bilingue ? "Sim" : "Não"} />
                <Field label="Data da matrícula" value={formatDateBR(aluno.dataMatricula)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
              <CardDescription>Cópias digitalizadas e contratos do aluno</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                <div className="mt-3 text-sm font-medium">Nenhum documento anexado</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Esta área não exibe arquivos fictícios. O upload de documentos será mostrado aqui quando estiver configurado.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro">
          <Card>
            <CardHeader>
              <CardTitle>Mensalidades</CardTitle>
              <CardDescription>Histórico financeiro do aluno</CardDescription>
            </CardHeader>
            <CardContent>
              {mensalidadesAluno.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma mensalidade cadastrada para este aluno.
                </div>
              ) : (
                mensalidadesAluno.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between border-b py-3 last:border-0"
                  >
                    <div>
                      <div className="font-medium text-sm">{formatarCompetencia(m.competencia)}</div>
                      <div className="text-xs text-muted-foreground">
                        Vencimento: {formatDateBR(m.vencimento)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatBRL(m.valor)}</div>
                      <Badge
                        variant={
                          m.status === "Paga"
                            ? "success"
                            : m.status === "Atrasada"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {m.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saude">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-danger" /> Ficha de saúde
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!saude ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma informação de saúde cadastrada.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Alergias" value={saude.alergias?.trim() || "Não informadas"} />
                  <Field label="Doenças informadas" value={doencas.join(", ") || "Nenhuma informada"} />
                  <Field
                    label="Convênio"
                    value={saude.convenioSim ? saude.convenioQual?.trim() || "Sim" : "Não informado"}
                  />
                  <Field
                    label="Médico(a)"
                    value={[saude.medicoNome, saude.medicoTelefone].filter(Boolean).join(" · ") || "Não informado"}
                  />
                  <Field
                    label="Tratamento médico"
                    value={saude.tratamentoMedicoSim ? saude.tratamentoMotivo?.trim() || "Sim" : "Não informado"}
                  />
                  <Field
                    label="Internações"
                    value={saude.internadoSim ? saude.internadoMotivo?.trim() || "Sim" : "Não informadas"}
                  />
                  <Field label="Trauma ou fobia" value={saude.traumaFobia?.trim() || "Não informado"} />
                  <Field
                    label="Informações complementares"
                    value={saude.informacoesComplementares?.trim() || "Não informadas"}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function calcularIdade(dataNascimento: string): number {
  const [ano, mes, dia] = dataNascimento.split("-").map(Number);
  if (!ano || !mes || !dia) return 0;
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) {
    idade -= 1;
  }
  return Math.max(0, idade);
}

function linkWhatsApp(telefone: string | null | undefined): string | null {
  const digitos = telefone?.replace(/\D/g, "") ?? "";
  if (digitos.length < 10) return null;
  const numero = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${numero}`;
}

function formatarCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  if (!ano || !mes || mes < 1 || mes > 12) return competencia;
  const texto = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ano, mes - 1, 1)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function listarDoencas(doencas: FichaSaude["doencas"]): string[] {
  const rotulos: Array<[keyof typeof doencas, string]> = [
    ["bronquite", "Bronquite"],
    ["catapora", "Catapora"],
    ["caxumba", "Caxumba"],
    ["convulsao", "Convulsão"],
    ["coqueluche", "Coqueluche"],
    ["diabete", "Diabetes"],
    ["hepatite", doencas.hepatiteTipo ? `Hepatite ${doencas.hepatiteTipo}` : "Hepatite"],
    ["pneumonia", "Pneumonia"],
    ["problemasCoracao", "Problemas cardíacos"],
    ["rubeola", "Rubéola"],
    ["sarampo", "Sarampo"],
  ];
  return rotulos.filter(([campo]) => Boolean(doencas[campo])).map(([, rotulo]) => rotulo);
}

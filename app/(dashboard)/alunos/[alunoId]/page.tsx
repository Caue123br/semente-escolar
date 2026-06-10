"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  Heart,
  MessageCircle,
  GraduationCap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAluno } from "@/lib/mock-data/alunos";
import { getTurma } from "@/lib/mock-data/turmas";
import { mensalidadesJunho } from "@/lib/mock-data/financeiro";
import { initials, formatDateBR, formatBRL } from "@/lib/utils";

export default function AlunoDetalhePage() {
  const params = useParams<{ alunoId: string }>();
  const aluno = getAluno(params.alunoId);
  if (!aluno) return notFound();
  const turma = getTurma(aluno.turmaId);
  if (!turma) return notFound();

  const mensalidadesAluno = mensalidadesJunho.filter((m) => m.alunoId === aluno.id);
  const idade = 2026 - new Date(aluno.dataNascimento).getFullYear();

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
          <div className="flex flex-wrap items-center gap-5">
            <Avatar className="h-20 w-20">
              <AvatarFallback
                className="text-xl font-bold"
                style={{ backgroundColor: turma.cor + "30", color: turma.cor }}
              >
                {initials(aluno.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{aluno.nome}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{turma.nome}</span>
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
              <Button>
                <MessageCircle className="mr-2 h-4 w-4" /> Enviar WhatsApp
              </Button>
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
                    <Button size="sm" variant="outline" className="flex-1">
                      <Phone className="mr-2 h-4 w-4" /> Ligar
                    </Button>
                    <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                      <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                    </Button>
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
                <Field label="CPF" value={aluno.cpf} />
                <Field label="RG" value={aluno.rg ?? "—"} />
                <Field label="Turma" value={turma.nome} />
                <Field label="Turno" value={turma.turno} />
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
              <CardDescription>Cópias digitalizadas e contratos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                "Certidão de nascimento",
                "RG do responsável",
                "Comprovante de residência",
                "Contrato de matrícula 2026",
                "Carteira de vacinação",
                "Termo de uso de imagem",
              ].map((doc) => (
                <div
                  key={doc}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {doc}
                  </div>
                  <Button variant="ghost" size="sm">
                    Baixar
                  </Button>
                </div>
              ))}
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
              {mensalidadesAluno.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between border-b py-3 last:border-0"
                >
                  <div>
                    <div className="font-medium text-sm">Junho/2026</div>
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
              ))}
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
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tipo sanguíneo" value="O+" />
                <Field label="Alergias" value="Não declaradas" />
                <Field label="Plano de saúde" value="Bradesco Saúde Top Nacional" />
                <Field label="Pediatra" value="Dra. Cristina Lopes" />
                <Field label="Contato de emergência" value="Avó — (11) 92345-6789" />
                <Field label="Restrições alimentares" value="Não" />
              </div>
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

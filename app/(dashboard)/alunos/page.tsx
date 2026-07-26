"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, Users, Plus, Search, Filter, Download, UserPlus, Cake, Heart } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { SortHeader } from "@/components/ui/sort-header";
import { SkeletonTableRows } from "@/components/ui/skeleton";
import { useSort } from "@/lib/use-sort";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { initials, formatDateBR, formatDateLocalISO } from "@/lib/utils";
import { useEntidade } from "@/lib/data/store";
import { usePerfil } from "@/lib/perfil-context";
import { podeGerenciarAlunos } from "@/lib/access-control";
import { useToast } from "@/lib/toast";
import { NovaMatriculaModal } from "@/components/alunos/nova-matricula-modal";
import { NovaTurmaModal } from "@/components/alunos/nova-turma-modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

const STORAGE_FILTROS_ALUNOS = "alunos:filtros";

export default function AlunosPage() {
  const { perfil } = usePerfil();
  const podeGerenciar = podeGerenciarAlunos(perfil);
  const [busca, setBusca] = React.useState("");
  const [turmaFiltro, setTurmaFiltro] = React.useState("todas");
  const [bilinguismo, setBilinguismo] = React.useState("todos");
  const [comAlergia, setComAlergia] = React.useState(false);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [modalTurmaAberto, setModalTurmaAberto] = React.useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = React.useState<{ id: string; nome: string } | null>(null);
  const toast = useToast();

  const {
    items: alunos,
    carregando: carregandoAlunos,
    erro: erroAlunos,
    add,
    remove,
  } = useEntidade("alunos");
  const {
    items: turmas,
    carregando: carregandoTurmas,
    erro: erroTurmas,
    add: addTurma,
  } = useEntidade("turmas");
  const carregando = carregandoAlunos || carregandoTurmas;

  // Restaura filtros do localStorage no mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_FILTROS_ALUNOS);
    if (!raw) return;
    try {
      const f = JSON.parse(raw);
      if (typeof f.turmaFiltro === "string") setTurmaFiltro(f.turmaFiltro);
      if (typeof f.bilinguismo === "string") setBilinguismo(f.bilinguismo);
      if (typeof f.comAlergia === "boolean") setComAlergia(f.comAlergia);
    } catch {
      // ignore
    }
  }, []);
  // Persiste mudanças
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_FILTROS_ALUNOS,
      JSON.stringify({ turmaFiltro, bilinguismo, comAlergia })
    );
  }, [turmaFiltro, bilinguismo, comAlergia]);

  const handleExcluir = async () => {
    if (!confirmarExcluir) return;
    try {
      await remove(confirmarExcluir.id);
      toast.success("Aluno removido", `${confirmarExcluir.nome} foi excluído(a).`);
      setConfirmarExcluir(null);
    } catch {
      // A store mantém o diálogo aberto e já mostra o motivo retornado pela API.
    }
  };

  const filtrados = alunos.filter((a) => {
    const mB = busca ? a.nome.toLowerCase().includes(busca.toLowerCase()) : true;
    const mT = turmaFiltro === "todas" || a.turmaId === turmaFiltro;
    const mBL = bilinguismo === "todos" || (bilinguismo === "sim" ? a.bilingue : !a.bilingue);
    const mAlergia = !comAlergia || Boolean(a.fichaSaude?.alergias?.trim());
    return mB && mT && mBL && mAlergia;
  });

  const turmasMap = React.useMemo(() => new Map(turmas.map((t) => [t.id, t])), [turmas]);

  type AlunoSortKey = "nome" | "matricula" | "turma" | "nascimento" | "status";
  const { sort, toggle, sorted: ordenados } = useSort<typeof filtrados[number], AlunoSortKey>(
    filtrados,
    (a, k) => {
      if (k === "nome") return a.nome.toLowerCase();
      if (k === "matricula") return a.matricula ?? "";
      if (k === "turma") return turmasMap.get(a.turmaId)?.nome ?? "";
      if (k === "nascimento") return a.dataNascimento;
      if (k === "status") return a.status;
      return "";
    },
    { key: "nome", direction: "asc" }
  );

  const exportarCSV = () => {
    const linhas = podeGerenciar
      ? [
          ["Nome", "Matrícula", "Turma", "Nascimento", "CPF", "Status", "Responsável", "Telefone", "Email"],
          ...ordenados.map((a) => {
            const resp = a.responsaveis.find((r) => r.principal) ?? a.responsaveis[0];
            return [
              a.nome,
              a.matricula,
              turmasMap.get(a.turmaId)?.nome ?? "",
              a.dataNascimento,
              a.cpf ?? "",
              a.status,
              resp?.nome ?? "",
              resp?.telefone ?? "",
              resp?.email ?? "",
            ];
          }),
        ]
      : [
          ["Nome", "Matrícula", "Turma", "Nascimento", "Status"],
          ...ordenados.map((a) => [
            a.nome,
            a.matricula,
            turmasMap.get(a.turmaId)?.nome ?? "",
            a.dataNascimento,
            a.status,
          ]),
        ];
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alunos-${formatDateLocalISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado!", `${ordenados.length} alunos no CSV.`);
  };

  const alunosAtivos = alunos.filter((aluno) => aluno.status === "Ativo");
  const totalAtivos = alunosAtivos.length;
  const totalBilingues = alunosAtivos.filter((aluno) => aluno.bilingue).length;
  const totalCapacidade = turmas.reduce((acc, t) => acc + t.capacidade, 0);
  const percentualBilingues = totalAtivos > 0 ? (totalBilingues / totalAtivos) * 100 : 0;
  const percentualOcupacao = totalCapacidade > 0 ? (totalAtivos / totalCapacidade) * 100 : 0;

  // Aniversariantes do mês atual
  const mesAtual = new Date().getMonth();
  const nomeMesAtual = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date())
    .replace(".", "");
  const aniversariantes = alunos
    .filter((a) => {
      const [, mes] = a.dataNascimento.split("-").map(Number);
      return mes === mesAtual + 1;
    })
    .sort((a, b) => Number(a.dataNascimento.slice(8, 10)) - Number(b.dataNascimento.slice(8, 10)));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Users className="h-3.5 w-3.5" /> ALUNOS
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Alunos & Responsáveis
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastro completo, matrícula, contatos, documentos e histórico.
          </p>
        </div>
        {podeGerenciar && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setModalTurmaAberto(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova turma
            </Button>
            <Button onClick={() => setModalAberto(true)} disabled={turmas.length === 0}>
              <UserPlus className="mr-2 h-4 w-4" /> Nova matrícula
            </Button>
          </div>
        )}
      </div>

      <NovaMatriculaModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        turmas={turmas}
        onSalvar={add}
      />
      <NovaTurmaModal
        aberto={modalTurmaAberto}
        onClose={() => setModalTurmaAberto(false)}
        onSalvar={addTurma}
      />

      {(erroAlunos || erroTurmas) && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Não foi possível carregar todos os dados</div>
            <div className="text-xs">{erroAlunos || erroTurmas}</div>
          </div>
        </div>
      )}

      {podeGerenciar && !carregandoTurmas && !erroTurmas && turmas.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <div>
            <div className="font-semibold">Cadastre a primeira turma</div>
            <div className="text-xs">O aluno só pode ser matriculado em uma turma existente no banco.</div>
          </div>
          <Button size="sm" onClick={() => setModalTurmaAberto(true)}>Criar turma</Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Total ativos</div>
          <div className="mt-1 text-2xl font-bold">{totalAtivos}</div>
          <div className="text-xs text-muted-foreground mt-1">Dados do PostgreSQL</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Bilíngues</div>
          <div className="mt-1 text-2xl font-bold text-primary">{totalBilingues}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {percentualBilingues.toFixed(0)}% dos alunos ativos
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Aniversariantes ({nomeMesAtual})</div>
          <div className="mt-1 text-2xl font-bold text-warning">{aniversariantes.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Este mês</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Capacidade</div>
          <div className="mt-1 text-2xl font-bold">
            {totalAtivos}/{totalCapacidade}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {percentualOcupacao.toFixed(0)}% ocupação
          </div>
        </Card>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="aniversarios">
            <Cake className="mr-1.5 h-4 w-4" /> Aniversariantes
          </TabsTrigger>
          {podeGerenciar && (
            <TabsTrigger value="saude">
              <Heart className="mr-1.5 h-4 w-4" /> Saúde
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="lista">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Todos os alunos</CardTitle>
                  <CardDescription>
                    {filtrados.length} de {alunos.length} alunos
                    {podeGerenciar ? " com dados completos" : " na visão pedagógica"}
                    {" · "}
                    Total da escola: {totalAtivos}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar aluno..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="pl-9 w-56"
                    />
                  </div>
                  <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
                    <SelectTrigger className="w-44">
                      <Filter className="mr-1 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as turmas</SelectItem>
                      {turmas.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={bilinguismo} onValueChange={setBilinguismo}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Bilíngue: todos</SelectItem>
                      <SelectItem value="sim">Bilíngue: sim</SelectItem>
                      <SelectItem value="nao">Bilíngue: não</SelectItem>
                    </SelectContent>
                  </Select>
                  {podeGerenciar && (
                    <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-md border px-3 py-1.5 text-xs hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={comAlergia}
                        onChange={(e) => setComAlergia(e.target.checked)}
                        className="rounded"
                      />
                      Só com alergia
                    </label>
                  )}
                  <Button variant="outline" size="sm" onClick={exportarCSV} disabled={ordenados.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Exportar CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 overflow-x-auto">
              {carregando && filtrados.length === 0 && (
                <SkeletonTableRows rows={6} cols={7} />
              )}
              {!carregando && filtrados.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {busca || turmaFiltro !== "todas" || bilinguismo !== "todos"
                    ? "Nenhum aluno corresponde aos filtros aplicados."
                    : turmas.length === 0
                      ? "Crie uma turma para começar a matricular alunos."
                      : "Nenhum aluno cadastrado ainda. Clica em 'Nova matrícula' pra começar."}
                </div>
              )}
              {filtrados.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader active={sort.key === "nome"} direction={sort.direction} onClick={() => toggle("nome")}>Aluno</SortHeader>
                    <SortHeader active={sort.key === "matricula"} direction={sort.direction} onClick={() => toggle("matricula")}>Matrícula</SortHeader>
                    <SortHeader active={sort.key === "turma"} direction={sort.direction} onClick={() => toggle("turma")}>Turma</SortHeader>
                    <SortHeader active={sort.key === "nascimento"} direction={sort.direction} onClick={() => toggle("nascimento")}>Nascimento</SortHeader>
                    {podeGerenciar && <TableHead>Responsável principal</TableHead>}
                    <SortHeader active={sort.key === "status"} direction={sort.direction} onClick={() => toggle("status")}>Status</SortHeader>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenados.map((a) => {
                    const turma = turmas.find((t) => t.id === a.turmaId);
                    const resp = a.responsaveis.find((r) => r.principal) ?? a.responsaveis[0];
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link
                            href={podeGerenciar ? `/alunos/${a.id}` : `/pedagogico/${a.id}`}
                            className="flex items-center gap-3 hover:underline"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback
                                className="text-xs"
                                style={{
                                  backgroundColor: (turma?.cor ?? "#888") + "30",
                                  color: turma?.cor ?? "#888",
                                }}
                              >
                                {initials(a.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{a.nome}</div>
                              <div className="text-xs text-muted-foreground">
                                {a.bilingue && (
                                  <Badge variant="info" className="text-[10px] py-0">
                                    Bilíngue
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.matricula}
                        </TableCell>
                        <TableCell>{turma?.nome}</TableCell>
                        <TableCell className="text-sm">
                          {formatDateBR(a.dataNascimento)}
                        </TableCell>
                        {podeGerenciar && (
                          <TableCell>
                            <div className="text-sm">{resp?.nome}</div>
                            <div className="text-xs text-muted-foreground">{resp?.telefone}</div>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant={a.status === "Ativo" ? "success" : "secondary"}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end flex-wrap">
                            <Link href={`/boletim/${a.id}`} target="_blank">
                              <Button variant="ghost" size="sm" className="text-xs h-7">
                                Boletim
                              </Button>
                            </Link>
                            {podeGerenciar && (
                              <>
                                <Link href={`/ficha/${a.id}`} target="_blank">
                                  <Button variant="ghost" size="sm" className="text-xs h-7">
                                    Ficha
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-7 text-rose-600 hover:text-rose-700"
                                  onClick={() => setConfirmarExcluir({ id: a.id, nome: a.nome })}
                                >
                                  Excluir
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aniversarios">
          <Card>
            <CardHeader>
              <CardTitle>
                Aniversariantes — {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mesAtual]}
              </CardTitle>
              <CardDescription>
                {aniversariantes.length === 0
                  ? "Nenhum aluno faz aniversário neste mês 🎈"
                  : `${aniversariantes.length} aluno(s) celebram neste mês 🎉`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aniversariantes.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Mês tranquilo de aniversários.
                </div>
              ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {aniversariantes.map((a) => {
                  const [anoNascimento, mesNascimento, dia] = a.dataNascimento.split("-").map(Number);
                  const hoje = new Date();
                  const idade = hoje.getFullYear() - anoNascimento;
                  const ehHoje = dia === hoje.getDate() && mesNascimento === hoje.getMonth() + 1;
                  const ehProximo = dia - hoje.getDate() > 0 && dia - hoje.getDate() <= 7;
                  const resp = a.responsaveis.find((r) => r.principal) ?? a.responsaveis[0];
                  const telefone = resp?.telefone.replace(/\D/g, "") ?? "";
                  const numeroWhatsApp = telefone.startsWith("55") ? telefone : `55${telefone}`;
                  return (
                    <Card key={a.id} className={`p-4 ${ehHoje ? "ring-2 ring-amber-400 bg-amber-50" : ehProximo ? "border-amber-200" : ""}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold shrink-0">
                          <Cake className="h-5 w-5" />
                          <span className="text-xs mt-0.5">{dia}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{a.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {ehHoje ? "🎂 É hoje!" : `Faz ${idade} anos no dia ${dia}`}
                          </div>
                          {resp?.telefone && (
                            <a
                              href={`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(`Olá ${resp.nome}, parabéns pelos ${idade} anos de ${a.nome.split(" ")[0]}! 🎉 A Escola Modelo deseja muitas felicidades!`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-emerald-700 hover:underline"
                            >
                              💬 Felicitar via WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {podeGerenciar && <TabsContent value="saude">
          <Card>
            <CardHeader>
              <CardTitle>Fichas de saúde com alergias / restrições</CardTitle>
              <CardDescription>
                Alergias e tratamentos médicos registrados na ficha de matrícula
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const comAlerta = alunos.filter(
                    (a) => a.fichaSaude?.alergias || a.fichaSaude?.tratamentoMedicoSim
                  );
                  if (comAlerta.length === 0) {
                    return (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        Nenhum aluno com alergia/tratamento médico registrado.
                        <br />
                        Preencha a etapa Saúde ao matricular pra aparecer aqui.
                      </div>
                    );
                  }
                  return comAlerta.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 rounded-lg border-l-4 border-l-danger bg-danger/5 p-4"
                    >
                      <Heart className="h-5 w-5 text-danger mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{a.nome}</div>
                        {a.fichaSaude?.alergias && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Alergias:</strong> {a.fichaSaude.alergias}
                          </div>
                        )}
                        {a.fichaSaude?.tratamentoMedicoSim && a.fichaSaude.tratamentoMotivo && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Tratamento:</strong> {a.fichaSaude.tratamentoMotivo}
                          </div>
                        )}
                        {a.fichaSaude?.medicoNome && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Médico: {a.fichaSaude.medicoNome} {a.fichaSaude.medicoTelefone && `· ${a.fichaSaude.medicoTelefone}`}
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>}
      </Tabs>

      <ConfirmDialog
        aberto={!!confirmarExcluir}
        titulo="Excluir aluno?"
        descricao={
          confirmarExcluir
            ? `Tem certeza que quer excluir ${confirmarExcluir.nome}? Os dados de mensalidades e frequência permanecem, mas o aluno some das listas.`
            : ""
        }
        variante="danger"
        textoBotaoConfirmar="Sim, excluir"
        onConfirmar={handleExcluir}
        onFechar={() => setConfirmarExcluir(null)}
      />
    </div>
  );
}

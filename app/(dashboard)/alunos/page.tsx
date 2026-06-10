"use client";

import * as React from "react";
import Link from "next/link";
import { Users, Plus, Search, Filter, Download, UserPlus, Cake, Heart } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { turmas } from "@/lib/mock-data/turmas";
import { initials, formatDateBR } from "@/lib/utils";
import { useEntidade } from "@/lib/data/store";
import { NovaMatriculaModal } from "@/components/alunos/nova-matricula-modal";

export default function AlunosPage() {
  const [busca, setBusca] = React.useState("");
  const [turmaFiltro, setTurmaFiltro] = React.useState("todas");
  const [bilinguismo, setBilinguismo] = React.useState("todos");
  const [modalAberto, setModalAberto] = React.useState(false);

  const { items: alunos } = useEntidade("alunos");

  const filtrados = alunos.filter((a) => {
    const mB = busca ? a.nome.toLowerCase().includes(busca.toLowerCase()) : true;
    const mT = turmaFiltro === "todas" || a.turmaId === turmaFiltro;
    const mBL = bilinguismo === "todos" || (bilinguismo === "sim" ? a.bilingue : !a.bilingue);
    return mB && mT && mBL;
  });

  // Total real de alunos da escola = soma de totalAlunos das turmas
  const totalAtivos = turmas.reduce((acc, t) => acc + t.totalAlunos, 0);
  const totalBilingues = Math.round(totalAtivos * 0.6); // ~60% bilíngue
  const totalCapacidade = turmas.reduce((acc, t) => acc + t.capacidade, 0);

  // Aniversariantes do mês (junho)
  const aniversariantes = alunos.filter(
    (a) => new Date(a.dataNascimento).getMonth() === 5
  );

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
        <Button onClick={() => setModalAberto(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Nova matrícula
        </Button>
      </div>

      <NovaMatriculaModal aberto={modalAberto} onClose={() => setModalAberto(false)} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Total ativos</div>
          <div className="mt-1 text-2xl font-bold">{totalAtivos}</div>
          <div className="text-xs text-muted-foreground mt-1">+7 no mês</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Bilíngues</div>
          <div className="mt-1 text-2xl font-bold text-primary">{totalBilingues}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {((totalBilingues / totalAtivos) * 100).toFixed(0)}% dos alunos
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Aniversariantes (jun)</div>
          <div className="mt-1 text-2xl font-bold text-warning">{aniversariantes.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Este mês</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Capacidade</div>
          <div className="mt-1 text-2xl font-bold">
            {totalAtivos}/{totalCapacidade}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {((totalAtivos / totalCapacidade) * 100).toFixed(0)}% ocupação
          </div>
        </Card>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="aniversarios">
            <Cake className="mr-1.5 h-4 w-4" /> Aniversariantes
          </TabsTrigger>
          <TabsTrigger value="saude">
            <Heart className="mr-1.5 h-4 w-4" /> Saúde
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Todos os alunos</CardTitle>
                  <CardDescription>
                    {filtrados.length} de {alunos.length} alunos com dados completos
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
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Nascimento</TableHead>
                    <TableHead>Responsável principal</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((a) => {
                    const turma = turmas.find((t) => t.id === a.turmaId);
                    const resp = a.responsaveis.find((r) => r.principal) ?? a.responsaveis[0];
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link
                            href={`/alunos/${a.id}`}
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
                        <TableCell>
                          <div className="text-sm">{resp?.nome}</div>
                          <div className="text-xs text-muted-foreground">{resp?.telefone}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.status === "Ativo" ? "success" : "secondary"}>
                            {a.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aniversarios">
          <Card>
            <CardHeader>
              <CardTitle>Aniversariantes — Junho</CardTitle>
              <CardDescription>
                {aniversariantes.length} alunos fazem aniversário neste mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {aniversariantes.map((a) => {
                  const dia = new Date(a.dataNascimento).getDate();
                  const idade =
                    2026 - new Date(a.dataNascimento).getFullYear();
                  return (
                    <Card key={a.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-warning/10 text-warning font-bold">
                          <Cake className="h-5 w-5" />
                          <span className="text-xs mt-0.5">{dia}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{a.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            Fará {idade} anos
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saude">
          <Card>
            <CardHeader>
              <CardTitle>Ficha de saúde</CardTitle>
              <CardDescription>
                Alergias, restrições alimentares e contatos de emergência
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { aluno: "Sofia Almeida Souza", alergia: "Glúten e lactose", contato: "Dra. Cristina Lopes — (11) 95555-1234" },
                  { aluno: "Heitor Pereira Lima", alergia: "Frutos do mar", contato: "Pediatra Dr. Marco — (11) 94444-5678" },
                  { aluno: "Manuela Costa Ribeiro", alergia: "Amendoim (anafilática)", contato: "Hospital Sírio-Libanês" },
                  { aluno: "Davi Henrique Oliveira", alergia: "Asma — usar bombinha se necessário", contato: "Mãe (11) 95432-1098" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border-l-4 border-l-danger bg-danger/5 p-4"
                  >
                    <Heart className="h-5 w-5 text-danger mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{s.aluno}</div>
                      <div className="text-sm text-muted-foreground">{s.alergia}</div>
                      <div className="text-xs text-muted-foreground mt-1">{s.contato}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

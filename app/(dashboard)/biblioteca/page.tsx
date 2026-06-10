"use client";

import * as React from "react";
import { BookOpen, Plus, Search, AlertCircle, BookMarked, ArrowRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { livros, emprestimosAtivos } from "@/lib/mock-data/biblioteca";
import { formatDateBR, diffDays } from "@/lib/utils";

export default function BibliotecaPage() {
  const [busca, setBusca] = React.useState("");
  const filtrados = livros.filter((l) =>
    busca
      ? l.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        l.autor.toLowerCase().includes(busca.toLowerCase())
      : true
  );

  const totalExemplares = livros.reduce((a, l) => a + l.exemplares, 0);
  const emprestados = livros.reduce((a, l) => a + l.emprestados, 0);
  const atrasados = emprestimosAtivos.filter((e) => e.status === "Atrasado").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <BookOpen className="h-3.5 w-3.5" /> BIBLIOTECA
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Biblioteca escolar
          </h1>
          <p className="text-sm text-muted-foreground">
            Acervo, empréstimos e devoluções.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Cadastrar livro
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Títulos</div>
          <div className="mt-1 text-2xl font-bold">{livros.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Exemplares</div>
          <div className="mt-1 text-2xl font-bold">{totalExemplares}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Emprestados</div>
          <div className="mt-1 text-2xl font-bold text-primary">{emprestados}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Atrasados</div>
          <div className="mt-1 text-2xl font-bold text-danger">{atrasados}</div>
        </Card>
      </div>

      <Tabs defaultValue="acervo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="acervo">
            <BookMarked className="mr-1.5 h-4 w-4" /> Acervo
          </TabsTrigger>
          <TabsTrigger value="emprestimos">Empréstimos</TabsTrigger>
          <TabsTrigger value="atrasados">
            <AlertCircle className="mr-1.5 h-4 w-4 text-danger" /> Atrasados ({atrasados})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="acervo">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Acervo completo</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar título ou autor..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filtrados.map((l) => (
                  <Card key={l.id} className="p-4 hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="h-16 w-12 rounded bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shrink-0">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="text-[10px]">
                          {l.categoria}
                        </Badge>
                        <div className="font-semibold text-sm mt-1 line-clamp-2">{l.titulo}</div>
                        <div className="text-xs text-muted-foreground">{l.autor}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {l.faixaEtaria} · ISBN {l.isbn.slice(-6)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                      <span>
                        <strong>{l.disponiveis}</strong>/{l.exemplares} disponíveis
                      </span>
                      <Button variant="ghost" size="sm" className="h-7">
                        Emprestar <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emprestimos">
          <Card>
            <CardHeader>
              <CardTitle>Empréstimos ativos</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Livro</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Empréstimo</TableHead>
                    <TableHead>Devolução</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emprestimosAtivos.map((e) => {
                    const livro = livros.find((l) => l.id === e.livroId);
                    const dias = diffDays(e.dataEmprestimo);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{livro?.titulo}</TableCell>
                        <TableCell>{e.alunoNome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.turma}</TableCell>
                        <TableCell className="text-sm">{formatDateBR(e.dataEmprestimo)} ({dias}d)</TableCell>
                        <TableCell className="text-sm">{formatDateBR(e.dataDevolucaoPrevista)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              e.status === "Atrasado"
                                ? "danger"
                                : e.status === "Em andamento"
                                ? "info"
                                : "success"
                            }
                          >
                            {e.status}
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

        <TabsContent value="atrasados">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-danger" />
                Devoluções atrasadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {emprestimosAtivos
                .filter((e) => e.status === "Atrasado")
                .map((e) => {
                  const livro = livros.find((l) => l.id === e.livroId);
                  const dias = diffDays(e.dataDevolucaoPrevista);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-4 rounded-lg border-l-4 border-l-danger bg-danger/5 p-4"
                    >
                      <BookOpen className="h-8 w-8 text-danger shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold">{livro?.titulo}</div>
                        <div className="text-sm text-muted-foreground">
                          {e.alunoNome} ({e.turma}) — devolução prevista {formatDateBR(e.dataDevolucaoPrevista)}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="danger">{dias} dias atrasado</Badge>
                        <Button size="sm" className="mt-2 bg-emerald-600 hover:bg-emerald-700">
                          Notificar família
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

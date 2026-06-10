"use client";

import * as React from "react";
import { Briefcase, Plus, Search, UserCheck, Calendar, DollarSign } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  funcionarios,
  totalFolhaBruta,
  totalEncargos,
  totalFolhaLiquida,
} from "@/lib/mock-data/rh";
import { formatBRL, formatDateBR, initials } from "@/lib/utils";

export default function RhPage() {
  const [busca, setBusca] = React.useState("");
  const filtrados = funcionarios.filter((f) =>
    busca ? f.nome.toLowerCase().includes(busca.toLowerCase()) : true
  );

  const ativos = funcionarios.filter((f) => f.status === "Ativo").length;
  const ferias = funcionarios.filter((f) => f.status === "Férias").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Briefcase className="h-3.5 w-3.5" /> RH & EQUIPE
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Recursos Humanos
          </h1>
          <p className="text-sm text-muted-foreground">
            Equipe, folha de pagamento, férias e avaliação de desempenho.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo colaborador
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Equipe ativa</div>
          <div className="mt-1 text-2xl font-bold">{ativos}</div>
          <div className="text-xs text-muted-foreground mt-1">{funcionarios.length} colaboradores</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Folha bruta</div>
          <div className="mt-1 text-2xl font-bold">{formatBRL(totalFolhaBruta)}</div>
          <div className="text-xs text-muted-foreground mt-1">Mensal</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Encargos</div>
          <div className="mt-1 text-2xl font-bold text-warning">{formatBRL(totalEncargos)}</div>
          <div className="text-xs text-muted-foreground mt-1">INSS + FGTS + 13º</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Em férias</div>
          <div className="mt-1 text-2xl font-bold text-primary">{ferias}</div>
          <div className="text-xs text-muted-foreground mt-1">Este mês</div>
        </Card>
      </div>

      <Tabs defaultValue="equipe" className="space-y-4">
        <TabsList>
          <TabsTrigger value="equipe">
            <UserCheck className="mr-1.5 h-4 w-4" /> Equipe
          </TabsTrigger>
          <TabsTrigger value="folha">
            <DollarSign className="mr-1.5 h-4 w-4" /> Folha de Pagamento
          </TabsTrigger>
          <TabsTrigger value="ferias">
            <Calendar className="mr-1.5 h-4 w-4" /> Férias
          </TabsTrigger>
          <TabsTrigger value="avaliacao">Avaliação de Desempenho</TabsTrigger>
        </TabsList>

        <TabsContent value="equipe">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quadro de pessoal</CardTitle>
                  <CardDescription>{filtrados.length} colaboradores</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead>Salário</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/15 text-primary text-xs">
                              {initials(f.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{f.nome}</div>
                            <div className="text-xs text-muted-foreground">{f.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{f.cargo}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDateBR(f.admissao)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{f.vinculo}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{formatBRL(f.salarioBruto)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            f.status === "Ativo"
                              ? "success"
                              : f.status === "Férias"
                              ? "info"
                              : f.status === "Afastado"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {f.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="folha">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5">
                <div className="text-xs uppercase text-muted-foreground">Folha bruta</div>
                <div className="mt-1 text-2xl font-bold">{formatBRL(totalFolhaBruta)}</div>
              </Card>
              <Card className="p-5">
                <div className="text-xs uppercase text-muted-foreground">Total descontos</div>
                <div className="mt-1 text-2xl font-bold text-danger">
                  {formatBRL(totalFolhaBruta - totalFolhaLiquida)}
                </div>
              </Card>
              <Card className="p-5">
                <div className="text-xs uppercase text-muted-foreground">Folha líquida</div>
                <div className="mt-1 text-2xl font-bold text-success">{formatBRL(totalFolhaLiquida)}</div>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Holerites — Junho/2026</CardTitle>
                <CardDescription>Pagamento previsto para 05/07/2026</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Bruto</TableHead>
                      <TableHead>INSS</TableHead>
                      <TableHead>IRRF</TableHead>
                      <TableHead>Outros</TableHead>
                      <TableHead>Líquido</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funcionarios.slice(0, 10).map((f) => {
                      const inss = f.salarioBruto * 0.11;
                      const irrf = f.salarioBruto > 4000 ? f.salarioBruto * 0.075 : 0;
                      const outros = f.salarioBruto * 0.03;
                      const liquido = f.salarioBruto - inss - irrf - outros;
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.nome}</TableCell>
                          <TableCell>{formatBRL(f.salarioBruto)}</TableCell>
                          <TableCell className="text-danger">{formatBRL(inss)}</TableCell>
                          <TableCell className="text-danger">{formatBRL(irrf)}</TableCell>
                          <TableCell className="text-danger">{formatBRL(outros)}</TableCell>
                          <TableCell className="font-semibold">{formatBRL(liquido)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost">Holerite PDF</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ferias">
          <Card>
            <CardHeader>
              <CardTitle>Mapa de férias</CardTitle>
              <CardDescription>Planejamento de férias 2026</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {funcionarios.slice(0, 8).map((f) => (
                  <div key={f.id} className="flex items-center gap-4 rounded-lg border p-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/15 text-primary text-xs">
                        {initials(f.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{f.nome}</div>
                      <div className="text-xs text-muted-foreground">{f.cargo}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-xs text-muted-foreground">Período aquisitivo</div>
                      <div className="font-medium">Jul/2025 - Jun/2026</div>
                    </div>
                    <Badge variant={f.status === "Férias" ? "info" : "secondary"}>
                      {f.status === "Férias" ? "Em férias" : "Disponível"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avaliacao">
          <Card>
            <CardHeader>
              <CardTitle>Avaliação de desempenho</CardTitle>
              <CardDescription>2º semestre 2026</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funcionarios
                  .filter((f) => f.cargo === "Professor")
                  .slice(0, 6)
                  .map((f, i) => {
                    const notas = [4.5, 4.8, 4.2, 4.9, 3.8, 4.6];
                    const nota = notas[i % notas.length];
                    return (
                      <div key={f.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold">{f.nome}</div>
                          <div className="text-lg font-bold text-primary">{nota.toFixed(1)}/5.0</div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          {[
                            { l: "Pedagógico", v: nota },
                            { l: "Relacional", v: nota - 0.2 },
                            { l: "Pontualidade", v: nota + 0.1 },
                            { l: "Engajamento", v: nota - 0.1 },
                          ].map((c) => (
                            <div key={c.l}>
                              <div className="text-muted-foreground">{c.l}</div>
                              <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${(c.v / 5) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

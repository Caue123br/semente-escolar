"use client";

import * as React from "react";
import { Building2, Wrench, Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useEntidade } from "@/lib/data/store";
import { NovoPatrimonioModal } from "@/components/shared/novo-patrimonio-modal";
import { formatBRL, formatDateBR } from "@/lib/utils";

export default function PatrimonioPage() {
  const { items: patrimonio } = useEntidade("patrimonio");
  const [modalAberto, setModalAberto] = React.useState(false);
  const totalPatrimonio = patrimonio.reduce((a, p) => a + p.valor, 0);
  const operacionais = patrimonio.filter((p) => p.estado === "Ótimo" || p.estado === "Bom").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Building2 className="h-3.5 w-3.5" /> PATRIMÔNIO
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Patrimônio & Manutenção
          </h1>
          <p className="text-sm text-muted-foreground">
            Bens da escola e ordens de serviço.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <Plus className="mr-2 h-4 w-4" /> Cadastrar bem
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Total de bens</div>
          <div className="mt-1 text-2xl font-bold">{patrimonio.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Valor total</div>
          <div className="mt-1 text-2xl font-bold">{formatBRL(totalPatrimonio)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Operacionais</div>
          <div className="mt-1 text-2xl font-bold text-success">{operacionais}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Ordens de serviço</div>
          <div className="mt-1 text-sm font-semibold text-muted-foreground">Não configuradas</div>
        </Card>
      </div>

      <Tabs defaultValue="bens" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bens">Bens cadastrados</TabsTrigger>
          <TabsTrigger value="manutencao">
            <Wrench className="mr-1.5 h-4 w-4" /> Manutenção
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bens">
          <Card>
            <CardContent className="px-0 pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Compra</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patrimonio.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.item}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.local}</TableCell>
                      <TableCell className="font-semibold">{formatBRL(p.valor)}</TableCell>
                      <TableCell className="text-sm">{formatDateBR(p.dataCompra)}</TableCell>
                      <TableCell className="text-sm">{p.responsavel}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.estado === "Ótimo" || p.estado === "Bom"
                              ? "success"
                              : p.estado === "Regular"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {p.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manutencao">
          <Card>
            <CardHeader>
              <CardTitle>Ordens de Serviço</CardTitle>
              <CardDescription>O cadastro persistente de manutenções ainda não faz parte deste módulo.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Use o estado dos bens para registrar a condição atual. Nenhuma ordem fictícia é exibida como dado da escola.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NovoPatrimonioModal aberto={modalAberto} onFechar={() => setModalAberto(false)} />
    </div>
  );
}

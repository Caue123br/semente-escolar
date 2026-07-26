"use client";

import * as React from "react";
import {
  FileText,
  Plus,
  Download,
  Save,
  CheckCircle,
  XCircle,
  Clock,
  Search,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import type { NotaFiscal } from "@/lib/types";
import { formatBRL, formatDateBR, formatDateLocalISO } from "@/lib/utils";

export default function NotaFiscalPage() {
  const { items: notasFiscais, add } = useEntidade("notasFiscais");
  const toast = useToast();
  const emitidas = notasFiscais.filter((n) => n.status === "Emitida");
  const totalEmitido = emitidas.reduce((a, n) => a + n.valor, 0);
  const anoAtual = new Date().getFullYear();
  const proxNumero = `REG-${anoAtual}/${String(
    notasFiscais.filter((n) => n.numero?.startsWith(`REG-${anoAtual}/`)).length + 1
  ).padStart(4, "0")}`;

  const [tomador, setTomador] = React.useState("");
  const [cpfCnpj, setCpfCnpj] = React.useState("");
  const [servico, setServico] = React.useState("Ensino regular (mensalidade)");
  const [descricao, setDescricao] = React.useState("");
  const [valor, setValor] = React.useState(0);
  const [busca, setBusca] = React.useState("");

  const registrosFiltrados = notasFiscais.filter((nota) => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return [nota.numero, nota.cliente, nota.cpfCnpj, nota.servico]
      .some((campo) => campo?.toLowerCase().includes(termo));
  });

  const exportarCSV = () => {
    if (registrosFiltrados.length === 0) return;
    const linhas = [
      ["Protocolo", "Data", "Cliente", "CPF/CNPJ", "Descrição", "Valor", "Status"],
      ...registrosFiltrados.map((nota) => [
        nota.numero,
        nota.data,
        nota.cliente,
        nota.cpfCnpj,
        nota.servico,
        nota.valor,
        nota.status,
      ]),
    ];
    const csv = linhas
      .map((linha) => linha.map((campo) => `"${String(campo ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `registros-fiscais-${formatDateLocalISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const registrar = async () => {
    if (!tomador || !cpfCnpj || !valor) {
      toast.error("Dados incompletos", "Preencha tomador, CPF/CNPJ e valor");
      return;
    }
    const nova: NotaFiscal = {
      id: `nf-${Date.now()}`,
      numero: proxNumero,
      data: formatDateLocalISO(),
      cliente: tomador,
      cpfCnpj,
      valor,
      servico: descricao || servico,
      status: "Pendente",
    };
    await add(nova);
    toast.success("Registro fiscal salvo", "O servidor gerou um protocolo interno e deixou o registro pendente.");
    setTomador("");
    setCpfCnpj("");
    setDescricao("");
    setValor(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <FileText className="h-3.5 w-3.5" /> NOTA FISCAL
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Controle fiscal
          </h1>
          <p className="text-sm text-muted-foreground">
            Registros internos para conferência antes da emissão no sistema da prefeitura.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="px-3 py-1">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Integração municipal não configurada
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Marcadas como emitidas</div>
          <div className="mt-1 text-2xl font-bold">{emitidas.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Valor marcado como emitido</div>
          <div className="mt-1 text-2xl font-bold">{formatBRL(totalEmitido)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Pendentes</div>
          <div className="mt-1 text-2xl font-bold text-warning">
            {notasFiscais.filter((n) => n.status === "Pendente").length}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Próximo protocolo</div>
          <div className="mt-1 text-lg font-bold text-primary">{proxNumero}</div>
        </Card>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Registros fiscais</TabsTrigger>
          <TabsTrigger value="emitir">
            <Plus className="mr-1.5 h-4 w-4" /> Novo registro
          </TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Histórico fiscal interno</CardTitle>
                  <CardDescription>
                    {notasFiscais.length} registro(s). O status não substitui a consulta à prefeitura.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar registro..."
                      className="pl-9 w-56"
                      value={busca}
                      onChange={(event) => setBusca(event.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={exportarCSV} disabled={registrosFiltrados.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Exportar CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocolo / número informado</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                  {registrosFiltrados.map((n) => {
                    const StatusIcon =
                      n.status === "Emitida"
                        ? CheckCircle
                        : n.status === "Cancelada" || n.status === "Rejeitada"
                        ? XCircle
                        : Clock;
                    return (
                      <TableRow key={n.id}>
                        <TableCell className="font-mono text-xs">{n.numero}</TableCell>
                        <TableCell className="text-sm">{formatDateBR(n.data)}</TableCell>
                        <TableCell className="font-medium">{n.cliente}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {n.cpfCnpj}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {n.servico}
                        </TableCell>
                        <TableCell className="font-semibold">{formatBRL(n.valor)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              n.status === "Emitida"
                                ? "success"
                                : n.status === "Pendente"
                                ? "warning"
                                : "danger"
                            }
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {n.status}
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

        <TabsContent value="emitir">
          <Card>
            <CardHeader>
              <CardTitle>Novo registro fiscal pendente</CardTitle>
              <CardDescription>
                Salva os dados no sistema. A emissão e o envio devem ser concluídos externamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Tomador (cliente)</Label>
                  <Input className="mt-1.5" placeholder="Nome do responsável" value={tomador} onChange={(e) => setTomador(e.target.value)} />
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input className="mt-1.5" placeholder="000.000.000-00" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} />
                </div>
                <div>
                  <Label>Tipo de serviço</Label>
                  <Select value={servico} onValueChange={setServico}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ensino regular (mensalidade)">Ensino regular (mensalidade)</SelectItem>
                      <SelectItem value="Venda de uniforme">Venda de uniforme</SelectItem>
                      <SelectItem value="Material de festa">Material de festa</SelectItem>
                      <SelectItem value="Alimentação extra">Alimentação extra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição do serviço</Label>
                <textarea
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Ex: Mensalidade escolar — Junho/2026 — Aluno: ..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-1">
                <div>
                  <Label>Valor</Label>
                  <Input className="mt-1.5" type="number" placeholder="0,00" value={valor || ""} onChange={(e) => setValor(Number(e.target.value))} />
                </div>
              </div>
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <div className="font-semibold mb-1">Protocolo interno</div>
                <div className="text-xl font-mono font-bold">{proxNumero}</div>
                <p className="mt-1 text-xs">Não é um número de NFS-e e não comprova emissão fiscal.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={registrar}>
                  <Save className="mr-2 h-4 w-4" /> Salvar como pendente
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Integração fiscal</CardTitle>
              <CardDescription>Nenhum conector municipal foi configurado neste ambiente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ConfigRow label="Prefeitura / provedor" value="Não configurado" />
              <ConfigRow label="Inscrição municipal" value="Não configurada" />
              <ConfigRow label="Certificado digital" value="Não configurado" />
              <ConfigRow label="Envio automático" value="Desativado" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  );
}

"use client";

import * as React from "react";
import { Briefcase, Plus, Search, UserCheck, Calendar, DollarSign, X, Check, Loader2 } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { formatBRL, formatDateBR, formatDateLocalISO, initials } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SortHeader } from "@/components/ui/sort-header";
import { useSort } from "@/lib/use-sort";
import type { Funcionario, CargoFuncionario } from "@/lib/mock-data/rh";

export default function RhPage() {
  const { items: funcionarios, update } = useEntidade("funcionarios");
  const [busca, setBusca] = React.useState("");
  const [modalAberto, setModalAberto] = React.useState(false);
  const [editando, setEditando] = React.useState<Funcionario | null>(null);
  const [desligar, setDesligar] = React.useState<Funcionario | null>(null);
  const toast = useToast();

  const filtrados = funcionarios.filter((f) =>
    busca ? f.nome.toLowerCase().includes(busca.toLowerCase()) : true
  );

  type FuncSortKey = "nome" | "cargo" | "admissao" | "vinculo" | "salario" | "status";
  const { sort, toggle, sorted } = useSort<Funcionario, FuncSortKey>(
    filtrados,
    (f, k) => {
      if (k === "nome") return f.nome.toLowerCase();
      if (k === "cargo") return f.cargo;
      if (k === "admissao") return f.admissao;
      if (k === "vinculo") return f.vinculo;
      if (k === "salario") return f.salarioBruto;
      if (k === "status") return f.status;
      return "";
    },
    { key: "nome", direction: "asc" }
  );

  const totalFolhaBruta = funcionarios.filter((f) => f.status === "Ativo").reduce((a, f) => a + f.salarioBruto, 0);
  const totalEncargos = totalFolhaBruta * 0.28;
  const totalFolhaLiquida = totalFolhaBruta - totalFolhaBruta * 0.18;
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
        <Button onClick={() => setModalAberto(true)}>
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
          <div className="text-xs uppercase text-muted-foreground">Encargos estimados</div>
          <div className="mt-1 text-2xl font-bold text-warning">{formatBRL(totalEncargos)}</div>
          <div className="text-xs text-muted-foreground mt-1">INSS + FGTS + 13º (≈28%)</div>
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
          <TabsTrigger value="avaliacao">Avaliação</TabsTrigger>
        </TabsList>

        <TabsContent value="equipe">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
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
            <CardContent className="px-0 overflow-x-auto">
              {filtrados.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  {busca ? `Nenhum colaborador "${busca}" encontrado.` : "Sem funcionários cadastrados. Clica em 'Novo colaborador' pra começar."}
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader active={sort.key === "nome"} direction={sort.direction} onClick={() => toggle("nome")}>Nome</SortHeader>
                    <SortHeader active={sort.key === "cargo"} direction={sort.direction} onClick={() => toggle("cargo")}>Cargo</SortHeader>
                    <SortHeader active={sort.key === "admissao"} direction={sort.direction} onClick={() => toggle("admissao")}>Admissão</SortHeader>
                    <SortHeader active={sort.key === "vinculo"} direction={sort.direction} onClick={() => toggle("vinculo")}>Vínculo</SortHeader>
                    <SortHeader active={sort.key === "salario"} direction={sort.direction} onClick={() => toggle("salario")}>Salário</SortHeader>
                    <SortHeader active={sort.key === "status"} direction={sort.direction} onClick={() => toggle("status")}>Status</SortHeader>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((f) => (
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
                      <TableCell className="text-sm">{f.admissao ? formatDateBR(f.admissao) : "—"}</TableCell>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditando(f)}>
                            Editar
                          </Button>
                          {f.status === "Ativo" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-rose-600 hover:text-rose-700"
                              onClick={() => setDesligar(f)}
                            >
                              Desligar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
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
                <div className="text-xs uppercase text-muted-foreground">Total descontos estimados</div>
                <div className="mt-1 text-2xl font-bold text-danger">
                  {formatBRL(totalFolhaBruta - totalFolhaLiquida)}
                </div>
              </Card>
              <Card className="p-5">
                <div className="text-xs uppercase text-muted-foreground">Folha líquida estimada</div>
                <div className="mt-1 text-2xl font-bold text-success">{formatBRL(totalFolhaLiquida)}</div>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Holerites (cálculo estimado)</CardTitle>
                <CardDescription>
                  Tabela com INSS/IRRF aproximados — verifique com contabilidade antes do pagamento.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Bruto</TableHead>
                      <TableHead>INSS (11%)</TableHead>
                      <TableHead>IRRF</TableHead>
                      <TableHead>Outros</TableHead>
                      <TableHead>Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funcionarios.filter((f) => f.status === "Ativo").map((f) => {
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
              <CardDescription>Visão geral da equipe ativa e em férias</CardDescription>
            </CardHeader>
            <CardContent>
              {funcionarios.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Cadastre funcionários pra acompanhar as férias.
                </div>
              ) : (
                <div className="space-y-2">
                  {funcionarios.map((f) => (
                    <div key={f.id} className="flex items-center gap-4 rounded-lg border p-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs">
                          {initials(f.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{f.nome}</div>
                        <div className="text-xs text-muted-foreground">{f.cargo}</div>
                      </div>
                      <Badge variant={f.status === "Férias" ? "info" : f.status === "Ativo" ? "success" : "secondary"}>
                        {f.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avaliacao">
          <Card>
            <CardHeader>
              <CardTitle>Avaliação de desempenho</CardTitle>
              <CardDescription>
                Em breve — fluxo de avaliação por professor / período.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground py-8 text-center">
                Esse módulo será liberado em breve com:<br />
                • Avaliação por professor<br />
                • Critérios pedagógicos, relacional, engajamento<br />
                • Feedback periódico
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NovoFuncionarioModal aberto={modalAberto} onFechar={() => setModalAberto(false)} />

      <EditarFuncionarioModal
        funcionario={editando}
        onFechar={() => setEditando(null)}
        onSalvar={async (f) => {
          await update(f.id, f);
          toast.success("Atualizado!", `Dados de ${f.nome} salvos.`);
          setEditando(null);
        }}
      />

      <ConfirmDialog
        aberto={!!desligar}
        titulo="Desligar funcionário?"
        descricao={
          desligar
            ? `Marcar ${desligar.nome} como Desligado. O funcionário some das listas mas o histórico fica preservado.`
            : ""
        }
        variante="danger"
        textoBotaoConfirmar="Sim, desligar"
        onConfirmar={async () => {
          if (!desligar) return;
          await update(desligar.id, { status: "Desligado" });
          toast.success("Funcionário desligado", `${desligar.nome} marcado como Desligado.`);
          setDesligar(null);
        }}
        onFechar={() => setDesligar(null)}
      />
    </div>
  );
}

function EditarFuncionarioModal({
  funcionario,
  onFechar,
  onSalvar,
}: {
  funcionario: Funcionario | null;
  onFechar: () => void;
  onSalvar: (f: Funcionario) => Promise<void>;
}) {
  const [nome, setNome] = React.useState("");
  const [cargo, setCargo] = React.useState<CargoFuncionario>("Professor");
  const [cpf, setCpf] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [salarioBruto, setSalarioBruto] = React.useState(0);
  const [vinculo, setVinculo] = React.useState<Funcionario["vinculo"]>("CLT");
  const [status, setStatus] = React.useState<Funcionario["status"]>("Ativo");
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(() => {
    if (funcionario) {
      setNome(funcionario.nome);
      setCargo(funcionario.cargo);
      setCpf(funcionario.cpf ?? "");
      setEmail(funcionario.email ?? "");
      setTelefone(funcionario.telefone ?? "");
      setSalarioBruto(funcionario.salarioBruto);
      setVinculo(funcionario.vinculo);
      setStatus(funcionario.status);
    }
  }, [funcionario]);

  if (!funcionario) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await onSalvar({
        ...funcionario,
        nome,
        cargo,
        cpf,
        email,
        telefone,
        salarioBruto,
        vinculo,
        status,
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-xl bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="font-bold text-lg">Editar funcionário</h2>
          <p className="text-xs text-muted-foreground">{funcionario.nome}</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <Label>Nome completo *</Label>
            <Input className="mt-1.5" required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cargo *</Label>
              <select
                value={cargo}
                onChange={(e) => setCargo(e.target.value as CargoFuncionario)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Direção</option>
                <option>Coordenação</option>
                <option>Professor</option>
                <option>Auxiliar Pedagógico</option>
                <option>Secretaria</option>
                <option>Financeiro</option>
                <option>Cozinha</option>
                <option>Limpeza</option>
                <option>Segurança</option>
                <option>Manutenção</option>
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Funcionario["status"])}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Ativo</option>
                <option>Férias</option>
                <option>Afastado</option>
                <option>Desligado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CPF</Label>
              <Input className="mt-1.5" value={cpf} onChange={(e) => setCpf(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input className="mt-1.5" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div>
              <Label>Vínculo</Label>
              <select
                value={vinculo}
                onChange={(e) => setVinculo(e.target.value as Funcionario["vinculo"])}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>CLT</option>
                <option>PJ</option>
                <option>Estagiário</option>
                <option>Terceirizado</option>
              </select>
            </div>
            <div>
              <Label>Salário bruto</Label>
              <Input
                className="mt-1.5"
                type="number"
                min={0}
                step="0.01"
                value={salarioBruto}
                onChange={(e) => setSalarioBruto(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700">
              {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NovoFuncionarioModal({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { add } = useEntidade("funcionarios");
  const toast = useToast();
  const [nome, setNome] = React.useState("");
  const [cargo, setCargo] = React.useState<CargoFuncionario>("Professor");
  const [cpf, setCpf] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [admissao, setAdmissao] = React.useState(() => formatDateLocalISO());
  const [salarioBruto, setSalarioBruto] = React.useState(0);
  const [vinculo, setVinculo] = React.useState<Funcionario["vinculo"]>("CLT");
  const [salvando, setSalvando] = React.useState(false);

  if (!aberto) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const novo: Funcionario = {
        id: `f-${Date.now()}`,
        nome,
        cargo,
        cpf,
        email,
        telefone,
        admissao,
        salarioBruto,
        vinculo,
        status: "Ativo",
      };
      await add(novo);
      toast.success("Funcionário cadastrado!", `${nome} foi adicionado(a) à equipe.`);
      onFechar();
      setNome("");
      setCpf("");
      setEmail("");
      setTelefone("");
      setSalarioBruto(0);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-xl bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Novo colaborador</h2>
              <p className="text-xs text-muted-foreground">Cadastro na equipe</p>
            </div>
          </div>
          <button onClick={onFechar} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <Label>Nome completo *</Label>
            <Input className="mt-1.5" required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cargo *</Label>
              <select
                value={cargo}
                onChange={(e) => setCargo(e.target.value as CargoFuncionario)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Direção</option>
                <option>Coordenação</option>
                <option>Professor</option>
                <option>Auxiliar Pedagógico</option>
                <option>Secretaria</option>
                <option>Financeiro</option>
                <option>Cozinha</option>
                <option>Limpeza</option>
                <option>Segurança</option>
                <option>Manutenção</option>
              </select>
            </div>
            <div>
              <Label>Vínculo</Label>
              <select
                value={vinculo}
                onChange={(e) => setVinculo(e.target.value as Funcionario["vinculo"])}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>CLT</option>
                <option>PJ</option>
                <option>Estagiário</option>
                <option>Terceirizado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CPF</Label>
              <Input className="mt-1.5" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input className="mt-1.5" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(12) 91234-5678" />
            </div>
            <div>
              <Label>Data admissão</Label>
              <Input className="mt-1.5" type="date" value={admissao} onChange={(e) => setAdmissao(e.target.value)} />
            </div>
            <div>
              <Label>Salário bruto</Label>
              <Input
                className="mt-1.5"
                type="number"
                min={0}
                step="0.01"
                value={salarioBruto}
                onChange={(e) => setSalarioBruto(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700">
              {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Cadastrar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

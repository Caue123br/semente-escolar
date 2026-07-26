"use client";

import { Bus, MapPin, Users, Clock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEntidade } from "@/lib/data/store";

export default function TransportePage() {
  const { items: rotasTransporte } = useEntidade("transporte");
  const { items: alunos } = useEntidade("alunos");
  const alunosPorId = new Map(alunos.map((aluno) => [aluno.id, aluno]));
  const todosAlunosIds = rotasTransporte.flatMap((rota) => rota.alunosIds ?? []);
  const totalAlunos = new Set(todosAlunosIds.filter((id) => alunosPorId.has(id))).size;
  const totalVinculos = todosAlunosIds.length;
  const totalCapacidade = rotasTransporte.reduce((a, r) => a + r.capacidade, 0);
  const ocupacaoTotal = totalCapacidade > 0 ? (totalVinculos / totalCapacidade) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Bus className="h-3.5 w-3.5" /> TRANSPORTE
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Transporte escolar
          </h1>
          <p className="text-sm text-muted-foreground">
            Rotas, motoristas, monitoras e alunos por rota.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Rotas ativas</div>
          <div className="mt-1 text-2xl font-bold">{rotasTransporte.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Alunos transportados</div>
          <div className="mt-1 text-2xl font-bold text-primary">{totalAlunos}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Ocupação</div>
          <div className="mt-1 text-2xl font-bold text-success">
            {ocupacaoTotal.toFixed(0)}%
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Vagas livres</div>
          <div className="mt-1 text-2xl font-bold text-warning">
            {Math.max(totalCapacidade - totalVinculos, 0)}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rotasTransporte.map((rota) => {
          const alunosIds = rota.alunosIds ?? [];
          const ocupacao = rota.capacidade > 0 ? (alunosIds.length / rota.capacidade) * 100 : 0;
          const alunosRota = alunosIds.flatMap((id) => {
            const aluno = alunosPorId.get(id);
            return aluno ? [aluno] : [];
          });
          const vinculosSemAluno = alunosIds.length - alunosRota.length;
          return (
            <Card key={rota.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bus className="h-5 w-5 text-primary" />
                      {rota.nome}
                    </CardTitle>
                    <CardDescription>
                      {rota.veiculo} · Placa {rota.placa}
                    </CardDescription>
                  </div>
                  <Badge variant={ocupacao > 90 ? "warning" : "success"}>
                    {alunosIds.length}/{rota.capacidade}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Motorista</div>
                    <div className="font-medium">{rota.motorista}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Monitora</div>
                    <div className="font-medium">{rota.monitora}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Saída
                    </div>
                    <div className="font-medium">{rota.horarioSaida}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Retorno
                    </div>
                    <div className="font-medium">{rota.horarioRetorno}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Bairros atendidos
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {rota.bairros.map((b) => (
                      <Badge key={b} variant="outline" className="text-[10px]">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Ocupação</span>
                    <span className="font-medium">{ocupacao.toFixed(0)}%</span>
                  </div>
                  <Progress
                    value={ocupacao}
                    indicatorClassName={ocupacao > 90 ? "bg-warning" : "bg-primary"}
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Alunos ({alunosRota.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {alunosRota.slice(0, 8).map((aluno) => (
                      <Badge
                        key={aluno.id}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {aluno.nome.split(" ")[0]}
                      </Badge>
                    ))}
                    {alunosRota.length > 8 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{alunosRota.length - 8}
                      </Badge>
                    )}
                    {alunosIds.length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhum aluno vinculado por ID.</span>
                    )}
                  </div>
                  {vinculosSemAluno > 0 && (
                    <div className="mt-2 text-xs text-warning">
                      {vinculosSemAluno} vínculo(s) apontam para aluno não encontrado no cadastro carregado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

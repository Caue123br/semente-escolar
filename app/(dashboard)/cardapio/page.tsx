"use client";

import { UtensilsCrossed, AlertCircle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEntidade } from "@/lib/data/store";
import { usePerfil } from "@/lib/perfil-context";
import { formatDateBR } from "@/lib/utils";

export default function CardapioPage() {
  const { perfil, carregando: carregandoPerfil } = usePerfil();
  const { items: cardapioSemana, carregando: carregandoCardapio, erro: erroCardapio } = useEntidade("cardapio");
  const { items: alunos, carregando: carregandoAlunos, erro: erroAlunos } = useEntidade("alunos");
  const podeVerAlergias = perfil === "diretor" || perfil === "coordenador";
  const alunosComAlergias = podeVerAlergias
    ? alunos.filter(
        (aluno) => aluno.status === "Ativo" && Boolean(aluno.fichaSaude?.alergias?.trim())
      )
    : [];
  const totalCalDia = (i: number) =>
    cardapioSemana[i]?.refeicoes.reduce((a, r) => a + r.caloriasAprox, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <UtensilsCrossed className="h-3.5 w-3.5" /> ALIMENTAÇÃO
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Cardápio escolar
          </h1>
          <p className="text-sm text-muted-foreground">
            Planejamento alimentar cadastrado pela equipe. Aprovação técnica não está registrada neste sistema.
          </p>
        </div>
      </div>

      {(erroCardapio || erroAlunos) && (
        <Card className="border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          Não foi possível carregar todos os dados desta tela: {erroCardapio ?? erroAlunos}
        </Card>
      )}

      <Tabs defaultValue="semana" className="space-y-4">
        <TabsList>
          <TabsTrigger value="semana">Cardápio da semana</TabsTrigger>
          <TabsTrigger value="restricoes">Alergias nas fichas</TabsTrigger>
        </TabsList>

        <TabsContent value="semana">
          {!carregandoCardapio && cardapioSemana.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              Nenhum cardápio foi cadastrado para o período.
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {cardapioSemana.map((dia, i) => (
                <Card key={dia.data}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{dia.diaSemana}</CardTitle>
                        <CardDescription>{formatDateBR(dia.data)}</CardDescription>
                      </div>
                      <Badge variant="info">{totalCalDia(i)} kcal</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dia.refeicoes.map((r, j) => (
                      <div key={j} className="rounded-lg border bg-card p-3 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold uppercase tracking-wide">{r.refeicao}</span>
                          <span className="text-muted-foreground">{r.caloriasAprox} kcal</span>
                        </div>
                        <ul className="space-y-0.5 list-disc list-inside text-muted-foreground">
                          {r.itens.map((item, k) => (
                            <li key={k}>{item}</li>
                          ))}
                        </ul>
                        {r.observacoes && (
                          <div className="mt-2 text-[10px] text-warning flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {r.observacoes}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="restricoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-danger" />
                Alergias informadas
              </CardTitle>
              <CardDescription>
                {podeVerAlergias
                  ? `${alunosComAlergias.length} aluno(s) ativo(s) com alergias informadas na ficha de saúde`
                  : "Dados detalhados disponíveis somente à direção e coordenação"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Esta lista reproduz apenas o campo de alergias das fichas reais. Ela não presume diagnóstico,
                restrição alimentar ou orientação de nutricionista.
              </div>
              {!carregandoPerfil && !podeVerAlergias && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Seu perfil não recebe os dados de saúde dos alunos. Consulte a direção ou a coordenação.
                </div>
              )}
              {podeVerAlergias && !carregandoAlunos && alunosComAlergias.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma alergia foi informada nas fichas dos alunos ativos.
                </div>
              )}
              {podeVerAlergias && alunosComAlergias.map((aluno) => (
                <div
                  key={aluno.id}
                  className="rounded-lg border-l-4 border-l-danger bg-danger/5 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{aluno.nome}</div>
                    <Badge variant="danger">Alergia informada</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {aluno.fichaSaude?.alergias?.trim()}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

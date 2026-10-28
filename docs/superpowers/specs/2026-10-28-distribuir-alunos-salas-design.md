# Distribuir alunos entre salas e professoras — Design

**Data:** 2026-10-28 · **Status:** aprovado pelo Cauê

## Contexto e problema

A escola tem, na prática, **duas salas do mesmo nível/turno** (ex.: duas "Maternal 1 – Manhã"),
cada uma com sua professora. No sistema só existia uma turma por nível, então a secretaria
colocou todos os alunos na mesma turma — estourou a capacidade (aviso de lotação) e metade
das crianças aparece com a professora errada na listagem.

No modelo de dados, **a professora pertence à turma** (`app.turmas.professor_nome` /
`professor_usuario_id`); o aluno não tem professora própria. A coluna "Professora" da
listagem de alunos é derivada da sala. Portanto, "setar a professora de cada aluno" =
colocar o aluno na sala certa. Esse princípio **não muda** (zero migração de schema).

## O que será construído

### 1. Troca rápida de sala na linha do aluno

- Na listagem de alunos (`app/(dashboard)/alunos/page.tsx`), para perfis com
  `podeGerenciarAlunos` (diretor/coordenador), as células **Sala/Turma** e **Professora**
  viram um gatilho clicável (lápis no hover).
- Abre um popover/diálogo leve na própria linha com:
  - Select nativo de salas no formato `"{nome} — {professora} ({ocupação}/{capacidade})"`.
  - Botão **Salvar** + Cancelar.
  - Link secundário: "Trocar a professora desta sala (afeta todos os alunos dela)" →
    abre o modal "Turmas e professoras" já existente.
- Salvar envia `PATCH /api/alunos/{id}` com `{turmaId}` (caminho já existente, entrada
  `turmaId` já na whitelist `MAPA`).
- Se a sala destino estiver lotada (422 `codigo: "lotacao"`), reusar o mesmo fluxo de
  confirmação do `editar-aluno-modal` (confirmar mesmo assim → reenviar).
- Lista atualiza sozinha via event bus (`semente:changed:alunos`).

### 2. Seleção em massa + mover para sala

- Coluna de checkbox na tabela (apenas `podeGerenciarAlunos`), com "selecionar todos"
  no cabeçalho (seleciona os alunos **filtrados** visíveis da lista, todas as páginas do
  filtro atual).
- Com 1+ selecionados, barra fixa: `"{N} selecionados → Mover para sala [▾] [Mover]"`.
- Novo endpoint **`POST /api/alunos/mover-sala`** com corpo
  `{ alunoIds: string[], turmaId: string, confirmarLotacao?: boolean }`:
  - Guardas: sessão (`getUsuarioLogado`) + `podeGerenciarAlunos` + escopo de professor
    (mesma cadeia das rotas atuais; o proxy já exige `podeGerenciarAlunos` para
    não-GET em `/api/alunos`).
  - Valida turma destino (existe, mesma escola, não deletada).
  - **Uma** checagem de capacidade para o lote inteiro: se `ocupação_atual_destino +
    novos > capacidade` e `confirmarLotacao !== true`, responde 422
    `codigo: "lotacao"` com `{ocupacao, capacidade, turmaNome, quantidade}` — o cliente
    mostra UMA confirmação e reenvia com `confirmarLotacao: true`.
  - Atualiza `turma_id` de todos os alunos; auditoria (`registrarAudit`) por aluno.
  - Resposta: `{movidos: n}`.
- No cliente, o sucesso dispara o refresh padrão do store e um toast
  ("N alunos movidos para {sala}"). Seleção é limpa.

### 3. Duplicar sala

- No modal "Turmas e professoras" (`gerenciar-turmas-modal.tsx`), botão **Duplicar**
  por sala: abre mini-form com nome pré-preenchido (`"{nome} B"`, editável), mesmos
  série/turno/capacidade/cor da origem, e o mesmo seletor de professora do modal
  (vincular com acesso | informar nome | sem professora).
- Cria via `POST /api/turmas` (rota existente; completar o payload se necessário).
- A sala nova aparece imediatamente nos selects de troca rápida e mover em massa.

## Fora de escopo

- Professora por aluno (coluna no aluno) — descartado: o modelo sala→professora atende.
- Renomear/editar salas existentes além do que já existe hoje.
- Mudanças no escopo de autorização de professoras (`professor-scope.ts` intocado).

## Erros e segurança

- Lotação: confirmável (fluxo pedido explicitamente pela secretaria). Uma confirmação
  por operação em massa, não N.
- Permissões: UI escondida sem `podeGerenciarAlunos`; servidor revalida tudo
  (proxy + handler). Professor com escopo restrito não pode mover para/da sala fora
  do seu escopo (mesma regra do PATCH atual) — na prática a rota é diretor/coordenador.
- Auditoria em toda mutação, como o restante do sistema.
- Códigos tratados na tela (`lotacao`) não geram toast duplicado do store.

## Testes (padrão do repo: `node:test` + transpile, `pnpm test`)

- `app/api/alunos/mover-sala`: sucesso, lotação sem confirmação (422), lotação com
  confirmação, turma inexistente, sem permissão, lista vazia/ids inválidos.
- Componente de troca rápida: render das opções com ocupação, fluxo de lotação.
- Seleção em massa: selecionar todos filtrados, limpar ao mudar filtro, barra aparece/some.
- Duplicar sala: payload correto, nome sugerido, professora vinculada vs nome livre.

## Critérios de aceite

- [ ] Trocar a sala de um aluno pela linha em ≤ 3 cliques, professora atualiza junto.
- [ ] Mover 10+ alunos de uma vez para outra sala com uma única confirmação de lotação.
- [ ] Criar "Maternal 1 – Manhã B" com professora própria sem sair do fluxo.
- [ ] Nada disso visível/possível para perfis sem permissão de gerenciar alunos.
- [ ] `pnpm test` verde; auditoria registrada por aluno movido.

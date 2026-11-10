# Documentos arquivados por aluno — Design

**Data:** 2026-11-10 · **Status:** aprovado pelo Cauê

## Contexto e problema

A escola quer arquivar as documentações de cada criança (certidão, RG, CPF, comprovantes,
laudos, contratos) na ficha digital. A aba **Documentos** da ficha do aluno
(`app/(dashboard)/alunos/[alunoId]/page.tsx:298-314`) existe como placeholder declarado
("O upload de documentos será mostrado aqui quando estiver configurado"). A infra de
arquivos por aluno já existe e é endurecida: upload de foto com validação por magic
bytes (`app/api/upload/foto-aluno/route.ts`) e serving autenticado com escopo por
professor e proteção de path traversal (`app/api/uploads/[...arquivo]/route.ts`).

## O que será construído

### 1. Banco — migration `db/migrations/0011_documentos_aluno.sql`

Tabela `app.alunos_documentos`:

| Coluna | Tipo | Observação |
|---|---|---|
| `escola_id` | TEXT NOT NULL | como todas as tabelas `app.*` |
| `id` | TEXT NOT NULL | uuid |
| `aluno_id` | TEXT NOT NULL | FK composta → `app.alunos` ON DELETE RESTRICT |
| `categoria` | TEXT NOT NULL | lista fixa validada na API |
| `descricao` | TEXT NULL | livre, até 300 chars |
| `arquivo_url` | TEXT NOT NULL | `/api/uploads/{escola}/alunos/{aluno}/documentos/{uuid}.{ext}` |
| `mime` | TEXT NOT NULL | application/pdf, image/jpeg, image/png, image/webp |
| `tamanho_bytes` | INTEGER NOT NULL | para exibição |
| `enviado_por` | TEXT NULL | FK composta → `iam.usuarios` ON DELETE SET NULL |
| `enviado_por_nome` | TEXT NOT NULL | denormalizado para exibição estável |
| `criado_em` | timestamptz NOT NULL DEFAULT now() | |

PK (escola_id, id); índice (escola_id, aluno_id). Aditiva, segura para prod.

### 2. Upload — `POST /api/upload/documento-aluno`

Multipart `{alunoId, categoria, descricao?, file}`, no padrão do upload de foto:
- Sessão obrigatória; proxy passa a exigir `podeGerenciarAlunos` para não-GET nesta
  rota (adicionar em `proxy.ts` à lista de uploads gated e ao `MODULOS_API` → módulo
  `alunos`); o handler revalida perfil + escopo de professor.
- Valida magic bytes: **PDF** (`%PDF-`), JPG, PNG, WEBP. Limite **10 MB**. Categoria
  precisa estar na lista fixa; descrição ≤ 300 chars.
- Grava em `{UPLOADS_DIR}/{escola}/alunos/{alunoId}/documentos/{uuid}.{ext}`
  (`wx`, 0600, mkdir 0700) e INSERT em `alunos_documentos`; compensação (unlink) se o
  INSERT falhar; `registrarAudit`.
- Resposta: `{ok, item}` com a linha mapeada.

### 3. Listagem e exclusão — `app/api/alunos/[id]/documentos`

- `GET /api/alunos/[id]/documentos` → `{items}` ordenados por `criado_em` desc.
  Acesso: diretor/coordenador; professor somente-leitura se o aluno está no escopo;
  financeiro **não** (documentos pessoais não participam da cobrança) — checado
  no handler, já que o proxy libera GET de `/api/alunos` para `podeLerCadastroDeAlunos`.
- `DELETE /api/alunos/[id]/documentos/[docId]` → remove a linha, apaga o arquivo
  físico (derivando o caminho da própria linha, nunca de input do cliente) e audita
  com os metadados do documento. Erro ao apagar o arquivo não desfaz a exclusão da
  linha (log + segue) — direito de exclusão não pode falhar por arquivo já ausente.
  Proxy: não-GET sob `/api/alunos` já exige `podeGerenciarAlunos`.

### 4. Servir/baixar — estender `app/api/uploads/[...arquivo]/route.ts`

- Aceitar também caminhos de **5 segmentos** `{escola}/alunos/{alunoId}/documentos/{arquivo}`
  (hoje só 4), mantendo todas as checagens (aluno existe, escopo professor, regex de
  segmento, traversal).
- `CONTENT_TYPES` ganha `.pdf: application/pdf`.
- Documentos respondem com `content-disposition: inline; filename="{categoria}.{ext}"`
  (abre no navegador; o nome baixado fica legível).

### 5. UI — componente `components/alunos/documentos-aluno.tsx`

Preenche a aba Documentos (substitui o placeholder), no padrão do `FichaFinanceiraAluno`:
- **Form de envio** (só `podeGerenciarAlunos`): select de categoria fixa — Certidão de
  nascimento, RG, CPF, Comprovante de residência, Carteira de vacinação, Laudo/relatório
  médico, Contrato, Outro — + descrição opcional + arquivo (accept .pdf/.jpg/.png/.webp)
  + botão Enviar com spinner. Validação de 10 MB no cliente antes de subir.
- **Lista**: ícone por tipo (PDF/imagem), categoria em destaque, descrição, tamanho
  legível (KB/MB), data e quem enviou; ações **Abrir** (link `target="_blank"` para a
  `arquivo_url`) e **Excluir** (ConfirmDialog variante danger).
- Estados: carregando, vazio (mantém o espírito do placeholder atual), erro com retry.
- Busca via fetch próprio (`cache: no-store`) + recarrega após enviar/excluir; toasts
  no padrão (`useToast`).

## Fora de escopo

- Portal dos pais (ver ou enviar documentos).
- Fotografar documento pela webcam (plugável depois via `CapturarFotoModal`).
- Versionamento, OCR, assinatura digital.

## Erros e segurança

- Conteúdo ≠ extensão → recusado (magic bytes, como a foto).
- Nome de arquivo em disco é sempre uuid gerado no servidor; nome exibido vem de
  categoria/descrição — input do cliente nunca vira caminho.
- Professor fora do escopo: 404 no serving, 403/404 nas APIs.
- Auditoria em upload e exclusão.
- LGPD: exclusão remove o arquivo físico de verdade.

## Testes (padrão do repo, `pnpm test`)

- Upload: PDF válido aceito; PDF falso (extensão .pdf, conteúdo texto) recusado;
  >10 MB recusado; categoria inválida recusada; professor fora do escopo bloqueado;
  INSERT falhou → unlink compensatório.
- GET/DELETE: lista ordenada; financeiro bloqueado na listagem; professor fora do
  escopo bloqueado; delete remove linha + arquivo + audita.
- Serving: 5 segmentos com PDF servido com content-disposition; 4 segmentos (foto)
  continuam funcionando; traversal e segmento inválido continuam 404.
- Componente: render com lista/vazio/sem permissão; envio monta o FormData certo
  (fetch stubado); exclusão passa pelo ConfirmDialog.

## Critérios de aceite

- [ ] Enviar certidão em PDF pela aba Documentos e abri-la em nova aba.
- [ ] Arquivo com extensão mentirosa é recusado com mensagem clara.
- [ ] Excluir documento some da lista e do disco, com auditoria.
- [ ] Professora não vê documentos de aluno fora das turmas dela; financeiro não vê a lista.
- [ ] `pnpm test` e `pnpm typecheck` verdes; migration roda limpa em banco com dados.

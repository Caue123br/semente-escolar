# Foto do aluno pela webcam — Design

**Data:** 2026-11-02 · **Status:** aprovado pelo Cauê

## Contexto e problema

A secretaria quer tirar a foto do aluno na hora — na matrícula, no perfil ou direto na
listagem — usando a webcam do computador, em vez de depender de arquivo enviado.
Hoje o `UploadFotoAluno` (avatar + botão de câmera) só abre o seletor de arquivo, e a
listagem de alunos nem exibe a foto de quem já tem (só iniciais).

## O que será construído

### 1. `CapturarFotoModal` (componente novo, reutilizado em todos os pontos)

`components/alunos/capturar-foto-modal.tsx`. Recebe `{ alunoId, nomeAluno, onAtualizado, onClose }`.

- Abre a webcam com `getUserMedia({ video: { facingMode: "user" } })`; preview ao vivo
  (espelhado via CSS, como espelho — a foto gravada sai sem espelho).
- **"Tirar foto"** congela o frame num canvas com recorte quadrado central (512×512,
  JPEG qualidade 0.9) → preview congelado com **"Usar esta foto"** / **"Tirar outra"**.
- "Usar esta foto" envia como `File` pela rota existente `POST /api/upload/foto-aluno`
  (FormData `{alunoId, file}`) — zero mudança no servidor.
- Botão alternativo **"Enviar arquivo"** sempre visível (input file igual ao de hoje,
  mesma validação de JPG/PNG/WEBP no servidor).
- Sem webcam / permissão negada / erro (`NotAllowedError`, `NotFoundError`, etc.):
  mensagem amigável e o modal continua útil só com "Enviar arquivo". Nunca trava.
- Tracks da câmera são encerrados ao fechar/desmontar (sem LED de câmera fantasma).
- Lógica de captura (crop quadrado + toBlob) isolada em helpers puros testáveis que
  recebem os objetos de vídeo/canvas (stubáveis nos testes).

### 2. `UploadFotoAluno` passa a abrir o modal

O botãozinho azul de câmera (perfil `/alunos/[id]` e modal pós-matrícula) abre o
`CapturarFotoModal` em vez de ir direto ao seletor de arquivo. O upload (fetch +
toasts) migra para dentro do modal; o `UploadFotoAluno` mantém o avatar, o estado
`fotoLocal` e o callback `onAtualizado`. A matrícula ganha webcam de graça por usar
o mesmo componente.

### 3. Listagem de alunos

Na célula do aluno (`app/(dashboard)/alunos/page.tsx`):

- **Aluno com foto:** o avatar passa a exibir a foto (`AvatarImage`, que hoje não é
  renderizada na lista). Clique mantém a navegação atual (perfil/pedagógico).
- **Aluno sem foto + perfil com `podeGerenciarAlunos`:** o avatar vira um botão com um
  ícone discreto de câmera sobreposto; clicar abre o `CapturarFotoModal` ali mesmo,
  sem navegar. Depois do upload, dispara `semente:changed:alunos` (a lista recarrega
  e o avatar passa a mostrar a foto).
- **Aluno sem foto + perfil sem permissão:** iniciais como hoje, sem botão.
- O nome do aluno continua sendo o link de navegação em todos os casos (o avatar sai
  de dentro do `Link` e vira irmão dele na mesma célula flex).

### 4. Permissions-Policy

`next.config.ts` hoje envia `Permissions-Policy: camera=(), ...`, que **bloqueia a
webcam para o próprio site**. Muda para `camera=(self)` (microfone/geolocalização
continuam bloqueados). O site roda com HSTS/HTTPS em produção, requisito do
`getUserMedia` já atendido; em dev, `localhost` é contexto seguro.

## Fora de escopo

- Recorte/zoom manual, filtros, troca de câmera (usa a padrão/frontal).
- Compressão/redimensionamento no servidor (a rota atual grava o arquivo como chega;
  a captura já sai 512×512).
- Foto por webcam no portal dos pais.

## Erros e segurança

- Permissão negada/sem câmera → aviso no modal + fallback de arquivo.
- Upload falhou → mesmos toasts de erro de hoje; modal permanece aberto para retry.
- Rota de upload inalterada: já exige sessão, valida magic bytes e audita.
- A captura 512×512 JPEG fica muito abaixo do limite de 5 MB.

## Testes (padrão do repo: `node:test` + transpile, `pnpm test`)

- Helpers de captura: crop quadrado central com vídeo paisagem/retrato (stubs de
  vídeo/canvas), geração do File JPEG.
- `CapturarFotoModal`: estado de erro de câmera mostra fallback de arquivo; fluxo
  tirar→usar chama upload com FormData certo (fetch stubado) e `onAtualizado`.
- `UploadFotoAluno`: botão de câmera abre o modal (em vez do input direto).
- Listagem: com foto renderiza `AvatarImage`; sem foto + diretor renderiza botão de
  captura; sem foto + professor renderiza só iniciais.
- `next.config.ts`: asserção de que `Permissions-Policy` contém `camera=(self)`.

## Critérios de aceite

- [ ] Tirar foto pela webcam no perfil do aluno, no pós-matrícula e na listagem
      (aluno sem foto) — e o avatar atualiza na hora.
- [ ] Sem webcam/permissão negada, o fluxo de arquivo continua funcionando no modal.
- [ ] Listagem mostra a foto de quem tem foto.
- [ ] Nada de captura visível para perfis sem `podeGerenciarAlunos` na listagem.
- [ ] Câmera desliga ao fechar o modal.
- [ ] `pnpm test` e `pnpm typecheck` verdes.

# 🌱 Como ativar o backend Supabase

O sistema funciona de duas formas:

### 🟢 Modo demo (padrão — já funcionando agora)
- Sem precisar criar conta em lugar nenhum
- Dados ficam salvos no navegador (localStorage)
- Adicionar aluno, evento, aviso etc. funciona normalmente
- **Limitação:** dados não sincronizam entre devices e podem sumir se limpar cache

### 🚀 Modo produção (Supabase real)
- Banco de dados real PostgreSQL
- Multi-usuário, multi-device
- Login real com e-mail/senha
- **Grátis** até 500MB de dados

---

## Passo a passo pra ativar Supabase (~10 minutos)

### 1. Criar conta gratuita
Acesse [https://supabase.com](https://supabase.com) e clique em **Start your project**.
Pode entrar com GitHub, Google ou e-mail.

### 2. Criar novo projeto
- Clique em **New project**
- Nome: `semente` (ou qualquer nome)
- Database password: crie uma senha forte (guarde!)
- Region: **South America (São Paulo)** ← importante pra LGPD
- Pricing plan: **Free** (já basta)
- Clique em **Create new project**
- Aguarde ~2 minutos enquanto provisiona

### 3. Aplicar o schema (cria todas as tabelas)
- No menu lateral, vá em **SQL Editor**
- Clique em **+ New query**
- Abra o arquivo `supabase/schema.sql` deste projeto
- **Copie tudo** e cole no editor SQL
- Clique em **Run** (ou Ctrl+Enter)
- Deve aparecer "Success. No rows returned"

### 4. Copiar credenciais
- Menu lateral → **Project Settings** (ícone de engrenagem)
- Aba **API**
- Copie estes 2 valores:
  - **Project URL** → ex: `https://abcdefghijk.supabase.co`
  - **Project API keys → anon / public** → uma string longa

### 5. Configurar no projeto
Na raiz do projeto, copie o arquivo de exemplo:

```bash
cp .env.local.example .env.local
```

Abra `.env.local` e cole as credenciais:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Reiniciar o servidor
```bash
# Pare o servidor (Ctrl+C) e rode de novo:
pnpm dev
```

Pronto! Agora o sistema está conectado ao Supabase real.

---

## Verificar se está funcionando

1. Abra o sistema em `http://localhost:3001`
2. No console do navegador (F12), digite:
   ```js
   localStorage.getItem('semente:data:alunos')
   ```
3. Em modo demo: retorna JSON com os alunos
4. Em modo Supabase: o sistema lê direto do banco (esse comando retorna `null`)

---

## Reset da demo (apagar dados do navegador)

Se quiser começar do zero no modo demo:

```js
// No console (F12)
Object.keys(localStorage)
  .filter(k => k.startsWith('semente:'))
  .forEach(k => localStorage.removeItem(k))
location.reload()
```

Ou use o botão "Resetar dados" nas Configurações (em breve).

---

## Custos do Supabase

| Plano | Preço | Banco | Auth | Storage |
|-------|-------|-------|------|---------|
| **Free** | R$ 0/mês | 500 MB | 50k usuários/mês | 1 GB |
| **Pro** | US$ 25/mês | 8 GB | 100k usuários | 100 GB |

Pra uma escola com 500 alunos e 5 anos de histórico, **o plano Free aguenta tranquilo**.

---

## Suporte

Problemas? Abre [issue no GitHub](https://github.com/semente/semente) ou WhatsApp (11) 3333-4444.

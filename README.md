# 🌱 Semente — Sistema operacional da sua escola infantil

Sistema SaaS de gestão escolar que une **administrativo, financeiro e pedagógico** num só lugar.

**Demonstração ao vivo:** https://semente-escolar.vercel.app (em breve)

---

## ✨ O diferencial

Pela 1ª vez, **financeiro e pedagógico conversam no mesmo dashboard**. Enquanto outros sistemas tratam essas áreas como ilhas, na Semente elas estão entrelaçadas — você decide com a foto completa.

## 🚀 Features

- **24 módulos** · **100+ telas** · totalmente em PT-BR
- **Cockpit** com Insight do Dia (IA) e Antes vs Depois
- **Financeiro completo:** régua de inadimplência, conciliação, DRE, fluxo de caixa, boletos/Pix
- **Pedagógico diferencial:** psicogênese da escrita, linha de evolução, radar de competências, alerta de estagnação
- **WhatsApp Business** integrado: grupos por turma + cobrança automática
- **CRM de matrículas** com funil de 7 estágios
- **24 módulos:** Alunos, Kanban, Estoque, Vendas/PDV, Nota Fiscal, RH, Calendário, Cardápio, Transporte, Biblioteca, Berçário, Reservas, Patrimônio, Mural, Portal dos Pais, Relatórios, Frequência, LGPD, Configurações...
- **Command Palette (⌘K)** com busca fuzzy de tudo
- **Atalhos de teclado** completos (`?` para ver)
- **Dark mode** com persistência
- **Modo apresentação** (foco máximo)
- **Mobile responsive** com drawer
- **Multi-perfil** (Diretor / Coordenador / Professor)

## 🛠 Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui
- **Recharts** para gráficos
- **lucide-react** para ícones
- **libSQL (SQLite)** local para dev / **Turso ou Supabase** em produção

## 📦 Rodando localmente

```bash
# Instalar dependências
pnpm install

# Subir o servidor
pnpm dev

# Acessar
open http://localhost:3000
```

Na primeira requisição, o banco SQLite é criado automaticamente em `data/semente.db` com seed completo da "Escola Semente Feliz" (228 alunos, 12 turmas, etc).

## ☁️ Deploy

### Vercel
```bash
vercel
```

⚠️ **Atenção:** o filesystem é read-only em Vercel Functions. Pra persistência em produção, use:

- **Turso** (libSQL na nuvem — mesma API do SQLite local)
- **Supabase** (Postgres + Auth + Storage)
- **Neon** (Postgres serverless)

Veja `COMO-ATIVAR-SUPABASE.md` ou abra issue pra setup Turso.

## 📂 Estrutura

```
app/
├── (dashboard)/         # Sistema (24 módulos)
├── api/                 # API routes (SQLite CRUD)
├── login/               # Tela de login
├── sobre/               # Páginas marketing
├── cases/
├── calculadora/
├── comparativo/
├── ajuda/
├── demo/
└── page.tsx             # Landing page

components/
├── ui/                  # shadcn/ui
├── layout/              # Sidebar, Header, Cmd+K, Toast, etc.
├── landing/             # Seções da landing page
├── cockpit/             # Cards do cockpit
├── financeiro/          # Tabs do financeiro
├── pedagogico/          # Linha evolução, radar
└── shared/              # Skeleton, EmptyState, etc.

lib/
├── db/                  # libSQL client + schema + mappers
├── data/                # Data store (fetch API + localStorage fallback)
├── mock-data/           # Seeds (Escola Semente Feliz)
├── types.ts             # Tipos centrais
├── perfil-context.tsx
├── theme-context.tsx
├── toast.tsx
└── utils.ts             # cn, formatBRL, etc.
```

## 🧪 Testando como dono de escola

1. Acesse `/` → landing page
2. Clique em "Ver demonstração ao vivo" → entra no sistema
3. Modal de boas-vindas aparece com tour de 4 passos
4. Use `⌘K` pra buscar qualquer coisa
5. FAB+ (canto inferior direito) → adicionar aluno/evento/aviso
6. Tudo persiste no banco SQLite local

## 📋 Licença

Proprietário · Cauê Avila · 2026

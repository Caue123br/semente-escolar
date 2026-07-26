# 🌱 Semente — Gestão escolar

Aplicação web de gestão escolar que reúne fluxos **administrativos, financeiros e pedagógicos** sobre PostgreSQL.

---

## ✨ O diferencial

Os módulos usam a mesma base de dados e o cockpit adapta consultas e indicadores ao perfil autenticado.

## 🚀 Features

- Matrícula, turmas, avaliações, frequência, estoque e vendas persistidos no PostgreSQL
- **Cockpit por perfil**, sem buscar ou exibir módulos não autorizados
- **Financeiro:** mensalidades, inadimplência, despesas e relatórios com dados cadastrados
- **Pedagógico:** psicogênese da escrita, evolução e competências por aluno
- **CRM de matrículas** com funil de sete estágios
- Alunos, Kanban, Estoque, PDV, controle fiscal, RH, Calendário, Cardápio, Transporte, Biblioteca, Berçário, Reservas, Patrimônio, Mural, Relatórios, Frequência, LGPD e Configurações
- **Command Palette (⌘K)** com busca fuzzy de tudo
- **Atalhos de teclado** completos (`?` para ver)
- **Dark mode** com persistência
- **Modo apresentação** (foco máximo)
- **Mobile responsive** com drawer
- **Multi-perfil** (Diretor / Coordenador / Professor / Financeiro)

Integrações municipais, bancárias, de calendário e de WhatsApp **não vêm conectadas**. Sem um provedor configurado, o sistema mantém registros internos ou abre o aplicativo externo e não afirma envio, leitura, conciliação ou emissão fiscal.

## 🛠 Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui
- **Recharts** para gráficos
- **lucide-react** para ícones
- **PostgreSQL 16 nativo** com acesso exclusivo pelo servidor
- Sessões revogáveis no banco, senhas com bcrypt e uploads privados em disco persistente

## 📦 Rodando localmente

```bash
# Instalar dependências
pnpm install

# Configure DATABASE_URL e DATABASE_MIGRATION_URL
cp .env.local.example .env.local

# Criar o schema no PostgreSQL
pnpm db:migrate

# Subir o servidor
pnpm dev

# Acessar
open http://localhost:3000
```

Com `ENABLE_DEMO_SEED=false`, o sistema não cria dados fictícios. Depois das migrations, crie o primeiro diretor com `pnpm db:bootstrap-admin`; o comando exige os dados em variáveis de ambiente e nunca possui senha padrão. Fixtures de demonstração só devem ser habilitadas deliberadamente em desenvolvimento.

## ☁️ Deploy

Em produção, a aplicação Next e o PostgreSQL rodam na VPS. O domínio pode continuar sob DNS da Vercel, apontando para o Nginx da VPS. O banco escuta somente em `127.0.0.1`, portanto a porta PostgreSQL não deve ser aberta na internet.

Veja [`COMO-ATIVAR-POSTGRESQL.md`](COMO-ATIVAR-POSTGRESQL.md) para a topologia, variáveis e ordem segura de ativação.

## 📂 Estrutura

```
app/
├── (dashboard)/         # Sistema (24 módulos)
├── api/                 # API server-side sobre PostgreSQL
├── login/               # Autenticação de funcionários
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
├── db/                  # PostgreSQL, sessões, auditoria e mappers
├── data/                # Store que consome apenas a API autenticada
├── mock-data/           # Fixtures opcionais, desativadas em produção
├── types.ts             # Tipos centrais
├── perfil-context.tsx
├── theme-context.tsx
├── toast.tsx
└── utils.ts             # cn, formatBRL, etc.
```

## Verificações

```bash
pnpm run typecheck
pnpm run build
```

O endpoint `/api/health` só responde com sucesso quando a aplicação consegue executar uma consulta no PostgreSQL.

## 📋 Licença

Proprietário · Cauê Avila · 2026

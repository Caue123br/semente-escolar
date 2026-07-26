# 🌱 PROMPT PERFEITO PARA LOVABLE — Sistema "Escola Modelo"

> Copie e cole **TUDO** abaixo (do `---` até o fim) no Lovable como prompt inicial.
> Depois mande mensagens curtas pedindo cada módulo, uma de cada vez.

---

## 🎯 OBJETIVO

Construa um **sistema SaaS de gestão escolar completo** chamado **"Escola Modelo"**, totalmente em **português do Brasil (PT-BR)**, voltado para **escolas de educação infantil** (berçário, maternal, pré-escola). É o "sistema operacional" de uma escola — une **administrativo, financeiro e pedagógico** num só dashboard.

A escola fictícia se chama **"Escola Modelo Taubaté"**.

---

## 🛠 STACK OBRIGATÓRIO

- **Next.js 16** com App Router + TypeScript
- **Tailwind CSS 3** + componentes **shadcn/ui** (Radix primitives)
- **lucide-react** para todos os ícones
- **Recharts** para gráficos (linha, barra, pizza, área)
- **Persistência**: usar localStorage com fallback (mock data inicial)
- **Sem backend externo** — tudo client-side com mock data realista

### Dependências essenciais
```
@radix-ui/react-* (avatar, dialog, dropdown-menu, label, progress, scroll-area, select, separator, slot, tabs, tooltip)
class-variance-authority, clsx, tailwind-merge, tailwindcss-animate
lucide-react, recharts
```

---

## 🎨 IDENTIDADE VISUAL

### Paleta de cores (HSL — define em `globals.css` como CSS vars)

**Light mode (default):**
```css
--background: 210 40% 98%;
--foreground: 222 47% 11%;
--card: 0 0% 100%;
--primary: 221 83% 53%;        /* azul para botões principais do dashboard */
--secondary: 210 40% 96%;
--muted: 210 40% 96%;
--muted-foreground: 215 16% 47%;
--border: 214 32% 91%;
--success: 142 71% 45%;        /* verde */
--warning: 38 92% 50%;         /* amarelo/laranja */
--danger: 0 84% 60%;            /* vermelho */
--radius: 0.75rem;
```

**Dark mode:**
```css
--background: 222 47% 6%;
--foreground: 210 40% 98%;
--card: 222 47% 9%;
--primary: 217 91% 60%;
--border: 217 32% 17%;
```

### Cor de destaque da marca
**Emerald** (`emerald-500`, `emerald-600`, `emerald-700`) — usar em CTAs da landing, sidebar, logo e elementos de identidade. Gradientes `from-emerald-600 to-emerald-700` são padrão.

### Tipografia
- Fonte sistema (Inter ou similar via `next/font/google` se quiser)
- Headlines grandes (`text-4xl md:text-6xl lg:text-7xl`), bold, `tracking-tight`
- `font-feature-settings: "rlig" 1, "calt" 1`

### Design language
- **Bordas arredondadas** generosas (`rounded-xl`, `rounded-2xl`)
- **Sombras suaves** (`shadow-sm`, `shadow-lg`)
- **Gradientes** (radial e linear, especialmente verdes/esmeralda)
- **Backdrop blur** em headers e cards flutuantes
- **Grid patterns** sutis no fundo (linhas opacas 4%)
- **Hover translate** (`hover:-translate-y-0.5`) em cards
- **Animação `fadeInUp`** nas entradas de página

---

## 📐 ARQUITETURA DE ROTAS

```
app/
├── page.tsx                          # Landing page pública
├── login/page.tsx                    # Login (split-screen: form + lado decorativo emerald)
├── sobre/                            # Páginas marketing
├── cases/
├── calculadora/                      # Calculadora de economia
├── comparativo/                      # Tabela comparativa vs concorrentes
├── ajuda/                            # Central de ajuda
├── demo/                             # Demo guiada
├── privacidade/
├── (dashboard)/                      # Sistema (rotas protegidas)
│   ├── layout.tsx                    # Sidebar + Header + Breadcrumbs + CmdK + FAB
│   ├── cockpit/                      # Dashboard principal
│   ├── financeiro/
│   ├── vendas/
│   ├── nota-fiscal/
│   ├── pedagogico/[alunoId]/
│   ├── alunos/[alunoId]/
│   ├── kanban/
│   ├── biblioteca/
│   ├── bercario/
│   ├── saude/
│   ├── recados/
│   ├── calendario/
│   ├── cardapio/
│   ├── transporte/
│   ├── estoque/
│   ├── reservas/
│   ├── patrimonio/
│   ├── mural/
│   ├── pais/                         # Portal dos Pais
│   ├── rh/                           # RH & Folha
│   ├── crm/                          # Captação
│   ├── relatorios/
│   ├── frequencia/
│   ├── lgpd/
│   ├── configuracoes/
│   └── super-admin/
└── api/                              # Rotas CRUD (mock-friendly)
```

---

## 🏠 LANDING PAGE (rota `/`)

Construir uma landing page SaaS de alta conversão com as seguintes seções, NESTA ORDEM:

1. **Navbar** — sticky com blur, logo "🌱 Escola Modelo", links (Módulos, Como funciona, Preços, FAQ), botões "Entrar" e "Ver demo"
2. **Hero**
   - Pill com badge "Novo · O 1º sistema que une financeiro + pedagógico"
   - H1: "O **sistema operacional** da sua escola infantil" (palavras destacadas com gradient emerald)
   - Subtítulo sobre parar de viver em planilhas/WhatsApp
   - 2 CTAs: "Ver demonstração ao vivo" (gradient emerald, leva pra `/cockpit`) e "Assistir vídeo de 2 min"
   - Background com gradientes radiais emerald/azul + grid pattern + mask radial
   - Stats abaixo: "24 módulos · 100+ telas · Multi-perfil"
3. **Logos** — strip "Confiado por escolas em todo o Brasil" com logos fictícios
4. **Diferencial** — bloco "Pela 1ª vez, financeiro e pedagógico conversam"
5. **Módulos** — grid de 24 cards (2/3/4 colunas responsivo), cada card com:
   - Ícone lucide colorido em gradient
   - Nome do módulo
   - Descrição curta (1 linha)
   - Hover sutil com translate
   Os 24 módulos: **Cockpit, Financeiro, Pedagógico, Alunos, WhatsApp, Kanban, Estoque, Vendas (PDV), Nota Fiscal, RH & Folha, Captação (CRM), Calendário, Cardápio, Transporte, Biblioteca, Berçário, Mural, Portal dos Pais, Relatórios, Frequência, Reservas, Patrimônio, Configurações, LGPD & Auditoria**
6. **Produto** — screenshots/mocks do cockpit, financeiro, pedagógico (use blocos coloridos como placeholders)
7. **Números** — "228 alunos · 12 turmas · R$ 187k faturamento · 94% adimplência" (cards grandes)
8. **Como funciona** — 4 passos: Importa dados → Treina equipe → Opera no dia a dia → Toma decisão com IA
9. **Para quem** — 3 personas: Diretora, Coordenadora pedagógica, Equipe financeira
10. **Depoimentos** — 3 cards de depoimentos com avatar, nome, escola, estrelas
11. **Preços** — 3 planos com toggle Mensal/Anual:
    - **Pequena** (até 80 alunos): R$ 397/mês ou R$ 327/mês anual
    - **Pro** (até 250 alunos, **destaque com ring emerald**): R$ 897/mês ou R$ 747/mês anual
    - **Enterprise** (250+): "Falar com vendas"
    Cada card lista 10 features com check verde / X cinza
12. **FAQ** — accordion com 8 perguntas comuns
13. **CTA Final** — banner full-width verde com "Comece grátis em 60 segundos"
14. **Footer** — colunas (Produto, Empresa, Recursos, Legal), redes sociais, copyright

---

## 🔐 LOGIN (rota `/login`)

**Layout split-screen** (50/50 desktop):
- **Lado esquerdo (desktop only):** fundo gradient `from-emerald-700 via-emerald-800 to-emerald-900`, com:
  - Logo branca no topo
  - Quote/depoimento grande no meio
  - 3 features com checkmarks
  - Bolhas blur emerald flutuantes decorativas
  - Pattern de pontos radial sutil
- **Lado direito (form):**
  - Inputs Email + Senha (com ícones e toggle show/hide)
  - Botão "Entrar" gradient emerald
  - Link "Esqueci minha senha"
  - Divisor "ou" + botão "Continuar como demo" (vai direto pro `/cockpit`)
  - Link pra cadastro

Usuários demo (já gravados): `diretor@escolamodelo.com.br` / `123456`

---

## 🎛 DASHBOARD LAYOUT (rotas `(dashboard)/*`)

### Estrutura (`app/(dashboard)/layout.tsx`)
```
<div flex min-h-screen>
  <Sidebar />              // 260px largura, fixa desktop
  <SidebarDrawer />        // Mobile drawer (slide-in)
  <div flex-1 flex-col>
    <Header />             // 64px altura, sticky, com busca + perfil
    <main p-8>
      <Breadcrumbs />
      {children}
    </main>
  </div>
  <CommandPalette />       // ⌘K — busca fuzzy global
  <QuickActionsFab />      // FAB + canto inferior direito
  <WelcomeModal />         // Tour de 4 passos no 1º acesso
  <ModoApresentacaoToggle />// Toggle "F" pra esconder UI
  <KeyboardShortcuts />    // Mostra "?" pra ver atalhos
</div>
```

### Sidebar (`components/layout/sidebar.tsx`)

Agrupada em **6 seções**, cada uma com título uppercase pequeno cinza:

```
PRINCIPAL
└─ Cockpit (LayoutDashboard)

FINANCEIRO
├─ Financeiro (Banknote)
├─ Vendas (ShoppingCart)
└─ Nota Fiscal (FileText)

PEDAGÓGICO
├─ Pedagógico (GraduationCap)
├─ Alunos (Users)
├─ Kanban (Trello)
├─ Biblioteca (BookOpen)
├─ Berçário (Baby)
├─ Saúde (Heart)
└─ Recados (Megaphone)

OPERACIONAL
├─ Calendário (Calendar)
├─ Cardápio (UtensilsCrossed)
├─ Transporte (Bus)
├─ Estoque (Package)
├─ Reservas (CalendarCheck)
└─ Patrimônio (Building2)

COMUNICAÇÃO
├─ Atendimento [WhatsApp] (MessageSquare)
├─ Mural (Megaphone)
└─ Portal dos Pais (Heart)

GESTÃO
├─ RH & Equipe (Briefcase)
├─ Captação (CRM) (Target)
├─ Relatórios (BarChart3)
└─ Frequência (Activity)

SISTEMA
├─ Super Admin (Shield)
├─ Configurações (Settings)
└─ LGPD & Auditoria (Shield)
```

- Topo da sidebar: **logo "🌱 Escola Modelo"** + nome da escola embaixo
- Itens com hover `bg-accent`, ativo com `bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400`
- **Multi-perfil:** filtra itens visíveis conforme perfil (`diretor`, `coordenador`, `professor`, `financeiro`)
- Mobile: drawer com X pra fechar

### Header (`components/layout/header.tsx`)

- Esquerda: hambúrguer (mobile) + busca rápida (Cmd+K)
- Direita: toggle dark mode, notificações (dropdown com badge), seletor de perfil, avatar+menu

### Componentes globais essenciais
- **Command Palette** (⌘K): dialog com input + lista de comandos navegáveis com setas
- **Quick Actions FAB**: botão flutuante + canto inferior direito, expande em "Novo aluno / Novo evento / Novo aviso"
- **Welcome Modal**: aparece no 1º acesso, tour de 4 passos com next/prev
- **Modo Apresentação**: toggle "F" — esconde sidebar/header/FAB pra focar no conteúdo
- **Keyboard Shortcuts**: tecla "?" mostra modal com todos atalhos
- **Toast**: provider global pra mostrar notificações de sucesso/erro/info
- **Theme Provider**: dark mode com persistência em localStorage
- **Perfil Provider**: contexto com perfil ativo + nome do usuário

---

## 📊 MÓDULO ESTRELA: COCKPIT (`/cockpit`)

Dashboard principal — a "tela do dono". Estrutura:

1. **Cabeçalho** com seletor de mês (anterior / atual / próximo + "Hoje")
2. **Insight do Dia** (card destacado com ícone Sparkles emerald): texto gerado dinamicamente tipo "Você tem 3 famílias prestes a virar inadimplentes — vale ligar hoje"
3. **6 cards de indicadores** (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`):
   - **Faturamento do mês** (R$ formatado BRL)
   - **Recebido** (com % do previsto)
   - **A receber** (mensalidades no prazo)
   - **Inadimplência** (R$ + nº de famílias)
   - **Alunos ativos** (228)
   - **Novas matrículas no mês**
   Cada card: ícone colorido + título + valor grande + variação + descrição + status (verde/amarelo/vermelho) + link pro detalhe
4. **Faturamento Chart** (Recharts AreaChart) — últimos 6 meses, area gradient emerald
5. **Antes vs Depois** — bloco comparativo "Sem Escola Modelo / Com Escola Modelo"
6. **Resumo Pedagógico** — mini-cards de progresso por turma
7. **Alertas List** — lista de alertas críticos (boletos vencidos, eventos próximos, aniversários)

---

## 💰 MÓDULO: FINANCEIRO (`/financeiro`)

Página com **abas** (Tabs do shadcn):

1. **Visão Geral** — KPI Row (4 cards), composição da receita (PieChart), fluxo recente
2. **Mensalidades** — tabela com filtros (status, turma, mês), colunas: Aluno, Responsável, Valor, Vencimento, Status (badge colorido), Ações
3. **Boletos** — geração de boletos, código de barras, envio automático
4. **Régua de Inadimplência** — visualização em timeline dos pontos de contato (1º dia atrasado, 3º, 7º, 15º, 30º)
5. **Conciliação** — match entre extrato bancário e mensalidades
6. **Despesas** — tabela CRUD com categorias (folha, água, luz, aluguel, etc.)
7. **DRE** — Demonstrativo de Resultado (receitas - despesas, com gráfico)
8. **Fluxo de Caixa** — projeção 6 meses (LineChart)
9. **Composição da Receita** — pizza com mensalidades, vendas, eventos

KPIs no topo: Faturamento, Recebido, A Receber, Inadimplência

---

## 🎓 MÓDULO: PEDAGÓGICO (`/pedagogico/[alunoId]`)

**O grande diferencial** — abre detalhes de um aluno com:

1. **Header** com foto, nome, turma, idade
2. **Linha de Evolução** — gráfico de linha mostrando progresso por bimestre nas 5 competências
3. **Radar de Competências** — Recharts RadarChart com 5 eixos: Cognitivo, Socioemocional, Linguagem, Motor, Artístico
4. **Psicogênese da Escrita** — barra de progresso nas 5 fases (Pré-silábica → Silábica → Silábico-alfabética → Alfabética → Ortográfica)
5. **Alerta de Estagnação** — badge vermelho se não evoluiu em 2 bimestres
6. **Observações dos professores** — feed cronológico
7. **Conquistas** — lista de marcos atingidos

---

## 👥 MÓDULO: ALUNOS (`/alunos`)

- Lista com busca + filtros (turma, status, idade)
- Cards com foto, nome, turma, status
- Botão "Nova Matrícula" abre modal multi-step (Dados aluno → Responsáveis → Saúde → Financeiro → Confirmação)
- Click no card → `/alunos/[alunoId]` com ficha completa
- Ficha: dados pessoais, responsáveis, saúde (alergias, medicamentos, plano), histórico, contrato, mensalidades

---

## 💬 MÓDULO: WHATSAPP (`/whatsapp`)

- Lista de grupos por turma (avatar, nome turma, último msg)
- Templates de mensagem (cobrança, lembrete, parabéns)
- Histórico de envios
- Botão "Enviar cobrança automática" pra inadimplentes
- Integração fictícia com WhatsApp Business

---

## 📋 MÓDULO: KANBAN (`/kanban`)

- Quadro com colunas customizáveis (ex: "A fazer", "Em andamento", "Concluído")
- Cards com título, responsável, prazo, prioridade
- Drag-and-drop entre colunas (use @dnd-kit ou react-beautiful-dnd)

---

## 🎯 MÓDULO: CRM CAPTAÇÃO (`/crm`)

- Funil visual de 7 estágios: Lead → Interesse → Visita agendada → Visita feita → Proposta → Matrícula → Perdido
- Cards arrastáveis entre estágios
- Detalhes do lead: contato, origem, próximo follow-up

---

## 📅 MÓDULOS RESTANTES (estrutura padrão)

Para cada um, crie:
- Título da página + breadcrumb
- KPIs em row (3-4 cards)
- Tabela ou grid com CRUD (Criar/Editar/Excluir em modal)
- Botão "+ Novo" no canto superior direito
- Empty state amigável

**Lista dos módulos restantes:**
- **Vendas/PDV** — uniformes, alimentação, eventos. Carrinho lateral. Histórico.
- **Nota Fiscal** — NFS-e listagem, geração, status
- **RH & Folha** — funcionários, salários, férias, holerites
- **Calendário** — visualização mensal com eventos coloridos por tipo
- **Cardápio** — semanal por refeição (café, lanche, almoço, lanche tarde), com restrições
- **Transporte** — rotas, motoristas, monitores, alunos por rota
- **Biblioteca** — acervo, empréstimos, atrasados
- **Berçário** — rotina diária dos bebês (sono, troca, comida, banho)
- **Saúde** — alergias, medicamentos, plano de saúde, ocorrências
- **Recados** — comunicação interna por turma
- **Mural** — feed de comunicados gerais
- **Portal dos Pais** — preview do app para responsáveis
- **Reservas** — auditório, brinquedoteca, salas, calendário
- **Patrimônio** — bens, manutenções, ordens de serviço
- **Frequência** — chamada digital diária, relatório mensal
- **Relatórios** — gerador de PDF (gerenciais, financeiros, pedagógicos)
- **Estoque** — produtos, entrada, saída, alerta de mínimo
- **LGPD & Auditoria** — consentimentos, log de acessos, anonimização
- **Configurações** — escola, usuários, módulos ativos, integrações
- **Super Admin** — toggle de módulos, multi-tenant

---

## 🗄 MOCK DATA REALISTA

Crie em `lib/mock-data/` com seeds da **"Escola Modelo Taubaté"**:

- **228 alunos** ativos, distribuídos em **12 turmas** (Berçário I/II, Maternal I/II/III, Pré I/II)
- **15 funcionários** (diretora, coordenadora, 8 professoras, 2 auxiliares, monitora, motorista, cozinheira)
- **228 mensalidades** do mês atual, valores entre R$ 850-1.450, com mix de status (Paga 75%, A Vencer 15%, Atrasada 10%)
- **12 turmas** com nome, faixa etária, professora responsável, nº alunos
- **30+ eventos** no calendário (reuniões, festas, feriados)
- **50+ leads** no CRM espalhados nos 7 estágios
- **20+ produtos** no estoque (uniformes, livros, lanches)
- **10+ vendas** recentes
- **8+ despesas** mensais recorrentes (aluguel, água, luz, internet, folha)
- **Indicadores cockpit** calculados a partir dos dados

Nomes brasileiros realistas (Maria, João, Ana, Pedro, Beatriz, Lucas, Sofia, Miguel, etc).
CPFs/CNPJs **válidos** mas fictícios.

---

## ⌨️ ATALHOS DE TECLADO

- `⌘K` / `Ctrl+K` — Command Palette
- `?` — Mostra todos atalhos
- `F` — Toggle modo apresentação
- `D` — Toggle dark mode
- `G + C` — Ir pro Cockpit
- `G + A` — Ir pra Alunos
- `G + F` — Ir pra Financeiro
- `N` — Novo (FAB)
- `Esc` — Fechar modais

---

## 🌗 DARK MODE

- Toggle no Header (ícone sol/lua)
- Persistir em `localStorage` com chave `theme`
- Classe `dark` no `<html>`
- Cores definidas via CSS vars (já listadas acima)
- Respeitar `prefers-color-scheme` no 1º acesso

---

## 📱 RESPONSIVIDADE

- **Mobile (< 768px):** sidebar vira drawer, FAB visível, command palette com input expandido
- **Tablet (768-1024px):** sidebar colapsável
- **Desktop (> 1024px):** sidebar fixa 260px

---

## ✅ CRITÉRIOS DE SUCESSO

1. Landing page com **visual de SaaS premium** (Linear / Vercel / Stripe vibes)
2. Dashboard com sidebar + header + main funcionando suave
3. **Cockpit completo** com 6 indicadores, gráfico, insight do dia
4. Pelo menos **5 módulos navegáveis** com mock data
5. Command palette (⌘K) funcionando
6. Dark mode persistente
7. Multi-perfil filtrando itens da sidebar
8. **TUDO em português brasileiro**
9. Mobile responsivo (drawer funcionando)
10. Sem erros de TypeScript ou console

---

## 🚀 ORDEM SUGERIDA DE IMPLEMENTAÇÃO

1. Setup Tailwind + shadcn/ui + cores
2. Layout root + Theme Provider + Perfil Provider
3. Landing page completa (todas seções)
4. Login split-screen
5. Dashboard layout (sidebar + header + breadcrumbs)
6. Cockpit com mock data
7. Command Palette + FAB + Welcome Modal
8. Módulo Financeiro (com abas)
9. Módulo Alunos + Pedagógico
10. Demais módulos (1 por mensagem)

---

## 📝 OBSERVAÇÕES FINAIS

- **Não invente nomes em inglês.** Tudo em PT-BR: "Cockpit", "Mensalidades", "Frequência", "Pedagógico", etc.
- **Use ícones lucide-react sempre.** Nunca emojis dentro do dashboard (só na landing).
- **Formate valores com `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`**
- **Datas no formato brasileiro:** dd/mm/aaaa
- **Use Recharts** pra todos gráficos (AreaChart, LineChart, BarChart, PieChart, RadarChart)
- **Cards com `rounded-xl border bg-card p-5 shadow-sm`** como padrão
- **Botões primários:** `bg-gradient-to-r from-emerald-600 to-emerald-700` com shadow emerald
- **Empty states:** ícone grande cinza + título + descrição + CTA

---

# 🎬 COMECE AGORA

Construa a **landing page completa** e o **dashboard layout com Cockpit funcional** como entregável inicial. Depois eu vou pedindo cada módulo individualmente.

Capricha no visual — quero algo que pareça produto real, não MVP de hackathon.

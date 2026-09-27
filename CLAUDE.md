# CLAUDE.md — PulseRx Frontend

> Arquivo mantido pelo Claude Code. Atualizar sempre que houver mudanças relevantes na arquitetura, dependências, comandos ou decisões de projeto.

> **Rename (2026-09-26):** o projeto se chamava AEVONFIT/AevonFit; agora é **PulseRx** (repo `pulserx-front`). Cobriu textos de UI, chaves de `localStorage` (`pulserx_token`/`pulserx_user`/`pulserx_notif_banner_dismissed` — sessões antigas são deslogadas no próximo deploy) e este `CLAUDE.md`. **Domínio (`environment.prod.ts`, `index.html` canonical/OG/Twitter) continua `aevonfit.aevon.online`** até uma migração dedicada da VPS. **`@aevonfit.com` como domínio de e-mail (placeholder de login, mock `db.json`) é mantido de propósito** — é só o domínio de e-mail interno, não faz parte da marca do produto; não renomear.

> **CI/CD (2026-09-26):** `.github/workflows/ci.yml` (testes + build + `npm audit --omit=dev` + CodeQL) e `.github/dependabot.yml`. Sem lint (nenhum `@angular-eslint` instalado — não incluir step de lint até existir de verdade). **`dependabot.yml` ignora majors de `@angular/*` e `typescript`** (Angular 22, TS 7): PR isolado de um pacote falha no CI por conflito de peer dependency entre core/common/forms/platform-browser/animations; o upgrade precisa ser coordenado via `ng update`. **TEMPORÁRIO: remover o `ignore` junto com o upgrade dedicado do Angular.** Minor/patch vêm agrupados num PR só.

> **v2 — R2-front, plano compartilhado (2026-09-26, branch `feat/v2-r2-plano-compartilhado`):** consome o backend da R2 (`POST/GET /training-plans/shared`). **Modelo:** `TrainingPlan` ganhou `category` (`CORE|LPO|PERFORMANCE`), `scope` (`SHARED|INDIVIDUAL`) e `studentId` agora é `string | null` (plano compartilhado pertence ao coach); `mapPlan` cai em `PERFORMANCE`/`INDIVIDUAL` se a API não mandar. **Coach:** em `/coach/plans` há a seção "Planos compartilhados" (lista + formulário: só Core/LPO — Performance é sempre individual) e o editor abre em `/coach/plan-builder/shared/:planId` reaproveitando o `PlanBuilderComponent` em **modo compartilhado** (`isShared` = sem `studentId` e com `planId`; esconde recordes, tempo de execução e exportar PDF, que são do aluno). **Aluno:** `weekly-view` mostra abas de categoria (Performance/Core/LPO) quando há mais de uma e a `home` soma as sessões de hoje de todas as categorias — lógica pura em `shared/utils/plan-selection.ts` (com spec): o plano compartilhado tem **calendário próprio** (semana contada a partir do `startDate`, igual pra todos), o individual segue `student.currentWeek`. A autorização é do backend (o front só esconde/mostra). **Ainda não há UI** para atribuir assinatura/plano ao aluno nem ligar o bloqueio — é a R3; até lá, com o bloqueio desligado, todo aluno do coach vê os compartilhados publicados.

> **v2 — R3-front, assinaturas manuais (2026-09-27, branch `feat/v2-r3-assinaturas`):** consome o backend da R3 (`/subscription-plans`, `/students/:id/subscription`, `/subscriptions/me`, `/admin/coaches/:id/contract`, `/admin/platform-settings`). **Modelo novo:** `core/models/subscription.model.ts` (`SubscriptionPlan`, `Subscription`, `MySubscription`, `CoachContract`, `PlatformSettings`). Util `shared/utils/currency.ts` (`formatCents`/`reaisToCents`/`centsToReaisInput` — preço trafega em centavos, o formulário usa reais). **Coach:** `/coach/subscriptions` (novo item "Assinaturas" no menu) — CRUD do catálogo (nome, descrição, preço, categorias, Free, ativo); em `/coach/students`, cada aluno ganhou o botão "Assinatura" (modal: carrega o catálogo uma vez e a assinatura do aluno sob demanda, atribui/troca/remove — sempre pelo `studentId` da lista do próprio coach, nunca id digitado). **Admin:** `/admin/coaches` ganhou o bloco de bloqueio por assinatura (liga/desliga `enforceSubscriptionAccess`; ligar com alunos sem acesso pede confirmação nativa do navegador mostrando a contagem) e "Contrato" por coach (% da plataforma, expansível na lista). **Aluno:** menu do avatar → "Minha Assinatura" (`/athlete/subscription`) mostra o próprio plano/status/categorias liberadas — sem parâmetro de URL, sempre `/subscriptions/me`. A autorização é toda do backend; o front só chama os endpoints com os IDs que já tem em mão (sessão/lista carregada), nunca aceita ID de rota para essas ações.

> **Cobertura de testes (2026-09-27, PR #55):** decisão combinada com o dono — o alvo de 100% é só a **lógica** (`.ts` de componentes/services/guards/interceptors/utils), **não o HTML dos templates**. O builder novo do Angular (`@angular/build:unit-test` + Vitest + v8) rastreia o template compilado de volta pro `.html` como cobertura separada; bater 100% ali exigiria renderizar cada componente e forçar cada `@if`/`@for`, um tipo de teste bem mais pesado. Rodar cobertura: `npx ng test --watch=false --coverage --coverage-reporters=text --coverage-exclude="**/*.html"` (precisa de `@vitest/coverage-v8` instalado — `npm install -D @vitest/coverage-v8@4.0.8`, mesma versão do `vitest` já usado). Achado: toda classe `@Component` decorada reporta 1 linha "descoberta" na própria linha da declaração (código gerado pelo Angular, não coberto por teste possível — mesmo fenômeno documentado no backend pra `@Injectable`). Padrão de teste: instanciação direta (`new Component(apiMock as any)`), sem `TestBed` a menos que o componente use `inject()` (aí precisa de `TestBed.runInInjectionContext`); mocks com `vi.fn()`; `vi.mock()` de dependências de terceiro (ex.: `socket.io-client`, `jspdf`) precisa de `vi.resetModules()` + import dinâmico dentro do teste se outro arquivo do projeto importa a mesma dependência sem mock — senão vira flaky dependente da ordem de execução dos arquivos no CI (só reproduz lá, nunca local).

> **Cloudinary + Resend, landing page pública do coach + cancelamento de assinatura (2026-09-27, PR #58):** consome o backend novo (`coach-profile`, `DELETE /subscriptions/me`). **Coach:** `/coach/landing-page` (item "Minha Página" no menu) — formulário de slug/bio, upload de banner (`<input type="file" accept="image/jpeg,image/png,image/webp">`, limite 5MB no próprio componente antes de enviar), botão publicar/despublicar, link público mostrado assim que o slug é salvo. **Público:** `/c/:slug` — rota **sem guard nem shell** (fora de `/coach`, `/athlete`, `/admin`), qualquer visitante acessa; mostra banner/bio/planos ativos do coach e um CTA que abre formulário de contato (nome/e-mail/telefone/mensagem) — vira lead no backend, **nunca cria conta**. **Aluno:** botão "Cancelar assinatura" em `/athlete/subscription` (`confirm()` nativo do navegador, mesmo padrão já usado no bloqueio do admin).

> **Landing page v2 — hero completo, depoimentos e FAQ (2026-09-27, PR #59):** a pedido do dono, a partir de uma referência visual de página de vendas. **Decisão de escopo (documentada no código, não presumir dado nenhum sem confirmar):** o "preview de app" e a grade de "diferenciais do método" da referência viraram **conteúdo fixo no template** (`coach-landing.component.html`), igual pra todo coach — não são campo editável. Editor (`landing-page.component`) ganhou campos novos (headline/subheadline/quote/credencial/anos/atletas/NPS/conclusão/WhatsApp/vídeo), upload de foto pessoal (separado do banner) e CRUD inline de depoimentos e FAQ (formulário abre/fecha, cria ou edita conforme `editingTestimonialId()`/`editingFaqId()`, `confirm()` nativo antes de remover). Página pública redesenhada: nav com âncoras, hero com headline/subheadline configuráveis (fallback pro texto padrão se vazios), vídeo de demonstração reaproveitando `YoutubeEmbedComponent` (não duplicou lógica de sanitização), seção "Sobre o coach", cards de planos com o do meio destacado quando há exatamente 3 (`isFeaturedPlan`, puramente visual, sem campo novo no back), depoimentos com NPS/conclusão, FAQ em `<details>` nativo (accordion sem JS). `whatsappLink` monta `wa.me/` removendo tudo que não é dígito do número antes de virar URL.

## Visão Geral

**PulseRx** é uma plataforma SaaS para gestão de academias. O frontend é construído em Angular 21 e consome dados mock (json-server) — o backend real NestJS será integrado posteriormente.

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Angular 21 (standalone components, signals) |
| Linguagem | TypeScript 5.9 |
| Estilos | TailwindCSS v4 + SCSS |
| HTTP | HttpClient (Angular) |
| Roteamento | Angular Router (lazy-loaded) |
| Formulários | Reactive Forms |
| Notificações | ngx-toastr |
| Mock backend | json-server (porta 3001) |
| Build | @angular/build (esbuild) |
| Gerenciador de pacotes | npm |

## Configuração Tailwind v4

> **Importante:** Angular 21 só lê `postcss.config.json` (JSON, não `.js`). O Tailwind v4 não usa `tailwind.config.js` — a configuração de tema fica em `src/styles.scss` via `@theme {}`. Não criar `tailwind.config.js` pois o Angular build detecta e tenta usar `tailwindcss` como plugin PostCSS (comportamento v3), o que quebra o build.

- Configuração PostCSS: `postcss.config.json` → `@tailwindcss/postcss`
- Tokens de tema: `src/styles.scss` no bloco `@theme {}`

## Estrutura de Diretórios

```
src/
├── app/
│   ├── app.ts / app.config.ts / app.routes.ts
│   ├── core/
│   │   ├── models/          # User, Student, TrainingPlan, Session, Exercise...
│   │   ├── services/
│   │   │   ├── auth.service.ts       # Auth mock (signal currentUser)
│   │   │   └── mock-data.service.ts  # Dados do db.json via HttpClient
│   │   └── guards/
│   │       └── auth.guard.ts  # authGuard, coachGuard, athleteGuard
│   ├── features/
│   │   ├── auth/login/              # /login — toggle Coach/Atleta
│   │   ├── coach/
│   │   │   ├── dashboard/           # /coach/dashboard
│   │   │   ├── students/            # /coach/students
│   │   │   ├── messages/            # /coach/messages
│   │   │   └── plan-builder/        # /coach/plan-builder/:studentId
│   │   └── athlete/
│   │       ├── home/                # /athlete/home
│   │       ├── weekly-view/         # /athlete/weekly
│   │       ├── session-detail/      # /athlete/session/:sessionId
│   │       ├── active-workout/      # /athlete/active/:sessionId
│   │       ├── history/             # /athlete/history
│   │       └── messages/            # /athlete/messages
│   └── layout/
│       ├── coach-shell/    # Sidebar + router-outlet (desktop)
│       └── athlete-shell/  # Header + bottom nav + router-outlet (mobile)
└── assets/mock/
    └── db.json             # Dados mock completos (usuários, planos, treinos)
```

## Comandos Principais

```bash
# Desenvolvimento
npm start                      # ng serve → http://localhost:4200

# Mock backend (porta 3001, necessário para dados)
npm run mock:server            # json-server com db.json

# Build de produção
npm run build

# Testes
npm test
```

## Credenciais Mock

| Perfil | Email | Senha |
|--------|-------|-------|
| Coach | luan@aevonfit.com | coach123 |
| Atleta | gustavo@aevonfit.com | athlete123 |

## Decisões Arquiteturais

- **Standalone components**: todos os componentes são standalone (sem NgModules)
- **Signals**: estado local via `signal()` e `computed()` do Angular 17+
- **Lazy loading**: todas as rotas carregam componentes com `loadComponent`
- **Guards funcionais**: `authGuard`, `coachGuard`, `athleteGuard` como `CanActivateFn`
- **ApiService**: HttpClient real apontando para `http://localhost:3000/api`
- **AuthService**: JWT armazenado em `localStorage`; conecta `SocketService` no login e desconecta no logout; pede permissão de notificação do browser
- **SocketService**: singleton, conecta ao namespace `/messages` via socket.io-client; expõe `newMessage$: Subject<ChatMessage>`; dispara Web Notification quando aba não está em foco
- **Design**: tema "Brutalismo Cinético" — dark, laranja elétrico, tipografia Lexend + Inter
- **Mobile-first**: AthleteShell limitado a `max-w-md` centralizado; CoachShell é desktop com sidebar
- **Coach messages layout**: componente usa `:host { flex: 1 }` no SCSS para preencher o `<main>` do CoachShell

## Paleta de Cores

| Token CSS | Valor | Uso |
|-----------|-------|-----|
| `--color-bg` | `#0D0D0D` | Fundo principal |
| `--color-surface` | `#1A1A1A` | Cards, panels |
| `--color-primary` | `#FF6B00` | Laranja elétrico — CTAs, destaques |
| `--color-text` | `#FFFFFF` | Texto principal |
| `--color-text-secondary` | `#A0A0A0` | Labels, descrições |
| `--color-tertiary` | `#A855F7` | Insights de IA (roxo) |

## Convenções de Código

- Formulários: sempre inicializar no `constructor()`, nunca como class field usando `this.fb` (TS2729)
- SVG binding: usar `[attr.stroke-dasharray]` em vez de interpolação `{{ }}`
- Array indexing em templates: usar `.at(i)` em vez de `[i]` para evitar `Object possibly undefined`
- Botões fora de form: sempre `type="button"` para acessibilidade

---

_Última atualização: 2026-09-27 (2) — landing page v2: hero completo, credenciais, depoimentos e FAQ (PR #59). Anterior: 2026-09-27 — landing page pública do coach (`/c/:slug`) + cancelamento de assinatura (PR #58), cobertura de testes de lógica em core/services/guards/utils (PR #55). Anterior: 2026-09-26 — rename AEVONFIT → PulseRx (UI, localStorage, docs; VPS/domínio/e-mail ficam para depois). Anterior: 2026-04-17 — Mensagens real-time (WebSocket + notificações browser), badge de não lidas na nav_

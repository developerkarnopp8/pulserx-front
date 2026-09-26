# CLAUDE.md — PulseRx Frontend

> Arquivo mantido pelo Claude Code. Atualizar sempre que houver mudanças relevantes na arquitetura, dependências, comandos ou decisões de projeto.

> **Rename (2026-09-26):** o projeto se chamava AEVONFIT/AevonFit; agora é **PulseRx** (repo `pulserx-front`). Cobriu textos de UI, chaves de `localStorage` (`pulserx_token`/`pulserx_user`/`pulserx_notif_banner_dismissed` — sessões antigas são deslogadas no próximo deploy) e este `CLAUDE.md`. **Domínio (`environment.prod.ts`, `index.html` canonical/OG/Twitter) continua `aevonfit.aevon.online`** até uma migração dedicada da VPS. **`@aevonfit.com` como domínio de e-mail (placeholder de login, mock `db.json`) é mantido de propósito** — é só o domínio de e-mail interno, não faz parte da marca do produto; não renomear.

> **CI/CD (2026-09-26):** `.github/workflows/ci.yml` (testes + build + `npm audit --omit=dev` + CodeQL) e `.github/dependabot.yml`. Sem lint (nenhum `@angular-eslint` instalado — não incluir step de lint até existir de verdade). **`dependabot.yml` ignora majors de `@angular/*` e `typescript`** (Angular 22, TS 7): PR isolado de um pacote falha no CI por conflito de peer dependency entre core/common/forms/platform-browser/animations; o upgrade precisa ser coordenado via `ng update`. **TEMPORÁRIO: remover o `ignore` junto com o upgrade dedicado do Angular.** Minor/patch vêm agrupados num PR só.

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

_Última atualização: 2026-09-26 — rename AEVONFIT → PulseRx (UI, localStorage, docs; VPS/domínio/e-mail ficam para depois). Anterior: 2026-04-17 — Mensagens real-time (WebSocket + notificações browser), badge de não lidas na nav_

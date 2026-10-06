# CLAUDE.md — PulseRx Frontend

> Arquivo mantido pelo Claude Code. Atualizar sempre que houver mudanças relevantes na arquitetura, dependências, comandos ou decisões de projeto.

> **Rename (2026-09-26):** o projeto se chamava AEVONFIT/AevonFit; agora é **PulseRx** (repo `pulserx-front`). Cobriu textos de UI, chaves de `localStorage` (`pulserx_token`/`pulserx_user`/`pulserx_notif_banner_dismissed` — sessões antigas são deslogadas no próximo deploy) e este `CLAUDE.md`. **Domínio migrado para `pulserx.com.br` em 2026-10-06** (`environment.prod.ts`, `index.html` canonical/OG/Twitter, `robots.txt`, `sitemap.xml`); `aevonfit.aevon.online` redireciona para lá. **`@aevonfit.com` como domínio de e-mail (placeholder de login, mock `db.json`) é mantido de propósito** — é só o domínio de e-mail interno, não faz parte da marca do produto; não renomear.

> **CI/CD (2026-09-26):** `.github/workflows/ci.yml` (testes + build + `npm audit --omit=dev` + CodeQL) e `.github/dependabot.yml`. Sem lint (nenhum `@angular-eslint` instalado — não incluir step de lint até existir de verdade). **`dependabot.yml` ignora majors de `@angular/*` e `typescript`** (Angular 22, TS 7): PR isolado de um pacote falha no CI por conflito de peer dependency entre core/common/forms/platform-browser/animations; o upgrade precisa ser coordenado via `ng update`. **TEMPORÁRIO: remover o `ignore` junto com o upgrade dedicado do Angular.** Minor/patch vêm agrupados num PR só.

> **v2 — R2-front, plano compartilhado (2026-09-26, branch `feat/v2-r2-plano-compartilhado`):** consome o backend da R2 (`POST/GET /training-plans/shared`). **Modelo:** `TrainingPlan` ganhou `category` (`CORE|LPO|PERFORMANCE`), `scope` (`SHARED|INDIVIDUAL`) e `studentId` agora é `string | null` (plano compartilhado pertence ao coach); `mapPlan` cai em `PERFORMANCE`/`INDIVIDUAL` se a API não mandar. **Coach:** em `/coach/plans` há a seção "Planos compartilhados" (lista + formulário: só Core/LPO — Performance é sempre individual) e o editor abre em `/coach/plan-builder/shared/:planId` reaproveitando o `PlanBuilderComponent` em **modo compartilhado** (`isShared` = sem `studentId` e com `planId`; esconde recordes, tempo de execução e exportar PDF, que são do aluno). **Aluno:** `weekly-view` mostra abas de categoria (Performance/Core/LPO) quando há mais de uma e a `home` soma as sessões de hoje de todas as categorias — lógica pura em `shared/utils/plan-selection.ts` (com spec): o plano compartilhado tem **calendário próprio** (semana contada a partir do `startDate`, igual pra todos), o individual segue `student.currentWeek`. A autorização é do backend (o front só esconde/mostra). **Ainda não há UI** para atribuir assinatura/plano ao aluno nem ligar o bloqueio — é a R3; até lá, com o bloqueio desligado, todo aluno do coach vê os compartilhados publicados.

> **v2 — R3-front, assinaturas manuais (2026-09-27, branch `feat/v2-r3-assinaturas`):** consome o backend da R3 (`/subscription-plans`, `/students/:id/subscription`, `/subscriptions/me`, `/admin/coaches/:id/contract`, `/admin/platform-settings`). **Modelo novo:** `core/models/subscription.model.ts` (`SubscriptionPlan`, `Subscription`, `MySubscription`, `CoachContract`, `PlatformSettings`). Util `shared/utils/currency.ts` (`formatCents`/`reaisToCents`/`centsToReaisInput` — preço trafega em centavos, o formulário usa reais). **Coach:** `/coach/subscriptions` (novo item "Assinaturas" no menu) — CRUD do catálogo (nome, descrição, preço, categorias, Free, ativo); em `/coach/students`, cada aluno ganhou o botão "Assinatura" (modal: carrega o catálogo uma vez e a assinatura do aluno sob demanda, atribui/troca/remove — sempre pelo `studentId` da lista do próprio coach, nunca id digitado). **Admin:** `/admin/coaches` ganhou o bloco de bloqueio por assinatura (liga/desliga `enforceSubscriptionAccess`; ligar com alunos sem acesso pede confirmação nativa do navegador mostrando a contagem) e "Contrato" por coach (% da plataforma, expansível na lista). **Aluno:** menu do avatar → "Minha Assinatura" (`/athlete/subscription`) mostra o próprio plano/status/categorias liberadas — sem parâmetro de URL, sempre `/subscriptions/me`. A autorização é toda do backend; o front só chama os endpoints com os IDs que já tem em mão (sessão/lista carregada), nunca aceita ID de rota para essas ações.

> **Cobertura de testes (2026-09-27, PR #55):** decisão combinada com o dono — o alvo de 100% é só a **lógica** (`.ts` de componentes/services/guards/interceptors/utils), **não o HTML dos templates**. O builder novo do Angular (`@angular/build:unit-test` + Vitest + v8) rastreia o template compilado de volta pro `.html` como cobertura separada; bater 100% ali exigiria renderizar cada componente e forçar cada `@if`/`@for`, um tipo de teste bem mais pesado. Rodar cobertura: `npx ng test --watch=false --coverage --coverage-reporters=text --coverage-exclude="**/*.html"` (precisa de `@vitest/coverage-v8` instalado — `npm install -D @vitest/coverage-v8@4.0.8`, mesma versão do `vitest` já usado). Achado: toda classe `@Component` decorada reporta 1 linha "descoberta" na própria linha da declaração (código gerado pelo Angular, não coberto por teste possível — mesmo fenômeno documentado no backend pra `@Injectable`). Padrão de teste: instanciação direta (`new Component(apiMock as any)`), sem `TestBed` a menos que o componente use `inject()` (aí precisa de `TestBed.runInInjectionContext`); mocks com `vi.fn()`; `vi.mock()` de dependências de terceiro (ex.: `socket.io-client`, `jspdf`) precisa de `vi.resetModules()` + import dinâmico dentro do teste se outro arquivo do projeto importa a mesma dependência sem mock — senão vira flaky dependente da ordem de execução dos arquivos no CI (só reproduz lá, nunca local).

> **Cloudinary + Resend, landing page pública do coach + cancelamento de assinatura (2026-09-27, PR #58):** consome o backend novo (`coach-profile`, `DELETE /subscriptions/me`). **Coach:** `/coach/landing-page` (item "Minha Página" no menu) — formulário de slug/bio, upload de banner (`<input type="file" accept="image/jpeg,image/png,image/webp">`, limite 5MB no próprio componente antes de enviar), botão publicar/despublicar, link público mostrado assim que o slug é salvo. **Público:** `/c/:slug` — rota **sem guard nem shell** (fora de `/coach`, `/athlete`, `/admin`), qualquer visitante acessa; mostra banner/bio/planos ativos do coach e um CTA que abre formulário de contato (nome/e-mail/telefone/mensagem) — vira lead no backend, **nunca cria conta**. **Aluno:** botão "Cancelar assinatura" em `/athlete/subscription` (`confirm()` nativo do navegador, mesmo padrão já usado no bloqueio do admin).

> **Landing page v2 — hero completo, depoimentos e FAQ (2026-09-27, PR #59):** a pedido do dono, a partir de uma referência visual de página de vendas. **Decisão de escopo (documentada no código, não presumir dado nenhum sem confirmar):** o "preview de app" e a grade de "diferenciais do método" da referência viraram **conteúdo fixo no template** (`coach-landing.component.html`), igual pra todo coach — não são campo editável. Editor (`landing-page.component`) ganhou campos novos (headline/subheadline/quote/credencial/anos/atletas/NPS/conclusão/WhatsApp/vídeo), upload de foto pessoal (separado do banner) e CRUD inline de depoimentos e FAQ (formulário abre/fecha, cria ou edita conforme `editingTestimonialId()`/`editingFaqId()`, `confirm()` nativo antes de remover). Página pública redesenhada: nav com âncoras, hero com headline/subheadline configuráveis (fallback pro texto padrão se vazios), vídeo de demonstração reaproveitando `YoutubeEmbedComponent` (não duplicou lógica de sanitização), seção "Sobre o coach", cards de planos com o do meio destacado quando há exatamente 3 (`isFeaturedPlan`, puramente visual, sem campo novo no back), depoimentos com NPS/conclusão, FAQ em `<details>` nativo (accordion sem JS). `whatsappLink` monta `wa.me/` removendo tudo que não é dígito do número antes de virar URL.

> **Fix: botões da landing pública mandavam pro login (2026-09-28):** achado pelo dono testando `/c/:slug` — clicar em QUALQUER âncora da página (`#planos`, `#contato`, `#sobre`, `#faq`) redirecionava pra `/login`. Causa raiz: com `<base href="/">` (obrigatório pro roteamento do Angular), um `<a href="#id">` **sem caminho explícito** resolve pra `/#id` (raiz do site), não pra `/c/slug#id` — porque `<base>` sobrescreve a resolução de QUALQUER link relativo da página, inclusive só-fragmento. `/#id` cai na rota `{ path: '', redirectTo: 'login' }` (primeira do `app.routes.ts`), que preserva o fragmento no redirect — por isso o padrão exato era `/login#id`. **Corrigido em `coach-landing.component.ts`/`.html`**: todo `href="#id"` ganhou `(click)="scrollToSection('id', $event)"` (`preventDefault` + `scrollIntoView` nativo), sem tocar na URL/no Router. Verificado que não existe o mesmo padrão em nenhum outro `.html` do projeto (`grep href="#"` só retornava esses). **Se algum componente novo tiver navegação por âncora same-page, usar esse mesmo padrão — nunca `href="#id"` puro.**

> **LGPD — consentimento de saúde + aceite dos termos (2026-09-30, branch `feat-consentimento-saude`):** consome `/consents` do backend.
> Tela `/consentimento` (`features/athlete/consent`): aceite dos termos + Sim/Não sobre dados de saúde; aceitar abre a **sessão nova** que a API
> devolve. `consentGuard` nas rotas do aluno (`AuthService.needsConsent()`: termos pendentes ou saúde sem resposta) e o `jwtInterceptor` leva
> para lá ao receber 403 `TERMS_PENDING` (agora usa `inject()` — o spec roda em `TestBed.runInInjectionContext`). Modal de pulo esconde "Lesão /
> dor" e a observação sem consentimento e **só envia a observação visível**; Perfil (`/athlete/subscription`) tem "Dados de saúde" (retirar pede
> confirmação); chat do aluno mostra aviso a quem não consentiu; inscrição pública ganhou a caixa opcional (desmarcada). `AuthService.updateUser`
> atualiza o usuário salvo sem trocar o token. Textos legais atualizados (`LEGAL_LAST_UPDATED = 30/09/2026`). Atenção: o lcov do builder novo
> **omite** código que nenhum teste importa (em vez de mostrar 0%) — conferir cobertura por arquivo novo, não só pelo total.

> **LGPD item 3 — desvincular e excluir conta (2026-09-30, branch `feat-lgpd-exclusao-termo-coach`):** na lista de alunos o coach
> **desvincula** (`api.unlinkStudent`, confirmação explicando que a conta não é apagada; erro aparece acima da lista). Componente
> `shared/components/delete-account` ("Excluir minha conta": senha + caixa de confirmação) no Perfil e na página `/conta-encerrada`
> (`features/athlete/account-closed`, para onde o `jwtInterceptor` leva ao receber 403 `UNLINKED`; 401 "Sessão encerrada" faz logout).
> Admin: `features/admin/athlete-deletion` (busca por e-mail exato + excluir) dentro da tela de coaches. Política cita o caminho no app.

> **Confirmações e mensagens de erro (pedido do dono, 2026-09-30 — "popup feio", "mensagens de erro não estão legais"):**
> - **Nunca `confirm()` do navegador.** Usar `confirmDialog.ask({ title, message, confirmLabel, cancelLabel?, danger? })`
>   (`shared/components/confirm-dialog`) — devolve `Promise<boolean>`, o método vira `async`. É um objeto único sem injeção (não muda
>   construtores); o `<app-confirm-dialog />` fica na raiz (`app.ts`); Esc/clicar fora = "não". Botão de desistir padrão é "Voltar"
>   (nunca "Cancelar", que confunde com "cancelar assinatura"). Teste: `vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true)` + `await`
>   no método + `afterEach(() => vi.restoreAllMocks())`.
> - **Erro de API sempre por `apiMessage(err, fallback)`** (`shared/utils/signup-flow.ts`), nunca `err.message`/`err.error.message` cru: ela
>   descarta textos padrão em inglês do Nest/Angular ("Http failure response…", "Unauthorized", "ThrottlerException", validação "x must be…")
>   e dá frase própria para sem conexão (0), 429, 401 e 403. Login usa `loginErrorMessage` (401 = "E-mail ou senha incorretos.").
> - Senha gerada pelo admin (criar coach/resetar) tem botão **"Copiar e-mail e senha"** (texto pronto para mandar ao coach).

> **LGPD item 4 — Termo do Coach (2026-09-30, branch `feat-lgpd-termo-coach`):** texto em `legal-content.ts` (doc `termo-coach`, também
> público em `/termo-coach`; rascunho para advogado). Tela `/aceite-coach` (`features/coach/coach-terms`: texto + "Li e aceito" → sessão nova
> → `/coach/dashboard`). `coachTermsGuard` no shell do coach (`AuthService.needsCoachTerms()`: coach com `termsPending !== false`) e o
> `jwtInterceptor` leva para lá ao receber 403 `COACH_TERMS_PENDING`.

> **Admin — Financeiro (2026-09-30, branch `feat-admin-financeiro-coach`):** página `/admin/financeiro` (`features/admin/financial`,
> item "Financeiro" no menu do admin): abas dos 6 meses, cartões do mês (bruto, taxa Asaas, AEVON, coaches), tabela por coach (quem mais
> movimentou primeiro) e histórico da plataforma; aviso quando há cobrança sem líquido do Asaas. Na tela de coaches, botão "Contrato · X%"
> (vermelho com "(definir)" em 0%) e aviso de que o % só vale para assinaturas novas.
>
> **Admin — Coaches reorganizado (PR 2, dono achou o layout quebrado):** linha em grade de colunas fixas (Coach+alertas | Alunos | % AEVON |
> Repasse | Contrato | detalhes), cabeçalho das colunas no computador, empilha no celular. Botão de contrato "Contrato X%"/"Definir %".
> "Detalhes" abre Assinaturas (MRR), Uso e Conta (interruptor de importação por IA e Resetar senha, que saíram da linha). **Admin shell**
> agora tem altura fixa (`h-screen`) e a rolagem fica no `<main>` — antes só Coaches rolava.

> **Senha por e-mail (2026-09-30, branch `feat-senha-por-email`):** telas públicas `/esqueci-senha` (resposta genérica) e `/redefinir-senha`
> (token lido do fragmento `#token=` por `tokenFromHash` e APAGADO da barra de endereço com `history.replaceState`; senha ≥ 8 + confirmação).
> Link "Esqueci minha senha" no login. Coach: botão "Enviar link de nova senha" (ícone `lock_reset`) na lista de alunos, com `confirmDialog`.
>
> **Confirmação de e-mail + "crie sua senha" (2026-09-30, branch `feat-confirmar-email`):** inscrição da landing termina no passo **"Confirme
> seu e-mail"** (sem sessão; botão "Reenviar o e-mail"). Página pública **`/confirmar-email`**: lê `#token=…&c=<slug>&plano=<id>`, apaga da
> barra, e **só confirma no clique** (antivírus de e-mail que abre links não gasta o link de uso único); depois vai para `/c/<slug>/assinar/<id>`
> — `continuePathFromHash` só aceita slug kebab-case ≤ 60 e plano UUID (nada do fragmento vira URL livre) — ou para a tela inicial do papel.
> Login: 403 `EMAIL_NOT_VERIFIED` (`isEmailNotVerified`) mostra "Reenviar o e-mail de confirmação". Cadastro de aluno pelo coach **sem campo de
> senha** (aviso de que o link foi enviado). Admin: criar coach e "Enviar link de nova senha" só mostram aviso de e-mail enviado — **acabou a
> senha revelada/copiar**. Layout mobile do admin (lista de coaches e Financeiro) com margem menor, alertas compactos e números em 3 colunas.

> **Cartão com débito automático (2026-09-30, branch `feat-cartao-debito-automatico`):** tela Assinatura mostra "Débito automático no cartão
> <Bandeira> final 1234" (`autoDebitCard` do `/subscriptions/me`, bandeira por `shared/utils/card-brand.ts`) ou avisa que pagar com cartão
> ativa o débito automático; mesmo aviso no passo de pagamento da inscrição e nos Termos (item 4).

> **Inscrição sem senha (2026-09-30, branch `fix-senha-no-link-de-confirmacao`):** o formulário da landing só pede nome, e-mail e aceites;
> `/confirmar-email` virou "Confirmar e-mail e criar senha" (senha + repetir, validador `senhasIguais` exportado do reset) e envia
> `{token, password}`.

> **Estorno/contestação (2026-09-30, branch `feat-estorno-contestacao`):** `GatewayPaymentStatus` ganhou `refunded` ("Estornada") e
> `chargeback` ("Contestada"); `GATEWAY_PAYMENT_STATUS_ICON`, `isOpenGatewayPayment` (só pending/overdue entram em "próxima cobrança") e
> `isReversedGatewayPayment` (Financeiro do coach risca o líquido) em `core/models/subscription.model.ts`.

> **Free e acesso (2026-10-01, branch `feat-regras-acesso-free-carencia`):** `Week.locked` (semana fora da amostra do Free) — cadeado na pílula
> da semana e cartão "Esta semana é para assinantes" na tela da semana; início mostra "O treino desta semana é para assinantes"
> (`todayWeekLocked`). Tela Assinatura mostra o prazo da tolerância do inadimplente e o acesso pausado por contestação (`accessNotice`).
> **Cartão recusado (2026-10-01, branch `feat-cartao-recusado`):** tela Assinatura mostra o aviso "Não conseguimos cobrar no seu cartão" com
> "Pagar fatura" (`refusedCharge`, só link https); Financeiro do coach marca "Cartão recusado"; notificação `card_refused` com ícone; legendas
> no Financeiro do coach e do admin: cartão conta como pago quando aprovado, o dinheiro cai no prazo do Asaas.

> **Redesign — telas de acesso no modelo Stitch mo01 (2026-10-01, branch `feat-redesign-telas-acesso`; modelos em `PulseRx/layout/mo01`):**
> molde comum `shared/components/auth-shell` (cabeçalho PULSE RX + "Conexão segura", cartão central, rodapé Termos/Privacidade/Cookies) e
> bloco comum `shared/components/new-password-fields` (senha + repetir, critério real de 8 caracteres marcado ao vivo). Decisões do dono: só
> texto verdadeiro (os textos técnicos inventados pelo Stitch — "256-BIT SSL", versão, latência, suporte 24/7, e-mail inexistente, app de loja —
> ficaram de fora); **login sem escolher Coach/Atleta** (`AuthService.login` aceita lista de perfis: `['coach','athlete']` no comum,
> `['admin']` em /login/root; devolve o usuário e a tela navega pelo perfil); senha continua mínimo 8; confirmação continua por link e mostra o
> plano e o coach reais (`signupTargetFromHash` + `GET /public/coaches/:slug`; falhou = sem o cartão).

> **Manual do coach (2026-10-06, branch `feat-manual-coach`):** texto ÚNICO em `features/help/coach-manual.ts` → página **Ajuda**
> (`/coach/ajuda`, item no menu, botão "Baixar PDF") e versão clara pública **`/manual-coach`** (sem login; é dela que sai o PDF).
> **Mudou o texto? Gere o PDF de novo:** `npx ng serve --port 4300` e
> `google-chrome --headless=new --no-sandbox --virtual-time-budget=8000 --no-pdf-header-footer --print-to-pdf=public/manual-coach-pulserx.pdf http://localhost:4300/manual-coach`
> (A4 e título vêm do componente; o aviso de cookies tem `print:hidden`). Só texto verdadeiro — conferir cada passo na tela antes.

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

_Última atualização: 2026-09-28 — fix: botões da landing pública (`/c/:slug`) mandavam pro login por causa do `<base href="/">` quebrando `href="#id"` sem caminho explícito; trocado por `scrollToSection` com `preventDefault`. Anterior: 2026-09-27 (2) — landing page v2: hero completo, credenciais, depoimentos e FAQ (PR #59). Anterior: 2026-09-27 — landing page pública do coach (`/c/:slug`) + cancelamento de assinatura (PR #58), cobertura de testes de lógica em core/services/guards/utils (PR #55). Anterior: 2026-09-26 — rename AEVONFIT → PulseRx (UI, localStorage, docs; VPS/domínio/e-mail ficam para depois). Anterior: 2026-04-17 — Mensagens real-time (WebSocket + notificações browser), badge de não lidas na nav_

import { Routes } from '@angular/router';
import { authGuard, coachGuard, athleteGuard, adminGuard, consentGuard, coachTermsGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  // Senha por link no e-mail (públicas, sem guard).
  {
    path: 'esqueci-senha',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'redefinir-senha',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'confirmar-email',
    loadComponent: () =>
      import('./features/auth/confirm-email/confirm-email.component').then(m => m.ConfirmEmailComponent)
  },
  // Acesso do admin (dono): nunca linkado na UI pública — não aparece como opção na tela de
  // login normal, só quem sabe esta URL entra.
  {
    path: 'login/root',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
    data: { rootOnly: true },
  },

  {
    path: 'coach',
    loadComponent: () =>
      import('./layout/coach-shell/coach-shell.component').then(m => m.CoachShellComponent),
    canActivate: [authGuard, coachGuard, coachTermsGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/coach/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/coach/students/students.component').then(m => m.StudentsComponent)
      },
      {
        path: 'plans',
        loadComponent: () =>
          import('./features/coach/plans/plans.component').then(m => m.PlansComponent)
      },
      {
        path: 'plan-builder/shared/:planId',
        loadComponent: () =>
          import('./features/coach/plan-builder/plan-builder.component').then(m => m.PlanBuilderComponent),
      },
      {
        path: 'plan-builder/:studentId',
        loadComponent: () =>
          import('./features/coach/plan-builder/plan-builder.component').then(m => m.PlanBuilderComponent),
        data: { queryParamsHandling: 'merge' },
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./features/coach/library/library.component').then(m => m.LibraryComponent)
      },
      {
        path: 'financial',
        loadComponent: () =>
          import('./features/coach/financial/financial.component').then(m => m.FinancialComponent)
      },
      {
        path: 'subscriptions',
        loadComponent: () =>
          import('./features/coach/subscriptions/subscriptions.component').then(m => m.CoachSubscriptionsComponent)
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/coach/messages/messages.component').then(m => m.CoachMessagesComponent)
      },
      {
        path: 'landing-page',
        loadComponent: () =>
          import('./features/coach/landing-page/landing-page.component').then(m => m.LandingPageComponent)
      },
      {
        path: 'ajuda',
        loadComponent: () =>
          import('./features/help/coach-manual.component').then(m => m.CoachManualComponent)
      }
    ]
  },

  // Aceite dos termos atuais + resposta sobre dados de saúde (LGPD), antes da área do aluno.
  // Termo do Coach (LGPD): aceite antes do painel.
  {
    path: 'aceite-coach',
    loadComponent: () => import('./features/coach/coach-terms/coach-terms.component').then(m => m.CoachTermsComponent),
    canActivate: [authGuard, coachGuard],
  },
  // O coach desvinculou o aluno: só sair ou excluir a conta (LGPD).
  {
    path: 'conta-encerrada',
    loadComponent: () => import('./features/athlete/account-closed/account-closed.component').then(m => m.AccountClosedComponent),
    canActivate: [authGuard, athleteGuard],
  },
  // Pagar com PIX dentro do app e assinatura ativa (fora do shell do aluno: são o fim da inscrição, antes de entrar no app).
  {
    path: 'assinatura/pagar',
    loadComponent: () => import('./features/athlete/pix-payment/pix-payment.component').then(m => m.PixPaymentComponent),
    canActivate: [authGuard, athleteGuard],
  },
  {
    path: 'assinatura/confirmada',
    loadComponent: () =>
      import('./features/athlete/subscription-confirmed/subscription-confirmed.component').then(m => m.SubscriptionConfirmedComponent),
    canActivate: [authGuard, athleteGuard],
  },
  {
    path: 'consentimento',
    loadComponent: () => import('./features/athlete/consent/consent.component').then(m => m.ConsentComponent),
    canActivate: [authGuard, athleteGuard],
  },
  {
    path: 'athlete',
    loadComponent: () =>
      import('./layout/athlete-shell/athlete-shell.component').then(m => m.AthleteShellComponent),
    canActivate: [authGuard, athleteGuard, consentGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/athlete/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'bem-vindo',
        loadComponent: () =>
          import('./features/athlete/welcome/welcome.component').then(m => m.WelcomeComponent)
      },
      {
        path: 'weekly',
        loadComponent: () =>
          import('./features/athlete/weekly-view/weekly-view.component').then(m => m.WeeklyViewComponent)
      },
      {
        path: 'session/:sessionId',
        loadComponent: () =>
          import('./features/athlete/session-detail/session-detail.component').then(m => m.SessionDetailComponent)
      },
      {
        path: 'active/:sessionId',
        loadComponent: () =>
          import('./features/athlete/active-workout/active-workout.component').then(m => m.ActiveWorkoutComponent)
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/athlete/history/history.component').then(m => m.HistoryComponent)
      },
      {
        path: 'records',
        loadComponent: () =>
          import('./features/athlete/records/records.component').then(m => m.RecordsComponent)
      },
      {
        path: 'aulas',
        loadComponent: () =>
          import('./features/athlete/aulas/aulas.component').then(m => m.AulasComponent)
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/athlete/messages/messages.component').then(m => m.AthleteMessagesComponent)
      },
      {
        path: 'subscription',
        loadComponent: () =>
          import('./features/athlete/subscription/subscription.component').then(m => m.AthleteSubscriptionComponent)
      }
    ]
  },

  {
    path: 'admin',
    loadComponent: () =>
      import('./layout/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'coaches', pathMatch: 'full' },
      {
        path: 'coaches',
        loadComponent: () =>
          import('./features/admin/coaches/coaches.component').then(m => m.CoachesComponent)
      },
      {
        path: 'financeiro',
        loadComponent: () =>
          import('./features/admin/financial/financial.component').then(m => m.AdminFinancialComponent)
      },
    ]
  },

  // Manual do coach, versão clara para imprimir (o PDF sai dela). Público: não tem dado de ninguém.
  {
    path: 'manual-coach',
    loadComponent: () => import('./features/help/coach-manual.component').then(m => m.CoachManualComponent),
    data: { printable: true },
  },
  // Landing page pública do coach — sem guard, sem shell, qualquer visitante acessa.
  {
    path: 'c/:slug',
    loadComponent: () =>
      import('./features/public/coach-landing/coach-landing.component').then(m => m.CoachLandingComponent)
  },
  // Documentos legais públicos (conteúdo em features/public/legal/legal-content.ts).
  ...(['termos', 'privacidade', 'cookies', 'reembolso', 'termo-coach'] as const).map(doc => ({
    path: doc,
    data: { doc },
    loadComponent: () =>
      import('./features/public/legal/legal-page.component').then(m => m.LegalPageComponent),
  })),
  {
    // Pública (sem guard): inscrição + pagamento do plano escolhido na landing do coach.
    path: 'c/:slug/assinar/:planId',
    loadComponent: () =>
      import('./features/public/signup/signup.component').then(m => m.PublicSignupComponent)
  },

  { path: '**', redirectTo: 'login' }
];

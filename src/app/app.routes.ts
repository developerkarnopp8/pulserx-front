import { Routes } from '@angular/router';
import { authGuard, coachGuard, athleteGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
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
    canActivate: [authGuard, coachGuard],
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
      }
    ]
  },

  {
    path: 'athlete',
    loadComponent: () =>
      import('./layout/athlete-shell/athlete-shell.component').then(m => m.AthleteShellComponent),
    canActivate: [authGuard, athleteGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/athlete/home/home.component').then(m => m.HomeComponent)
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
    ]
  },

  // Landing page pública do coach — sem guard, sem shell, qualquer visitante acessa.
  {
    path: 'c/:slug',
    loadComponent: () =>
      import('./features/public/coach-landing/coach-landing.component').then(m => m.CoachLandingComponent)
  },

  { path: '**', redirectTo: 'login' }
];

import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { Student, TrainingPlan } from '../../core/models';
import { NotificationPermissionBannerComponent } from '../../shared/components/notification-permission-banner/notification-permission-banner.component';
import { NotificationsBellComponent } from '../../shared/components/notifications-bell/notifications-bell.component';
import { addUtcDays, toDateKey, utcDateFromIso } from '../../shared/utils/date-key';
import { coachScreenTitle } from '../../shared/utils/coach-screen-title';

interface NavItem { label: string; route: string; icon: string; soon?: boolean; }

const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024; // 20MB — mesmo limite do backend

@Component({
  selector: 'app-coach-shell',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterOutlet, RouterLink, NotificationPermissionBannerComponent, NotificationsBellComponent],
  templateUrl: './coach-shell.component.html',
  styleUrl: './coach-shell.component.scss'
})
export class CoachShellComponent implements OnInit {
  mobileMenuOpen = signal(false);
  showNewPlanModal = signal(false);
  students = signal<Student[]>([]);
  saving = signal(false);
  toast = signal<string>('');
  newPlanMode = signal<'manual' | 'pdf'>('manual');
  selectedPdfFile = signal<File | null>(null);
  importing = signal(false);

  // Planos já existentes do aluno selecionado no modal — evita duplicata/redirecionamento surpresa
  existingPlansForStudent = signal<TrainingPlan[]>([]);
  loadingExistingPlans = signal(false);
  computedMonth = signal(1); // número ordinal interno — não aparece mais no formulário
  private startDateTouchedByUser = false;

  currentUrl = signal('');
  /** Nome da tela atual, na barra superior. */
  screenTitle = computed(() => coachScreenTitle(this.currentUrl()));

  navItems: NavItem[] = [
    { label: 'Dashboard',  route: '/coach/dashboard', icon: 'dashboard' },
    { label: 'Alunos',     route: '/coach/students',  icon: 'group' },
    { label: 'Planos',     route: '/coach/plans',     icon: 'fitness_center' },
    { label: 'Biblioteca', route: '/coach/library',   icon: 'menu_book' },
    { label: 'Mensagens',  route: '/coach/messages',  icon: 'chat' },
    { label: 'Financeiro', route: '/coach/financial', icon: 'payments'  },
    { label: 'Assinaturas', route: '/coach/subscriptions', icon: 'workspace_premium' },
    { label: 'Minha Página', route: '/coach/landing-page', icon: 'storefront' },
  ];

  form!: FormGroup;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      studentId: ['', Validators.required],
      title:     ['Mesociclo 1', Validators.required],
      startDate: ['', Validators.required],
    });

    // Atualiza o título automaticamente quando a data muda (se ainda não foi editado pelo usuário).
    // Só dispara em edição manual do usuário — updates programáticos (auto-sugestão) usam emitEvent: false.
    this.form.get('startDate')!.valueChanges.subscribe(() => {
      this.startDateTouchedByUser = true;
      this.applyDefaultTitle(this.computedMonth());
    });

    // Ao trocar o atleta, busca os planos já existentes dele — evita que o coach
    // tente criar um plano num mês que já tem um (o que hoje só redireciona pro
    // existente sem deixar claro que é um plano diferente do que ele estava vendo),
    // e auto-sugere a data de início como o dia seguinte ao fim do último plano.
    this.form.get('studentId')!.valueChanges.subscribe((studentId: string) => {
      this.existingPlansForStudent.set([]);
      if (!studentId) return;
      this.loadingExistingPlans.set(true);
      this.api.getPlansByStudent(studentId).subscribe({
        next: plans => {
          this.existingPlansForStudent.set(plans);
          this.loadingExistingPlans.set(false);
          const nextMonth = plans.length ? Math.max(...plans.map(p => p.month)) + 1 : 1;
          this.computedMonth.set(nextMonth);
          if (!this.startDateTouchedByUser) {
            const suggested = this.suggestNextStartDate(plans);
            this.form.get('startDate')!.setValue(suggested, { emitEvent: false });
            this.applyDefaultTitle(nextMonth);
          }
        },
        error: () => this.loadingExistingPlans.set(false),
      });
    });
  }

  /** Dia seguinte ao fim do último plano do aluno (startDate + semanas*7 dias), ou hoje se não há nenhum plano ainda. */
  private suggestNextStartDate(plans: TrainingPlan[]): string {
    if (!plans.length) return toDateKey(new Date());
    const last = plans.reduce((a, b) => (a.startDate > b.startDate ? a : b));
    const lastStart = utcDateFromIso(last.startDate);
    const end = addUtcDays(lastStart, last.weeks.length * 7);
    return toDateKey(end);
  }

  private applyDefaultTitle(month: number): void {
    const titleCtrl = this.form.get('title')!;
    const current = titleCtrl.value as string;
    if (!current || /^Mesociclo \d+$/.test(current)) {
      titleCtrl.setValue(`Mesociclo ${month || 1}`, { emitEvent: false });
    }
  }

  ngOnInit(): void {
    this.currentUrl.set(this.router.url);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
      this.currentUrl.set((e as NavigationEnd).urlAfterRedirects);
      this.mobileMenuOpen.set(false);
    });
    const coach = this.auth.currentUser();
    if (!coach) return;
    this.api.getStudents(coach.id).subscribe(s => this.students.set(s));
  }

  isNavActive(route: string): boolean {
    if (!route) return false;
    const url = this.currentUrl();
    if (route === '/coach/plans') {
      return url.startsWith('/coach/plans') || url.startsWith('/coach/plan-builder');
    }
    return url.startsWith(route);
  }

  openModal(): void {
    this.existingPlansForStudent.set([]);
    this.computedMonth.set(1);
    this.form.reset({ studentId: '', title: 'Mesociclo 1', startDate: '' });
    this.newPlanMode.set('manual');
    this.selectedPdfFile.set(null);
    this.importing.set(false);
    // reset() acima dispara valueChanges do campo startDate, que marcaria
    // startDateTouchedByUser como true — por isso essa flag só é zerada
    // DEPOIS do reset, não antes.
    this.startDateTouchedByUser = false;
    this.showNewPlanModal.set(true);
  }

  closeModal(): void {
    // Enquanto uma importação de PDF está em andamento, o modal não pode ser
    // fechado (backdrop/X/Cancelar) — isso deixaria `importing` travado em
    // true e, ao reabrir, o coach poderia disparar uma segunda importação
    // duplicada enquanto a primeira ainda está em voo no servidor. O modal
    // volta a ser fechável assim que `importPlanFromPdf()` resolve (sucesso
    // ou erro), que já zera `importing`.
    if (this.importing()) return;
    this.showNewPlanModal.set(false);
    this.saving.set(false);
  }

  setNewPlanMode(mode: 'manual' | 'pdf'): void {
    this.newPlanMode.set(mode);
    // Evita que um arquivo PDF selecionado antes de trocar pra "Criar Vazio"
    // e depois voltar pra "Importar PDF" fique associado ao formulário —
    // o input de arquivo é recriado (mostrando "nenhum arquivo selecionado")
    // mas o signal continuaria com a referência antiga se não fosse resetado aqui.
    this.selectedPdfFile.set(null);
  }

  createPlan(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const { studentId, title, startDate } = this.form.value as {
      studentId: string; title: string; startDate: string;
    };
    const month = this.computedMonth();

    // Verifica se já existe plano para esse aluno/mês antes de criar duplicata
    this.api.getPlansByStudent(studentId).subscribe({
      next: existing => {
        const duplicate = existing.find(p => p.month === month);
        if (duplicate) {
          this.closeModal();
          this.showToast(`Já existe "${duplicate.title}" no Mês ${month} — nenhum plano novo foi criado. Abrindo esse plano existente.`, 5000);
          this.router.navigate(['/coach/plan-builder', studentId], {
            queryParams: { planId: duplicate.id },
          });
          return;
        }
        this.api.createPlan(studentId, title, month, startDate).subscribe({
          next: plan => {
            this.closeModal();
            this.showToast('Plano criado! Abrindo editor...');
            this.router.navigate(['/coach/plan-builder', studentId], {
              queryParams: { planId: plan.id },
            });
          },
          error: () => {
            this.saving.set(false);
            this.showToast('Erro ao criar plano. Tente novamente.');
          },
        });
      },
      error: () => {
        // Se não conseguir verificar, cria mesmo assim
        this.api.createPlan(studentId, title, month, startDate).subscribe({
          next: plan => {
            this.closeModal();
            this.showToast('Plano criado! Abrindo editor...');
            this.router.navigate(['/coach/plan-builder', studentId], {
              queryParams: { planId: plan.id },
            });
          },
          error: () => {
            this.saving.set(false);
            this.showToast('Erro ao criar plano. Tente novamente.');
          },
        });
      },
    });
  }

  onPdfFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && file.size > MAX_PDF_SIZE_BYTES) {
      this.selectedPdfFile.set(null);
      this.showToast('Arquivo muito grande — o limite é 20MB.', 5000);
      return;
    }
    this.selectedPdfFile.set(file);
  }

  importPlanFromPdf(): void {
    const studentId = this.form.get('studentId')!.value as string;
    const startDate = this.form.get('startDate')!.value as string;
    const file = this.selectedPdfFile();
    if (!studentId || !startDate || !file) {
      this.showToast('Selecione o aluno, a data de início e o arquivo PDF.');
      return;
    }

    this.importing.set(true);
    this.api.importPlanFromPdf(studentId, startDate, file).subscribe({
      next: plan => {
        this.importing.set(false);
        this.closeModal();
        this.showToast('Plano importado do PDF! Revise e publique quando estiver pronto.');
        this.router.navigate(['/coach/plan-builder', studentId], {
          queryParams: { planId: plan.id },
        });
      },
      error: (err) => {
        this.importing.set(false);
        const message = err?.status === 422
          ? 'Não consegui extrair um treino válido desse PDF — tente outro arquivo ou crie manualmente.'
          : err?.status === 403
          ? 'Recurso desativado pra sua conta — entre em contato com o suporte.'
          : err?.status === 503
          ? 'Erro no sistema de importação — nossa equipe já foi avisada. Tente novamente mais tarde ou entre em contato com o suporte.'
          : 'Erro ao importar o PDF. Tente novamente.';
        this.showToast(message, 5000);
      },
    });
  }

  private showToast(msg: string, durationMs = 3000): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), durationMs);
  }

  toggleMobileMenu(): void { this.mobileMenuOpen.update(v => !v); }
  closeMobileMenu(): void { this.mobileMenuOpen.set(false); }

  logout(): void { this.auth.logout(); }
}

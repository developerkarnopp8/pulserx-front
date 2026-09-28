import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { PlatformSettings } from '../../../core/models';
import { formatReais } from '../../../shared/utils/currency';

interface Coach {
  id: string;
  name: string;
  email: string;
  aiImportEnabled: boolean;
  createdAt: string;
  /** Governança/repasses (real — soma de GatewayPayment pago, dividida pela % do contrato). */
  platformFeePercent: number;
  studentCount: number;
  totalPaid: number;
  platformCut: number;
  coachCut: number;
}

@Component({
  selector: 'app-coaches',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './coaches.component.html',
  styleUrl: './coaches.component.scss',
})
export class CoachesComponent implements OnInit {
  coaches      = signal<Coach[]>([]);
  showModal    = signal(false);
  saving       = signal(false);
  errorMsg     = signal('');
  listErrorMsg = signal('');
  togglingId   = signal<string | null>(null);
  resettingId  = signal<string | null>(null);
  revealedPassword = signal<{ email: string; password: string } | null>(null);

  // ── Contrato (% da plataforma) ─────────────────────────────────────────────
  contractTargetId = signal<string | null>(null);
  contractFeePercent = signal(0);
  savingContractId = signal<string | null>(null);
  contractError = signal('');

  // ── Bloqueio por assinatura (platform settings) ────────────────────────────
  platformSettings = signal<PlatformSettings | null>(null);
  loadingSettings = signal(false);
  updatingSettings = signal(false);
  settingsError = signal('');

  readonly fmtReais = formatReais;

  /** Balanço real da plataforma inteira — soma simples dos coaches carregados. */
  platformTotals = computed(() => {
    const list = this.coaches();
    return {
      studentCount: list.reduce((sum, c) => sum + c.studentCount, 0),
      totalPaid:    list.reduce((sum, c) => sum + c.totalPaid, 0),
      platformCut:  list.reduce((sum, c) => sum + c.platformCut, 0),
      coachCut:     list.reduce((sum, c) => sum + c.coachCut, 0),
    };
  });

  form!: FormGroup;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      name:  ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    this.load();
    this.loadPlatformSettings();
  }

  private loadPlatformSettings(): void {
    this.loadingSettings.set(true);
    this.api.getPlatformSettings().subscribe({
      next: s => { this.platformSettings.set(s); this.loadingSettings.set(false); },
      error: () => { this.loadingSettings.set(false); this.settingsError.set('Não foi possível carregar as configurações da plataforma.'); },
    });
  }

  toggleEnforcement(): void {
    const current = this.platformSettings();
    if (!current) return;
    const enable = !current.enforceSubscriptionAccess;
    this.settingsError.set('');

    if (enable && current.studentsWithoutAccess > 0) {
      const ok = confirm(
        `${current.studentsWithoutAccess} aluno(s) ainda não têm plano ativo e ficariam SEM acesso ao ligar o bloqueio. Ligar mesmo assim?`,
      );
      if (!ok) return;
    }

    this.updatingSettings.set(true);
    this.api.setPlatformSettings(enable, enable).subscribe({
      next: s => { this.platformSettings.set(s); this.updatingSettings.set(false); },
      error: err => {
        const msg = err?.error?.message;
        this.settingsError.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Não foi possível atualizar a configuração.'));
        this.updatingSettings.set(false);
      },
    });
  }

  openContract(coach: Coach): void {
    if (this.contractTargetId() === coach.id) { this.contractTargetId.set(null); return; }
    this.contractTargetId.set(coach.id);
    this.contractError.set('');
    this.contractFeePercent.set(0);
    this.api.getCoachContract(coach.id).subscribe({
      next: c => this.contractFeePercent.set(c.platformFeePercent),
      error: () => this.contractError.set('Não foi possível carregar o contrato.'),
    });
  }

  saveContract(coach: Coach): void {
    this.savingContractId.set(coach.id);
    this.contractError.set('');
    this.api.setCoachContract(coach.id, this.contractFeePercent()).subscribe({
      next: () => {
        this.savingContractId.set(null);
        this.contractTargetId.set(null);
        // Recarrega a lista pra refletir a % nova e o repasse recalculado — sem isso a linha
        // ficava mostrando a % antiga até um F5 (achado testando no navegador).
        this.load();
      },
      error: err => {
        const msg = err?.error?.message;
        this.contractError.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Não foi possível salvar o contrato.'));
        this.savingContractId.set(null);
      },
    });
  }

  private load(): void {
    this.listErrorMsg.set('');
    this.api.getCoaches().subscribe({
      next: list => this.coaches.set(list),
      error: err => {
        const msg = err?.error?.message;
        this.listErrorMsg.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao carregar a lista de coaches.'));
      },
    });
  }

  openModal(): void {
    this.form.reset();
    this.errorMsg.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.saving.set(false);
    this.errorMsg.set('');
  }

  createCoach(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMsg.set('');
    const { name, email } = this.form.value as { name: string; email: string };

    this.api.createCoach(name, email).subscribe({
      next: coach => {
        this.closeModal();
        this.revealedPassword.set({ email: coach.email, password: coach.password });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.load();
      },
      error: err => {
        const msg = err?.error?.message;
        this.errorMsg.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao criar coach.'));
        this.saving.set(false);
      },
    });
  }

  resetPassword(coach: Coach): void {
    if (!confirm(`Resetar a senha de ${coach.name}? A senha atual deixa de funcionar imediatamente.`)) return;
    this.resettingId.set(coach.id);
    this.api.resetCoachPassword(coach.id).subscribe({
      next: res => {
        this.resettingId.set(null);
        this.revealedPassword.set({ email: coach.email, password: res.password });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: err => {
        this.resettingId.set(null);
        const msg = err?.error?.message;
        this.listErrorMsg.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao resetar a senha. Tente novamente.'));
      },
    });
  }

  toggleAi(coach: Coach): void {
    this.togglingId.set(coach.id);
    const next = !coach.aiImportEnabled;
    this.api.toggleCoachAi(coach.id, next).subscribe({
      next: () => {
        this.togglingId.set(null);
        this.coaches.update(list => list.map(c => c.id === coach.id ? { ...c, aiImportEnabled: next } : c));
      },
      error: err => {
        this.togglingId.set(null);
        const msg = err?.error?.message;
        this.listErrorMsg.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao atualizar a permissão de IA. Tente novamente.'));
      },
    });
  }

  dismissRevealedPassword(): void {
    this.revealedPassword.set(null);
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}

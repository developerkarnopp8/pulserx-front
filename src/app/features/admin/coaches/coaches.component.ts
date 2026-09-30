import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import {
  COACH_ALERT_LABEL, CoachAlert, CoachSubscriptionSummary, CoachUsage, PlatformSettings,
} from '../../../core/models';
import { formatReais } from '../../../shared/utils/currency';
import { AthleteDeletionComponent } from '../athlete-deletion/athlete-deletion.component';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { apiMessage } from '../../../shared/utils/signup-flow';

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
  gatewayFee: number;
  platformCut: number;
  coachCut: number;
  /** Cobranças pagas ainda sem o líquido do Asaas (fora do repasse até ele informar). */
  pendingBreakdown: number;
  subscriptions: CoachSubscriptionSummary;
  alerts: CoachAlert[];
  usage: CoachUsage;
}

@Component({
  selector: 'app-coaches',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AthleteDeletionComponent],
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
  copyMsg = signal('');

  // ── Contrato (% da plataforma) ─────────────────────────────────────────────
  contractTargetId = signal<string | null>(null);

  // ── Detalhes do coach (assinaturas e uso) ──────────────────────────────────
  detailsId = signal<string | null>(null);
  readonly alertLabel = COACH_ALERT_LABEL;
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

  async toggleEnforcement(): Promise<void> {
    const current = this.platformSettings();
    if (!current) return;
    const enable = !current.enforceSubscriptionAccess;
    this.settingsError.set('');

    if (enable && current.studentsWithoutAccess > 0) {
      const ok = await confirmDialog.ask({
        title: 'Ligar o bloqueio por assinatura?',
        message: `${current.studentsWithoutAccess} aluno(s) ainda não têm plano ativo e ficariam SEM acesso ao conteúdo.`,
        confirmLabel: 'Ligar mesmo assim',
        danger: true,
      });
      if (!ok) return;
    }

    this.updatingSettings.set(true);
    this.api.setPlatformSettings(enable, enable).subscribe({
      next: s => { this.platformSettings.set(s); this.updatingSettings.set(false); },
      error: err => {
        this.settingsError.set(apiMessage(err, 'Não foi possível atualizar a configuração.'));
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
        this.contractError.set(apiMessage(err, 'Não foi possível salvar o contrato.'));
        this.savingContractId.set(null);
      },
    });
  }

  private load(): void {
    this.listErrorMsg.set('');
    this.api.getCoaches().subscribe({
      next: list => this.coaches.set(list),
      error: err => {
        this.listErrorMsg.set(apiMessage(err, 'Erro ao carregar a lista de coaches.'));
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
        this.errorMsg.set(apiMessage(err, 'Erro ao criar coach.'));
        this.saving.set(false);
      },
    });
  }

  async resetPassword(coach: Coach): Promise<void> {
    const ok = await confirmDialog.ask({
      title: `Resetar a senha de ${coach.name}?`,
      message: 'A senha atual deixa de funcionar na hora. Uma senha nova aparece aqui para você copiar e enviar ao coach.',
      confirmLabel: 'Resetar senha',
      danger: true,
    });
    if (!ok) return;
    this.resettingId.set(coach.id);
    this.api.resetCoachPassword(coach.id).subscribe({
      next: res => {
        this.resettingId.set(null);
        this.revealedPassword.set({ email: coach.email, password: res.password });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: err => {
        this.resettingId.set(null);
        this.listErrorMsg.set(apiMessage(err, 'Erro ao resetar a senha. Tente novamente.'));
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
        this.listErrorMsg.set(apiMessage(err, 'Erro ao atualizar a permissão de IA. Tente novamente.'));
      },
    });
  }

  dismissRevealedPassword(): void {
    this.revealedPassword.set(null);
    this.copyMsg.set('');
  }

  /** Copia e-mail + senha nova num texto pronto para mandar ao coach (WhatsApp/e-mail). */
  async copyRevealedPassword(): Promise<void> {
    const revealed = this.revealedPassword();
    if (!revealed) return;
    const texto = `Acesso ao PulseRx\nE-mail: ${revealed.email}\nSenha: ${revealed.password}`;
    try {
      await navigator.clipboard.writeText(texto);
      this.copyMsg.set('Copiado! Cole na conversa com o coach.');
    } catch {
      this.copyMsg.set('Não deu para copiar automaticamente: selecione a senha e copie.');
    }
  }

  toggleDetails(coach: Coach): void {
    this.detailsId.update(id => (id === coach.id ? null : coach.id));
  }

  /** Data curta em pt-BR, ou o texto de "sem registro" (último login/plano por IA só existem desde 30/09/2026). */
  formatDate(iso: string | null, semValor = 'sem registro'): string {
    if (!iso) return semValor;
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}

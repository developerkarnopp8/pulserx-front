import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkipReason, SkipDecision } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

const REASONS: { value: SkipReason; label: string }[] = [
  { value: 'NoTime', label: 'Sem tempo' },
  { value: 'Injury', label: 'Lesão / dor' },
  { value: 'Later',  label: 'Vou fazer depois' },
  { value: 'Other',  label: 'Outro' },
];

@Component({
  selector: 'app-skip-reason-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './skip-reason-modal.component.html',
})
export class SkipReasonModalComponent {
  @Input() open = false;
  @Output() confirmed = new EventEmitter<{ reason: SkipReason; decision: SkipDecision; note?: string }>();
  @Output() cancelled = new EventEmitter<void>();

  selectedReason = signal<SkipReason | null>(null);
  selectedDecision = signal<SkipDecision | null>(null);
  note = signal('');

  constructor(private auth: AuthService) {}

  /** "Lesão / dor" e a observação livre são dado de saúde: só com o consentimento do aluno (LGPD Art. 11). */
  get healthConsent(): boolean {
    return this.auth.currentUser()?.healthConsent === true;
  }

  get reasons(): { value: SkipReason; label: string }[] {
    return this.healthConsent ? REASONS : REASONS.filter(r => r.value !== 'Injury');
  }

  get noteRequired(): boolean {
    return this.healthConsent && this.selectedReason() === 'Other';
  }

  get canConfirm(): boolean {
    return !!this.selectedReason() && !!this.selectedDecision() && (!this.noteRequired || this.note().trim().length > 0);
  }

  selectReason(r: SkipReason): void { this.selectedReason.set(r); }
  selectDecision(d: SkipDecision): void { this.selectedDecision.set(d); }

  confirm(): void {
    if (!this.canConfirm) return;
    this.confirmed.emit({
      reason: this.selectedReason()!,
      decision: this.selectedDecision()!,
      // Só vai a observação que está à vista (motivo "Outro" com consentimento) — nunca um texto escondido.
      note: this.noteRequired ? this.note().trim() : undefined,
    });
    this.reset();
  }

  cancel(): void {
    this.cancelled.emit();
    this.reset();
  }

  private reset(): void {
    this.selectedReason.set(null);
    this.selectedDecision.set(null);
    this.note.set('');
  }
}

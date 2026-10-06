import { Component, input } from '@angular/core';

/** Uma etapa da assinatura (dados → confirmar e-mail → pagamento/acesso). */
export interface StepView {
  n: number;
  label: string;
  state: 'done' | 'current' | 'todo';
}

/**
 * As 3 etapas da assinatura com a atual destacada; `current` 4 = todas concluídas. Etapa 3 é "Acesso" no plano grátis.
 */
export function checkoutSteps(current: number, isFree: boolean): StepView[] {
  return [
    { n: 1, label: 'Seus dados' },
    { n: 2, label: 'Confirme o e-mail' },
    { n: 3, label: isFree ? 'Acesso' : 'Pagamento' },
  ].map(s => ({ ...s, state: s.n < current ? 'done' : s.n === current ? 'current' : 'todo' }));
}

/** Barra de etapas da assinatura (inscrição, PIX e assinatura ativa). */
@Component({
  selector: 'app-checkout-steps',
  standalone: true,
  templateUrl: './checkout-steps.component.html',
})
export class CheckoutStepsComponent {
  steps = input.required<StepView[]>();
}

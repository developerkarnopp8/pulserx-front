import { TestBed } from '@angular/core/testing';
import { CheckoutStepsComponent, checkoutSteps } from './checkout-steps.component';

describe('checkoutSteps', () => {
  it('etapa atual destacada, anteriores concluídas, seguintes a fazer', () => {
    expect(checkoutSteps(2, false).map(s => s.state)).toEqual(['done', 'current', 'todo']);
    expect(checkoutSteps(3, false).at(2)).toEqual({ n: 3, label: 'Pagamento', state: 'current' });
  });

  it('4 = todas concluídas; plano grátis chama a 3ª etapa de "Acesso"', () => {
    expect(checkoutSteps(4, true).map(s => s.state)).toEqual(['done', 'done', 'done']);
    expect(checkoutSteps(4, true).at(2)?.label).toBe('Acesso');
  });
});

describe('CheckoutStepsComponent', () => {
  it('recebe as etapas pela entrada', () => {
    const fixture = TestBed.createComponent(CheckoutStepsComponent);
    fixture.componentRef.setInput('steps', checkoutSteps(2, false));
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items.length).toBe(3);
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[0].textContent).toContain('(concluída)');
  });
});

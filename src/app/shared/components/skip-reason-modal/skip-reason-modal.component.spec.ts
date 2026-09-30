import { SkipReasonModalComponent } from './skip-reason-modal.component';

function build(healthConsent: boolean | null | undefined) {
  const auth = { currentUser: vi.fn().mockReturnValue({ id: 'u1', role: 'athlete', healthConsent }) };
  const component = new SkipReasonModalComponent(auth as any);
  const confirmed = vi.fn();
  const cancelled = vi.fn();
  component.confirmed.subscribe(confirmed);
  component.cancelled.subscribe(cancelled);
  return { component, auth, confirmed, cancelled };
}

describe('SkipReasonModalComponent — consentimento de saúde (LGPD Art. 11)', () => {
  it('com consentimento: mostra os 4 motivos, inclusive "Lesão / dor"', () => {
    const { component } = build(true);
    expect(component.healthConsent).toBe(true);
    expect(component.reasons.map(r => r.value)).toEqual(['NoTime', 'Injury', 'Later', 'Other']);
  });

  it.each([false, null, undefined])('sem consentimento (%s): esconde "Lesão / dor"', consent => {
    const { component } = build(consent);
    expect(component.healthConsent).toBe(false);
    expect(component.reasons.map(r => r.value)).toEqual(['NoTime', 'Later', 'Other']);
  });

  it('sem sessão: trata como sem consentimento', () => {
    const auth = { currentUser: vi.fn().mockReturnValue(null) };
    const component = new SkipReasonModalComponent(auth as any);
    expect(component.healthConsent).toBe(false);
  });

  it('com consentimento e "Outro": exige a observação e envia o texto aparado', () => {
    const { component, confirmed } = build(true);
    component.selectReason('Other');
    component.selectDecision('Postponed');
    expect(component.noteRequired).toBe(true);
    expect(component.canConfirm).toBe(false);
    component.note.set('   ');
    expect(component.canConfirm).toBe(false);
    component.note.set('  dor no joelho  ');
    expect(component.canConfirm).toBe(true);
    component.confirm();
    expect(confirmed).toHaveBeenCalledWith({ reason: 'Other', decision: 'Postponed', note: 'dor no joelho' });
    expect(component.selectedReason()).toBeNull();
    expect(component.note()).toBe('');
  });

  it('sem consentimento e "Outro": não pede observação e não envia nenhuma', () => {
    const { component, confirmed } = build(false);
    component.selectReason('Other');
    component.selectDecision('Abandoned');
    component.note.set('texto que não deveria sair');
    expect(component.noteRequired).toBe(false);
    expect(component.canConfirm).toBe(true);
    component.confirm();
    expect(confirmed).toHaveBeenCalledWith({ reason: 'Other', decision: 'Abandoned', note: undefined });
  });

  it('observação escrita em "Outro" não vai junto se o aluno troca para outro motivo', () => {
    const { component, confirmed } = build(true);
    component.selectReason('Other');
    component.note.set('lesão no ombro');
    component.selectReason('NoTime');
    component.selectDecision('Postponed');
    component.confirm();
    expect(confirmed).toHaveBeenCalledWith({ reason: 'NoTime', decision: 'Postponed', note: undefined });
  });

  it('sem motivo ou sem decisão: não confirma', () => {
    const { component, confirmed } = build(true);
    component.confirm();
    component.selectReason('NoTime');
    component.confirm();
    expect(confirmed).not.toHaveBeenCalled();
  });

  it('cancelar avisa e limpa a seleção', () => {
    const { component, cancelled } = build(true);
    component.selectReason('Later');
    component.selectDecision('Postponed');
    component.note.set('x');
    component.cancel();
    expect(cancelled).toHaveBeenCalled();
    expect(component.selectedReason()).toBeNull();
    expect(component.selectedDecision()).toBeNull();
    expect(component.note()).toBe('');
  });
});

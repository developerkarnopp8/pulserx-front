import { FormBuilder } from '@angular/forms';
import { PlanBuilderComponent } from './plan-builder.component';

/** Cobre só o que foi adicionado no redesign visual (letra do bloco, toggle do vídeo inline) — o resto do componente não tem harness de teste ainda. */

function build() {
  const api = {} as any;
  return new PlanBuilderComponent(api, new FormBuilder());
}

describe('PlanBuilderComponent.blockLetter', () => {
  it('mapeia a posição do exercício pra letra (A, B, C...)', () => {
    const component = build();
    expect(component.blockLetter(0)).toBe('A');
    expect(component.blockLetter(1)).toBe('B');
    expect(component.blockLetter(2)).toBe('C');
  });

  it('depois de Z, recomeça em A (26 exercícios numa sessão é cenário extremo, mas não pode quebrar)', () => {
    const component = build();
    expect(component.blockLetter(25)).toBe('Z');
    expect(component.blockLetter(26)).toBe('A');
  });
});

describe('PlanBuilderComponent.toggleVideo', () => {
  it('abre o vídeo do exercício clicado', () => {
    const component = build();
    component.toggleVideo('ex-1');
    expect(component.expandedVideoId()).toBe('ex-1');
  });

  it('clicar de novo no mesmo exercício fecha', () => {
    const component = build();
    component.toggleVideo('ex-1');
    component.toggleVideo('ex-1');
    expect(component.expandedVideoId()).toBeNull();
  });

  it('só um vídeo aberto por vez — abrir outro troca, não acumula', () => {
    const component = build();
    component.toggleVideo('ex-1');
    component.toggleVideo('ex-2');
    expect(component.expandedVideoId()).toBe('ex-2');
  });
});

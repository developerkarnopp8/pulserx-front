import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export const COOKIE_NOTICE_KEY = 'pulserx_cookie_notice_ok';

/**
 * Aviso informativo de armazenamento no navegador. O PulseRx só usa armazenamento ESSENCIAL (sessão,
 * rascunho de treino, avisos dispensados) — sem publicidade/rastreamento/análise —, então não há
 * consentimento a coletar: o aviso só informa e some depois do "Entendi".
 */
@Component({
  selector: 'app-cookie-notice',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (visible()) {
      <div role="region" aria-label="Aviso de cookies"
        class="print:hidden fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[70] bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-2xl p-4 flex flex-col gap-3">
        <p class="text-on-surface text-sm">
          Usamos apenas armazenamento essencial para manter você conectado e salvar seu treino.
          Não usamos cookies de publicidade nem de rastreamento.
          <a routerLink="/cookies" class="text-primary-fixed underline">Saiba mais</a>
        </p>
        <button type="button" (click)="dismiss()"
          class="self-end min-h-[44px] px-5 rounded-lg bg-primary-fixed hover:bg-primary-dim text-on-primary-fixed font-headline font-black text-xs uppercase tracking-tighter">
          Entendi
        </button>
      </div>
    }
  `,
})
export class CookieNoticeComponent {
  visible = signal(this.readVisible());

  dismiss(): void {
    this.visible.set(false);
    try { localStorage.setItem(COOKIE_NOTICE_KEY, '1'); } catch { /* armazenamento bloqueado: some só nesta visita */ }
  }

  private readVisible(): boolean {
    try { return localStorage.getItem(COOKIE_NOTICE_KEY) !== '1'; } catch { return true; }
  }
}

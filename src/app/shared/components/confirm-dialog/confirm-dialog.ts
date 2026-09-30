import { signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Texto do botão que confirma (padrão "Confirmar"). */
  confirmLabel?: string;
  /** Texto do botão que desiste (padrão "Voltar" — nunca "Cancelar", que confunde com "cancelar assinatura"). */
  cancelLabel?: string;
  /** Ação destrutiva (remover, excluir, resetar): botão em vermelho. */
  danger?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/**
 * Caixa de confirmação do app (substitui o `confirm()` do navegador, que o dono achou feio — 2026-09-30).
 * Um só no app, sem injeção de dependência: as telas chamam `confirmDialog.ask(...)` e os testes trocam o
 * `ask` por um dublê. O `ConfirmDialogComponent` (na raiz) desenha a pergunta atual.
 */
class ConfirmDialogStore {
  readonly current = signal<Pending | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    // Uma pergunta por vez: se outra estava aberta, ela conta como "não".
    this.current()?.resolve(false);
    return new Promise<boolean>(resolve => this.current.set({ ...options, resolve }));
  }

  answer(ok: boolean): void {
    const pending = this.current();
    if (!pending) return;
    this.current.set(null);
    pending.resolve(ok);
  }
}

export const confirmDialog = new ConfirmDialogStore();

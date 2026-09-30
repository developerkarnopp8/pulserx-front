import { Component, HostListener } from '@angular/core';
import { confirmDialog } from './confirm-dialog';

/** Desenha a pergunta de `confirmDialog` (fica na raiz do app). Esc ou clicar fora = "não". */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  readonly dialog = confirmDialog;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dialog.answer(false);
  }
}

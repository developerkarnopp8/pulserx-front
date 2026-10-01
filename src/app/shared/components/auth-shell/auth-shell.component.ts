import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Molde das telas de acesso (login, esqueci a senha, criar senha, confirmar e-mail) — layout "Stitch mo01" aprovado pelo dono
 * (2026-10-01). Só texto verdadeiro: nada de versão, latência ou contato que não existe.
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth-shell.component.html',
})
export class AuthShellComponent {
  /** Rota do botão "voltar" do cabeçalho (sem valor, não mostra o botão). */
  @Input() backLink: string | null = null;
  /** Marca d'água "PULSERX" atrás do conteúdo (só no login). */
  @Input() watermark = false;
}

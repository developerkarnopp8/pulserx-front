import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { apiMessage } from '../../../shared/utils/signup-flow';
import { tokenFromHash } from '../reset-password/reset-password.component';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Para onde seguir depois de confirmar: o pagamento do plano escolhido na página do coach (`&c=slug&plano=id` no link).
 * Só aceita slug e id no formato esperado — nada do fragmento vira URL livre (nem para fora do site).
 */
export function continuePathFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const slug = params.get('c');
  const plano = params.get('plano');
  if (!slug || !plano || !SLUG.test(slug) || slug.length > 60 || !UUID.test(plano)) return null;
  return `/c/${slug}/assinar/${plano}`;
}

/**
 * Confirmação do e-mail pelo link. A confirmação só acontece no clique do botão (não ao abrir a página): antivírus de
 * e-mail que abrem links sozinhos não gastam o link de uso único nem ficam com a sessão.
 */
@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './confirm-email.component.html',
})
export class ConfirmEmailComponent implements OnInit {
  token = signal<string | null>(null);
  busy = signal(false);
  errorMsg = signal('');
  private continuePath: string | null = null;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.token.set(tokenFromHash(window.location.hash));
    this.continuePath = continuePathFromHash(window.location.hash);
    // Tira o token da barra de endereço (histórico, prints, compartilhamento).
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);
  }

  confirm(): void {
    const token = this.token();
    if (!token || this.busy()) return;
    this.busy.set(true);
    this.errorMsg.set('');
    this.api.verifyEmail(token).subscribe({
      next: res => {
        this.auth.startSession(res.access_token, res.user);
        this.busy.set(false);
        const home = res.user.role === 'coach' ? '/coach/dashboard' : res.user.role === 'admin' ? '/admin/coaches' : '/athlete/home';
        this.router.navigateByUrl(this.continuePath ?? home);
      },
      error: err => {
        this.busy.set(false);
        this.errorMsg.set(apiMessage(err, 'Não foi possível confirmar agora. Tente de novo em instantes.'));
      },
    });
  }
}

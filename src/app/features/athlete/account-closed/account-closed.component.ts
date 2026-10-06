import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { DeleteAccountComponent } from '../../../shared/components/delete-account/delete-account.component';
import { AuthShellComponent } from '../../../shared/components/auth-shell/auth-shell.component';

/** O coach desvinculou o aluno: sem acesso ao app, ele só pode sair ou excluir a conta (LGPD Art. 18). */
@Component({
  selector: 'app-account-closed',
  standalone: true,
  imports: [DeleteAccountComponent, AuthShellComponent],
  templateUrl: './account-closed.component.html',
})
export class AccountClosedComponent {
  constructor(public auth: AuthService) {}
}

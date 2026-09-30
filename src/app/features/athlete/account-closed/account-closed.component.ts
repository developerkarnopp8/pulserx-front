import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { DeleteAccountComponent } from '../../../shared/components/delete-account/delete-account.component';

/** O coach desvinculou o aluno: sem acesso ao app, ele só pode sair ou excluir a conta (LGPD Art. 18). */
@Component({
  selector: 'app-account-closed',
  standalone: true,
  imports: [DeleteAccountComponent],
  templateUrl: './account-closed.component.html',
})
export class AccountClosedComponent {
  constructor(public auth: AuthService) {}
}

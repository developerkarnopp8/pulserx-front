import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { MyPaymentStatus } from '../../../core/models';
import { NotificationState, markWelcomeSeen, notificationState } from '../../../shared/utils/welcome';

/**
 * Boas-vindas do primeiro acesso (Stitch mo19), dentro da área do aluno. Lista do que vale fazer primeiro, com estado real:
 * recordes cadastrados, treino da semana e notificações do navegador. Abrir a tela já conta como visto.
 */
@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './welcome.component.html',
})
export class WelcomeComponent implements OnInit {
  status = signal<MyPaymentStatus | null>(null);
  /** null = ainda carregando (ou falhou: o item fica como recomendado). */
  recordsCount = signal<number | null>(null);
  notif = signal<NotificationState>(notificationState());

  firstName = computed(() => this.auth.currentUser()?.name?.split(' ')[0] ?? '');
  hasRecords = computed(() => (this.recordsCount() ?? 0) > 0);

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    const userId = this.auth.currentUser()?.id;
    if (userId) markWelcomeSeen(userId);
    // Falha só esconde o nome do treinador / deixa o item de recordes como recomendado — a tela abre igual.
    this.api.getMyPaymentStatus().subscribe({ next: st => this.status.set(st), error: () => {} });
    this.api.getMyPersonalRecords().subscribe({ next: prs => this.recordsCount.set(prs.length), error: () => {} });
  }

  async enableNotifications(): Promise<void> {
    if (this.notif() !== 'default') return;
    try {
      await Notification.requestPermission();
    } finally {
      this.notif.set(notificationState());
    }
  }
}

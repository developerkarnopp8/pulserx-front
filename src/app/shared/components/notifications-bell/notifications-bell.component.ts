import { Component, OnInit, OnDestroy, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { AppNotification, NotificationType } from '../../../core/models';

const TYPE_ICON: Record<NotificationType, string> = {
  plan_published: 'calendar_month',
  new_message: 'chat',
  workout_skipped: 'skip_next',
  new_pr: 'military_tech',
  ai_credit_exhausted: 'credit_card_off',
  new_lead: 'contact_mail',
  subscription_canceled: 'cancel',
  new_student: 'person_add',
  card_refused: 'credit_card_off',
};

@Component({
  selector: 'app-notifications-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-bell.component.html',
  styleUrl: './notifications-bell.component.scss',
})
export class NotificationsBellComponent implements OnInit, OnDestroy {
  notifications = signal<AppNotification[]>([]);
  unreadCount = signal(0);
  showPanel = signal(false);

  /**
   * Lado a partir do qual o painel abre:
   * - `'end'` (padrão): painel ancorado à direita do sino, cresce pra esquerda —
   *   certo quando o sino fica no canto direito de um header de largura total.
   * - `'start'`: painel ancorado à esquerda do sino, cresce pra direita —
   *   necessário quando o sino fica numa sidebar estreita colada na borda
   *   esquerda da tela (senão o painel de 320px vaza pra fora da viewport).
   */
  @Input() align: 'start' | 'end' = 'end';

  private destroy$ = new Subject<void>();

  constructor(private api: ApiService, private socket: SocketService, private router: Router) {}

  ngOnInit(): void {
    this.api.getNotificationsUnreadCount().subscribe(r => this.unreadCount.set(r.count));

    this.socket.newNotification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(n => {
        this.notifications.update(list => [n, ...list]);
        this.unreadCount.update(c => c + 1);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePanel(): void {
    const opening = !this.showPanel();
    this.showPanel.set(opening);
    if (opening && this.notifications().length === 0) {
      this.api.getNotifications().subscribe(list => this.notifications.set(list));
    }
  }

  iconFor(type: NotificationType): string {
    return TYPE_ICON[type] ?? 'notifications';
  }

  selectNotification(n: AppNotification): void {
    this.showPanel.set(false);
    if (!n.read) {
      this.api.markNotificationRead(n.id).subscribe();
      this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, read: true } : x));
      this.unreadCount.update(c => Math.max(0, c - 1));
    }
    if (n.link) {
      this.router.navigateByUrl(n.link);
    }
  }

  markAllRead(): void {
    this.api.markAllNotificationsRead().subscribe(() => {
      this.notifications.update(list => list.map(x => ({ ...x, read: true })));
      this.unreadCount.set(0);
    });
  }
}

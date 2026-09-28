import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { ChatMessage } from './api.service';
import { AppNotification } from '../models';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  /** Token com que o socket atual autenticou — a conexão pertence a ESTE usuário. */
  private socketToken: string | null = null;
  readonly newMessage$ = new Subject<ChatMessage>();
  readonly newNotification$ = new Subject<AppNotification>();

  /**
   * Abre o socket do usuário do `token`. Se já houver um socket de OUTRA sessão (troca de conta
   * na mesma aba sem logout), ele é fechado antes — senão a aba continuaria recebendo, em tempo
   * real, as mensagens/notificações destinadas ao usuário anterior.
   */
  connect(token: string): void {
    if (this.socket && this.socketToken === token) return;
    this.disconnect();

    this.socketToken = token;

    const wsUrl = environment.apiUrl.replace('/api', '');
    this.socket = io(`${wsUrl}/messages`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('new_message', (msg: ChatMessage) => {
      this.newMessage$.next(msg);
      this.showBrowserNotification(msg);
    });

    this.socket.on('new_notification', (notification: AppNotification) => {
      this.newNotification$.next(notification);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.socketToken = null;
  }

  private showBrowserNotification(msg: ChatMessage): void {
    if (document.visibilityState === 'visible') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(`Nova mensagem de ${msg.from.name}`, {
      body: msg.content,
      icon: '/favicon.ico',
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}

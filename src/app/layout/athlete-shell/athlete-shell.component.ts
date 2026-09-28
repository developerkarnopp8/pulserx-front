import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { NotificationPermissionBannerComponent } from '../../shared/components/notification-permission-banner/notification-permission-banner.component';
import { NotificationsBellComponent } from '../../shared/components/notifications-bell/notifications-bell.component';
import { athleteScreenTitle } from '../../shared/utils/athlete-screen-title';

@Component({
  selector: 'app-athlete-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationPermissionBannerComponent, NotificationsBellComponent],
  templateUrl: './athlete-shell.component.html',
  styleUrl: './athlete-shell.component.scss'
})
export class AthleteShellComponent implements OnInit, OnDestroy {
  menuOpen     = signal(false);
  unreadMsgs   = signal(0);
  /** Telas de tela-cheia (ex: treino ativo) escondem o header/nav fixos do shell. */
  fullScreen   = signal(false);
  /** Nome da tela atual, mostrado no cabeçalho abaixo da marca. */
  screenTitle  = signal('');

  /** Abas da barra inferior — Mensagens fica no cabeçalho (com contador), não aqui. */
  readonly tabs = [
    { path: '/athlete/home',         icon: 'home',            label: 'Início',   exact: true },
    { path: '/athlete/weekly',       icon: 'exercise',        label: 'Treino',   exact: false },
    { path: '/athlete/aulas',        icon: 'play_circle',     label: 'Aulas',    exact: false },
    { path: '/athlete/records',      icon: 'emoji_events',    label: 'PRs',      exact: false },
    { path: '/athlete/subscription', icon: 'account_circle',  label: 'Perfil',   exact: false },
    { path: '/athlete/history',      icon: 'insights',        label: 'Evolução', exact: false },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    public auth: AuthService,
    private socket: SocketService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Numa navegação direta pra URL (refresh, link direto), o NavigationEnd
    // dessa mesma navegação pode já ter disparado antes desse subscribe —
    // então também checamos a URL atual de cara, não só eventos futuros.
    this.fullScreen.set(this.router.url.includes('/athlete/active/'));
    this.screenTitle.set(athleteScreenTitle(this.router.url));

    this.socket.newMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.router.url.includes('/athlete/messages')) {
          this.unreadMsgs.update(n => n + 1);
        }
      });

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$),
    ).subscribe((e: any) => {
      const url = (e as NavigationEnd).urlAfterRedirects;
      if (url.includes('/athlete/messages')) {
        this.unreadMsgs.set(0);
      }
      this.fullScreen.set(url.includes('/athlete/active/'));
      this.screenTitle.set(athleteScreenTitle(url));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void { this.auth.logout(); }
}

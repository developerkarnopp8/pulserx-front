import { Component, signal } from '@angular/core';

const DISMISS_KEY = 'pulserx_notif_banner_dismissed';

@Component({
  selector: 'app-notification-permission-banner',
  standalone: true,
  templateUrl: './notification-permission-banner.component.html',
})
export class NotificationPermissionBannerComponent {
  visible = signal(this.shouldShow());

  async enable(): Promise<void> {
    if (!('Notification' in window)) return;
    await Notification.requestPermission();
    this.visible.set(false);
  }

  dismiss(): void {
    sessionStorage.setItem(DISMISS_KEY, '1');
    this.visible.set(false);
  }

  private shouldShow(): boolean {
    return (
      'Notification' in window &&
      Notification.permission === 'default' &&
      !sessionStorage.getItem(DISMISS_KEY)
    );
  }
}

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookieNoticeComponent } from './shared/components/cookie-notice/cookie-notice.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CookieNoticeComponent, ConfirmDialogComponent],
  template: '<router-outlet /><app-cookie-notice /><app-confirm-dialog />',
  styles: []
})
export class App {}

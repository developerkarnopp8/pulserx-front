import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookieNoticeComponent } from './shared/components/cookie-notice/cookie-notice.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CookieNoticeComponent],
  template: '<router-outlet /><app-cookie-notice />',
  styles: []
})
export class App {}

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { PublicCoachProfile, TRAINING_CATEGORY_LABEL } from '../../../core/models';
import { formatCents } from '../../../shared/utils/currency';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';

@Component({
  selector: 'app-coach-landing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, YoutubeEmbedComponent],
  templateUrl: './coach-landing.component.html',
})
export class CoachLandingComponent implements OnInit {
  profile  = signal<PublicCoachProfile | null>(null);
  loading  = signal(true);
  notFound = signal(false);

  sending  = signal(false);
  sent     = signal(false);
  errorMsg = signal('');

  showLeadForm = signal(false);

  leadForm: FormGroup;

  readonly fmtPrice = formatCents;
  readonly categoryLabel = TRAINING_CATEGORY_LABEL;

  slug = '';

  constructor(private api: ApiService, private route: ActivatedRoute, private fb: FormBuilder) {
    this.leadForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.maxLength(30)],
      message: ['', Validators.maxLength(1000)],
    });
  }

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.api.getPublicCoachProfile(this.slug).subscribe({
      next: profile => { this.profile.set(profile); this.loading.set(false); },
      error: () => { this.loading.set(false); this.notFound.set(true); },
    });
  }

  get whatsappLink(): string | null {
    const number = this.profile()?.whatsappNumber;
    if (!number) return null;
    return `https://wa.me/${number.replace(/\D/g, '')}`;
  }

  /** Plano do meio numa lista de 3 é destacado visualmente — puramente decorativo, sem campo novo no back. */
  isFeaturedPlan(index: number, total: number): boolean {
    return total === 3 && index === 1;
  }

  /**
   * Rola pra seção da própria página em vez de deixar o navegador resolver `href="#id"`.
   * Com `<base href="/">` (exigido pelo roteamento do Angular), um link só-fragmento resolve
   * pra `/#id` — a raiz do site, não a rota atual — e cai no redirect de `path: ''` pro login.
   */
  scrollToSection(id: string, event: Event): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  sendLead(): void {
    if (this.leadForm.invalid) { this.leadForm.markAllAsTouched(); return; }
    this.sending.set(true);
    this.errorMsg.set('');
    const { name, email, phone, message } = this.leadForm.value as {
      name: string; email: string; phone: string; message: string;
    };
    this.api.createLead(this.slug, {
      name: name.trim(), email: email.trim(), phone: phone?.trim() || undefined, message: message?.trim() || undefined,
    }).subscribe({
      next: () => { this.sending.set(false); this.sent.set(true); },
      error: () => { this.sending.set(false); this.errorMsg.set('Não foi possível enviar. Tente novamente.'); },
    });
  }
}

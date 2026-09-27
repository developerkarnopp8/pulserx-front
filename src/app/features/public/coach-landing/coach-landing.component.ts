import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { PublicCoachProfile, TRAINING_CATEGORY_LABEL } from '../../../core/models';
import { formatCents } from '../../../shared/utils/currency';

@Component({
  selector: 'app-coach-landing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  private slug = '';

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

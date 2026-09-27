import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { CoachProfile } from '../../../core/models';

const MAX_BANNER_SIZE_BYTES = 5 * 1024 * 1024;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './landing-page.component.html',
})
export class LandingPageComponent implements OnInit {
  profile  = signal<CoachProfile | null>(null);
  loading  = signal(true);
  saving   = signal(false);
  uploadingBanner = signal(false);
  publishing = signal(false);
  errorMsg   = signal('');
  successMsg = signal('');
  selectedBannerFile = signal<File | null>(null);

  form: FormGroup;

  readonly publicUrlOrigin = window.location.origin;

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      slug: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60), Validators.pattern(SLUG_PATTERN)]],
      bio: ['', Validators.maxLength(1000)],
    });
  }

  ngOnInit(): void {
    this.api.getMyCoachProfile().subscribe({
      next: profile => {
        this.profile.set(profile);
        if (profile) this.form.patchValue({ slug: profile.slug, bio: profile.bio ?? '' });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');
    const { slug, bio } = this.form.value as { slug: string; bio: string };
    this.api.upsertCoachProfile(slug.trim(), bio?.trim() || undefined).subscribe({
      next: profile => {
        this.profile.set(profile);
        this.saving.set(false);
        this.successMsg.set('Salvo!');
      },
      error: err => {
        this.saving.set(false);
        this.errorMsg.set(err?.status === 409
          ? 'Esse endereço já está em uso — escolha outro.'
          : 'Não foi possível salvar. Tente novamente.');
      },
    });
  }

  onBannerFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && file.size > MAX_BANNER_SIZE_BYTES) {
      this.selectedBannerFile.set(null);
      this.errorMsg.set('Arquivo muito grande — o limite é 5MB.');
      return;
    }
    this.selectedBannerFile.set(file);
  }

  uploadBanner(): void {
    const file = this.selectedBannerFile();
    if (!file) return;
    this.uploadingBanner.set(true);
    this.errorMsg.set('');
    this.api.uploadCoachBanner(file).subscribe({
      next: profile => {
        this.profile.set(profile);
        this.uploadingBanner.set(false);
        this.selectedBannerFile.set(null);
        this.successMsg.set('Banner atualizado!');
      },
      error: () => {
        this.uploadingBanner.set(false);
        this.errorMsg.set('Não foi possível enviar o banner. Confira se é uma imagem JPG/PNG/WebP de até 5MB.');
      },
    });
  }

  togglePublish(): void {
    const current = this.profile();
    if (!current) return;
    this.publishing.set(true);
    this.api.publishCoachProfile(!current.published).subscribe({
      next: profile => { this.profile.set(profile); this.publishing.set(false); },
      error: () => { this.publishing.set(false); this.errorMsg.set('Não foi possível atualizar a visibilidade.'); },
    });
  }
}

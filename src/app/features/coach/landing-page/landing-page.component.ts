import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DEFAULT_PILLARS, buildPageCopy } from '../../../shared/utils/landing-copy';
import { ApiService } from '../../../core/services/api.service';
import { CoachProfile, Testimonial, FaqItem } from '../../../core/models';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit {
  profile  = signal<CoachProfile | null>(null);
  loading  = signal(true);
  saving   = signal(false);
  uploadingBanner = signal(false);
  uploadingPhoto  = signal(false);
  publishing = signal(false);
  errorMsg   = signal('');
  successMsg = signal('');
  selectedBannerFile = signal<File | null>(null);
  selectedPhotoFile  = signal<File | null>(null);

  testimonials = signal<Testimonial[]>([]);
  showTestimonialForm = signal(false);
  editingTestimonialId = signal<string | null>(null);
  savingTestimonial = signal(false);

  faqItems = signal<FaqItem[]>([]);
  showFaqForm = signal(false);
  editingFaqId = signal<string | null>(null);
  savingFaq = signal(false);

  form: FormGroup;
  testimonialForm: FormGroup;
  faqForm: FormGroup;

  readonly publicUrlOrigin = window.location.origin;
  /** Padrões dos cards, mostrados como placeholder no editor. */
  readonly defaultPillars = DEFAULT_PILLARS;

  get pillarControls() {
    return (this.form.get('pillars') as FormArray).controls;
  }

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      slug: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60), Validators.pattern(SLUG_PATTERN)]],
      bio: ['', Validators.maxLength(1000)],
      headline: ['', Validators.maxLength(200)],
      subheadline: ['', Validators.maxLength(500)],
      quote: ['', Validators.maxLength(500)],
      achievementBadge: ['', Validators.maxLength(100)],
      yearsExperience: [null, [Validators.min(0), Validators.max(80)]],
      athletesCount: [null, [Validators.min(0)]],
      npsScore: [null, [Validators.min(0), Validators.max(100)]],
      completionRate: [null, [Validators.min(0), Validators.max(100)]],
      whatsappNumber: ['', Validators.maxLength(20)],
      videoUrl: ['', Validators.maxLength(300)],
      // Garantia (além dos 7 dias legais) e suporte
      guaranteeDays: [null, [Validators.min(1), Validators.max(365)]],
      guaranteeText: ['', Validators.maxLength(300)],
      supportEmail: ['', [Validators.email, Validators.maxLength(200)]],
      supportHours: ['', Validators.maxLength(100)],
      // Textos da página (vazio = padrão)
      howItWorksTitle: ['', Validators.maxLength(80)],
      plansTitle: ['', Validators.maxLength(80)],
      finalTitle: ['', Validators.maxLength(80)],
      finalCtaLabel: ['', Validators.maxLength(40)],
      pillars: this.fb.array(DEFAULT_PILLARS.map(() => this.fb.group({
        title: ['', Validators.maxLength(60)],
        text: ['', Validators.maxLength(200)],
      }))),
    });
    this.testimonialForm = this.fb.group({
      authorName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      authorRole: ['', Validators.maxLength(100)],
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      content: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(1000)]],
    });
    this.faqForm = this.fb.group({
      question: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(300)]],
      answer: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2000)]],
    });
  }

  ngOnInit(): void {
    this.api.getMyCoachProfile().subscribe({
      next: profile => {
        this.profile.set(profile);
        if (profile) {
          this.form.patchValue({
            slug: profile.slug, bio: profile.bio ?? '', headline: profile.headline ?? '',
            subheadline: profile.subheadline ?? '', quote: profile.quote ?? '',
            achievementBadge: profile.achievementBadge ?? '', yearsExperience: profile.yearsExperience,
            athletesCount: profile.athletesCount, npsScore: profile.npsScore,
            completionRate: profile.completionRate, whatsappNumber: profile.whatsappNumber ?? '',
            videoUrl: profile.videoUrl ?? '',
            guaranteeDays: profile.guaranteeDays ?? null, guaranteeText: profile.guaranteeText ?? '',
            supportEmail: profile.supportEmail ?? '', supportHours: profile.supportHours ?? '',
            howItWorksTitle: profile.pageCopy?.howItWorksTitle ?? '', plansTitle: profile.pageCopy?.plansTitle ?? '',
            finalTitle: profile.pageCopy?.finalTitle ?? '', finalCtaLabel: profile.pageCopy?.finalCtaLabel ?? '',
            pillars: DEFAULT_PILLARS.map((_, i) => ({
              title: profile.pageCopy?.pillars?.[i]?.title ?? '',
              text: profile.pageCopy?.pillars?.[i]?.text ?? '',
            })),
          });
          this.loadTestimonials();
          this.loadFaqItems();
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadTestimonials(): void {
    this.api.getCoachTestimonials().subscribe(list => this.testimonials.set(list));
  }

  private loadFaqItems(): void {
    this.api.getCoachFaqItems().subscribe(list => this.faqItems.set(list));
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');
    const v = this.form.value as Record<string, string | number | null>;
    const isNewProfile = !this.profile();
    this.api.upsertCoachProfile({
      slug: (v['slug'] as string).trim(),
      bio: (v['bio'] as string)?.trim() || undefined,
      headline: (v['headline'] as string)?.trim() || undefined,
      subheadline: (v['subheadline'] as string)?.trim() || undefined,
      quote: (v['quote'] as string)?.trim() || undefined,
      achievementBadge: (v['achievementBadge'] as string)?.trim() || undefined,
      yearsExperience: v['yearsExperience'] ?? undefined,
      athletesCount: v['athletesCount'] ?? undefined,
      npsScore: v['npsScore'] ?? undefined,
      completionRate: v['completionRate'] ?? undefined,
      whatsappNumber: (v['whatsappNumber'] as string)?.trim() || undefined,
      videoUrl: (v['videoUrl'] as string)?.trim() || undefined,
      // null limpa no backend (tirar a garantia/suporte tem de funcionar)
      guaranteeDays: v['guaranteeDays'] || null,
      guaranteeText: (v['guaranteeText'] as string)?.trim() || null,
      supportEmail: (v['supportEmail'] as string)?.trim() || null,
      supportHours: (v['supportHours'] as string)?.trim() || null,
      pageCopy: buildPageCopy(this.form.value),
    } as never).subscribe({
      next: profile => {
        this.profile.set(profile);
        this.saving.set(false);
        this.successMsg.set('Salvo!');
        if (isNewProfile) { this.loadTestimonials(); this.loadFaqItems(); }
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
    const file = this.pickValidImage(event);
    if (file !== undefined) this.selectedBannerFile.set(file);
  }

  onPhotoFileSelected(event: Event): void {
    const file = this.pickValidImage(event);
    if (file !== undefined) this.selectedPhotoFile.set(file);
  }

  private pickValidImage(event: Event): File | null | undefined {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && file.size > MAX_IMAGE_SIZE_BYTES) {
      this.errorMsg.set('Arquivo muito grande — o limite é 5MB.');
      return undefined;
    }
    return file;
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

  uploadPhoto(): void {
    const file = this.selectedPhotoFile();
    if (!file) return;
    this.uploadingPhoto.set(true);
    this.errorMsg.set('');
    this.api.uploadCoachPhoto(file).subscribe({
      next: profile => {
        this.profile.set(profile);
        this.uploadingPhoto.set(false);
        this.selectedPhotoFile.set(null);
        this.successMsg.set('Foto atualizada!');
      },
      error: () => {
        this.uploadingPhoto.set(false);
        this.errorMsg.set('Não foi possível enviar a foto. Confira se é uma imagem JPG/PNG/WebP de até 5MB.');
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

  // ── Depoimentos ──────────────────────────────────────────────────────────

  openNewTestimonialForm(): void {
    this.editingTestimonialId.set(null);
    this.testimonialForm.reset({ rating: 5 });
    this.showTestimonialForm.set(true);
  }

  editTestimonial(t: Testimonial): void {
    this.editingTestimonialId.set(t.id);
    this.testimonialForm.patchValue({ authorName: t.authorName, authorRole: t.authorRole ?? '', rating: t.rating, content: t.content });
    this.showTestimonialForm.set(true);
  }

  cancelTestimonialForm(): void {
    this.showTestimonialForm.set(false);
    this.editingTestimonialId.set(null);
  }

  saveTestimonial(): void {
    if (this.testimonialForm.invalid) { this.testimonialForm.markAllAsTouched(); return; }
    this.savingTestimonial.set(true);
    const v = this.testimonialForm.value as { authorName: string; authorRole: string; rating: number; content: string };
    const dto = { authorName: v.authorName.trim(), authorRole: v.authorRole?.trim() || undefined, rating: v.rating, content: v.content.trim() };
    const editingId = this.editingTestimonialId();
    const request = editingId ? this.api.updateTestimonial(editingId, dto) : this.api.createTestimonial(dto);
    request.subscribe({
      next: () => {
        this.savingTestimonial.set(false);
        this.showTestimonialForm.set(false);
        this.editingTestimonialId.set(null);
        this.loadTestimonials();
      },
      error: () => {
        this.savingTestimonial.set(false);
        this.errorMsg.set('Não foi possível salvar o depoimento.');
      },
    });
  }

  removeTestimonial(id: string): void {
    if (!confirm('Remover este depoimento?')) return;
    this.api.deleteTestimonial(id).subscribe(() => this.loadTestimonials());
  }

  // ── FAQ ──────────────────────────────────────────────────────────────────

  openNewFaqForm(): void {
    this.editingFaqId.set(null);
    this.faqForm.reset();
    this.showFaqForm.set(true);
  }

  editFaqItem(item: FaqItem): void {
    this.editingFaqId.set(item.id);
    this.faqForm.patchValue({ question: item.question, answer: item.answer });
    this.showFaqForm.set(true);
  }

  cancelFaqForm(): void {
    this.showFaqForm.set(false);
    this.editingFaqId.set(null);
  }

  saveFaqItem(): void {
    if (this.faqForm.invalid) { this.faqForm.markAllAsTouched(); return; }
    this.savingFaq.set(true);
    const v = this.faqForm.value as { question: string; answer: string };
    const dto = { question: v.question.trim(), answer: v.answer.trim() };
    const editingId = this.editingFaqId();
    const request = editingId ? this.api.updateFaqItem(editingId, dto) : this.api.createFaqItem(dto);
    request.subscribe({
      next: () => {
        this.savingFaq.set(false);
        this.showFaqForm.set(false);
        this.editingFaqId.set(null);
        this.loadFaqItems();
      },
      error: () => {
        this.savingFaq.set(false);
        this.errorMsg.set('Não foi possível salvar a pergunta.');
      },
    });
  }

  removeFaqItem(id: string): void {
    if (!confirm('Remover esta pergunta?')) return;
    this.api.deleteFaqItem(id).subscribe(() => this.loadFaqItems());
  }
}

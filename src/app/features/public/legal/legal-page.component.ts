import { Component, computed } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LEGAL_COMPANY, LEGAL_DOCS, LEGAL_LAST_UPDATED, LegalDocKey } from './legal-content';

/** Página pública de um documento legal (`/termos`, `/privacidade`, `/cookies`, `/reembolso`). */
@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal-page.component.html',
})
export class LegalPageComponent {
  readonly company = LEGAL_COMPANY;
  readonly lastUpdated = LEGAL_LAST_UPDATED;
  readonly links = (Object.keys(LEGAL_DOCS) as LegalDocKey[]).map(key => ({ key, title: LEGAL_DOCS[key].title }));

  readonly doc = computed(() => LEGAL_DOCS[(this.route.snapshot.data['doc'] as LegalDocKey) ?? 'termos'] ?? LEGAL_DOCS.termos);

  /**
   * Com histórico (veio da página do coach etc.) o botão volta; sem histórico a página abriu numa
   * aba nova (link da inscrição, pra não perder o formulário) — aí orienta a fechar a aba.
   */
  readonly canGoBack = typeof window !== 'undefined' && window.history.length > 1;

  constructor(private route: ActivatedRoute, private location: Location) {}

  back(): void {
    this.location.back();
  }
}

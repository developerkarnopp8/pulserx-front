import { Component, computed } from '@angular/core';
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

  constructor(private route: ActivatedRoute) {}
}

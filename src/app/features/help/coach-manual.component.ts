import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { COACH_MANUAL, COACH_MANUAL_UPDATED } from './coach-manual';

/** Endereço do PDF do manual (gerado a partir da versão para imprimir; fica em public/). */
export const COACH_MANUAL_PDF = '/manual-coach-pulserx.pdf';

/**
 * Manual do coach. Duas formas, mesmo conteúdo (`coach-manual.ts`):
 * - `/coach/ajuda`: dentro do painel, no tema escuro, com o botão de baixar o PDF;
 * - `/manual-coach` (pública, `data.printable`): clara, sem menu — é dela que sai o PDF.
 */
@Component({
  selector: 'app-coach-manual',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './coach-manual.component.html',
  styleUrl: './coach-manual.component.scss',
})
export class CoachManualComponent {
  readonly sections = COACH_MANUAL;
  readonly updated = COACH_MANUAL_UPDATED;
  readonly pdfUrl = COACH_MANUAL_PDF;
  readonly printable: boolean;

  constructor(route: ActivatedRoute, title: Title) {
    this.printable = route.snapshot.data['printable'] === true;
    // Também vira o título do PDF.
    title.setTitle('Manual do coach — PulseRx');
  }

  /** Índice: rola até a seção sem mexer na URL (com <base href="/">, href="#id" iria para a raiz do site). */
  scrollToSection(id: string, event: Event): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { extractYoutubeId, youtubeEmbedUrl } from '../../utils/youtube';

/**
 * Player de vídeo embutido (YouTube) usado pra demonstração de movimento. Só embute quando
 * a URL é reconhecidamente do YouTube (extractYoutubeId) — nunca passa a URL crua pro iframe.
 * Sem clique nenhum vídeo carrega (facade): evita puxar script/cookie do YouTube pra quem só
 * está navegando o plano sem intenção de assistir.
 */
@Component({
  selector: 'app-youtube-embed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './youtube-embed.component.html',
  styleUrl: './youtube-embed.component.scss',
})
export class YoutubeEmbedComponent {
  private _url = signal<string | null | undefined>(null);
  @Input() set url(value: string | null | undefined) {
    this._url.set(value);
    this.playing.set(false);
  }

  playing = signal(false);

  videoId = computed(() => extractYoutubeId(this._url()));

  /** null até o usuário clicar em play — não constrói/sanitiza a URL do iframe antes disso. */
  embedSrc(): SafeResourceUrl | null {
    if (!this.playing()) return null;
    const id = this.videoId();
    return id ? this.sanitizer.bypassSecurityTrustResourceUrl(`${youtubeEmbedUrl(id)}?autoplay=1&rel=0`) : null;
  }

  thumbnailUrl(): string {
    return `https://i.ytimg.com/vi/${this.videoId()}/hqdefault.jpg`;
  }

  constructor(private sanitizer: DomSanitizer) {}

  play(): void {
    if (this.videoId()) this.playing.set(true);
  }
}

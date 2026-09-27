import { YoutubeEmbedComponent } from './youtube-embed.component';

function build() {
  const sanitizer = { bypassSecurityTrustResourceUrl: vi.fn((url: string) => `SAFE(${url})`) };
  const component = new YoutubeEmbedComponent(sanitizer as any);
  return { component, sanitizer };
}

describe('YoutubeEmbedComponent', () => {
  it('extrai o id de uma URL válida (exemplo real do dono)', () => {
    const { component } = build();
    component.url = 'https://youtu.be/Bmck39ni_V4';
    expect(component.videoId()).toBe('Bmck39ni_V4');
  });

  it('sem URL ou URL que não é do YouTube: videoId null, nada é renderizado', () => {
    const { component } = build();
    component.url = null;
    expect(component.videoId()).toBeNull();
    component.url = 'https://vimeo.com/123456';
    expect(component.videoId()).toBeNull();
  });

  it('começa parado (facade) — não carrega o iframe sem clique', () => {
    const { component } = build();
    component.url = 'https://youtu.be/Bmck39ni_V4';
    expect(component.playing()).toBe(false);
    expect(component.embedSrc()).toBeNull();
  });

  it('trocar a URL reseta o estado "tocando" (não vaza o player do exercício anterior)', () => {
    const { component } = build();
    component.url = 'https://youtu.be/Bmck39ni_V4';
    component.play();
    expect(component.playing()).toBe(true);

    component.url = 'https://youtu.be/outroVideo1';
    expect(component.playing()).toBe(false);
  });

  it('play() sem id válido não faz nada', () => {
    const { component } = build();
    component.url = 'não é url';
    component.play();
    expect(component.playing()).toBe(false);
  });

  it('play() com id válido: embedSrc() passa a usar o sanitizer (nunca a URL crua pro iframe)', () => {
    const { component, sanitizer } = build();
    component.url = 'https://youtu.be/Bmck39ni_V4';
    component.play();

    expect(component.embedSrc()).toBe('SAFE(https://www.youtube-nocookie.com/embed/Bmck39ni_V4?autoplay=1&rel=0)');
    expect(sanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith(
      'https://www.youtube-nocookie.com/embed/Bmck39ni_V4?autoplay=1&rel=0',
    );
  });

  it('thumbnail usa o domínio de imagens do YouTube com o id certo', () => {
    const { component } = build();
    component.url = 'https://youtu.be/Bmck39ni_V4';
    expect(component.thumbnailUrl()).toBe('https://i.ytimg.com/vi/Bmck39ni_V4/hqdefault.jpg');
  });
});

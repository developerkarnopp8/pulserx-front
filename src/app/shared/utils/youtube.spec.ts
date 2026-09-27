import { extractYoutubeId, youtubeEmbedUrl } from './youtube';

describe('extractYoutubeId', () => {
  it('youtu.be (exemplo real enviado pelo dono)', () => {
    expect(extractYoutubeId('https://youtu.be/Bmck39ni_V4')).toBe('Bmck39ni_V4');
  });

  it('youtube.com/watch?v=', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=Bmck39ni_V4')).toBe('Bmck39ni_V4');
    expect(extractYoutubeId('https://youtube.com/watch?v=Bmck39ni_V4&t=30s')).toBe('Bmck39ni_V4');
  });

  it('shorts e embed', () => {
    expect(extractYoutubeId('https://www.youtube.com/shorts/Bmck39ni_V4')).toBe('Bmck39ni_V4');
    expect(extractYoutubeId('https://www.youtube.com/embed/Bmck39ni_V4')).toBe('Bmck39ni_V4');
  });

  it('m.youtube.com', () => {
    expect(extractYoutubeId('https://m.youtube.com/watch?v=Bmck39ni_V4')).toBe('Bmck39ni_V4');
  });

  it('youtu.be com parâmetro extra', () => {
    expect(extractYoutubeId('https://youtu.be/Bmck39ni_V4?si=abc123')).toBe('Bmck39ni_V4');
  });

  it('null/vazio/URL malformada → null', () => {
    expect(extractYoutubeId(null)).toBeNull();
    expect(extractYoutubeId(undefined)).toBeNull();
    expect(extractYoutubeId('')).toBeNull();
    expect(extractYoutubeId('não é url')).toBeNull();
  });

  it('domínio que não é YouTube → null (nunca embute outro site)', () => {
    expect(extractYoutubeId('https://vimeo.com/123456')).toBeNull();
    expect(extractYoutubeId('https://evil.com/watch?v=Bmck39ni_V4')).toBeNull();
    // domínio parecido mas não é youtube.com de verdade
    expect(extractYoutubeId('https://youtube.com.evil.com/watch?v=Bmck39ni_V4')).toBeNull();
    // truque de userinfo: o navegador resolve o hostname pra evil.com, não youtube.com
    expect(extractYoutubeId('https://youtube.com@evil.com/watch?v=Bmck39ni_V4')).toBeNull();
    expect(extractYoutubeId('https://evil.com/?x=youtube.com')).toBeNull();
  });

  it('watch sem v= ou id fora do formato de 11 caracteres → null', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch')).toBeNull();
    expect(extractYoutubeId('https://youtu.be/curto')).toBeNull();
  });
});

describe('youtubeEmbedUrl', () => {
  it('monta a URL do player sem cookies de terceiros', () => {
    expect(youtubeEmbedUrl('Bmck39ni_V4')).toBe('https://www.youtube-nocookie.com/embed/Bmck39ni_V4');
  });
});

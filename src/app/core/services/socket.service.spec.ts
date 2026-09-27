const ioMock = vi.fn();

vi.mock('socket.io-client', () => ({ io: (...args: unknown[]) => ioMock(...args) }));

import { SocketService } from './socket.service';

function fakeSocket(connected = false) {
  const handlers: Record<string, (payload: unknown) => void> = {};
  return {
    connected,
    on: vi.fn((event: string, cb: (payload: unknown) => void) => { handlers[event] = cb; }),
    disconnect: vi.fn(),
    emit(event: string, payload: unknown) { handlers[event]?.(payload); },
  };
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

describe('SocketService.connect', () => {
  beforeEach(() => { ioMock.mockReset(); });

  it('conecta ao namespace /messages com o token de auth', () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    const service = new SocketService();

    service.connect('tok-1');

    expect(ioMock).toHaveBeenCalledWith('http://localhost:3000/messages', {
      auth: { token: 'tok-1' },
      transports: ['websocket'],
    });
    expect(socket.on).toHaveBeenCalledWith('new_message', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('new_notification', expect.any(Function));
  });

  it('já conectado: não chama io() de novo', () => {
    const socket = fakeSocket(true);
    ioMock.mockReturnValue(socket);
    const service = new SocketService();
    service.connect('tok-1');
    ioMock.mockClear();

    service.connect('tok-1');

    expect(ioMock).not.toHaveBeenCalled();
  });

  it('evento new_message: emite em newMessage$', () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    setVisibility('visible');
    const service = new SocketService();
    service.connect('tok-1');

    const received: unknown[] = [];
    service.newMessage$.subscribe(m => received.push(m));
    socket.emit('new_message', { id: 'm1', from: { name: 'Ana' }, content: 'Oi' });

    expect(received).toHaveLength(1);
  });

  it('evento new_notification: emite em newNotification$', () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    const service = new SocketService();
    service.connect('tok-1');

    const received: unknown[] = [];
    service.newNotification$.subscribe(n => received.push(n));
    socket.emit('new_notification', { id: 'n1' });

    expect(received).toHaveLength(1);
  });
});

describe('SocketService.disconnect', () => {
  beforeEach(() => { ioMock.mockReset(); });

  it('desconecta o socket ativo e zera a referência', () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    const service = new SocketService();
    service.connect('tok-1');

    service.disconnect();

    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('sem socket ativo: não lança (optional chaining)', () => {
    const service = new SocketService();
    expect(() => service.disconnect()).not.toThrow();
  });

  it('ngOnDestroy chama disconnect', () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    const service = new SocketService();
    service.connect('tok-1');

    service.ngOnDestroy();

    expect(socket.disconnect).toHaveBeenCalled();
  });
});

describe('SocketService — notificação do browser em nova mensagem', () => {
  const originalNotification = (globalThis as any).Notification;
  beforeEach(() => { ioMock.mockReset(); });
  afterEach(() => { (globalThis as any).Notification = originalNotification; });

  it('aba visível: não notifica', () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    setVisibility('visible');
    const NotificationCtor = vi.fn();
    (globalThis as any).Notification = NotificationCtor;
    const service = new SocketService();
    service.connect('tok-1');

    socket.emit('new_message', { from: { name: 'Ana' }, content: 'Oi' });

    expect(NotificationCtor).not.toHaveBeenCalled();
  });

  it('aba oculta mas API Notification indisponível: não notifica, sem lançar', () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    setVisibility('hidden');
    delete (globalThis as any).Notification;
    const service = new SocketService();
    service.connect('tok-1');

    expect(() => socket.emit('new_message', { from: { name: 'Ana' }, content: 'Oi' })).not.toThrow();
  });

  it('aba oculta, API disponível mas sem permissão concedida: não notifica', () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    setVisibility('hidden');
    const NotificationCtor = vi.fn() as any;
    NotificationCtor.permission = 'denied';
    (globalThis as any).Notification = NotificationCtor;
    const service = new SocketService();
    service.connect('tok-1');

    socket.emit('new_message', { from: { name: 'Ana' }, content: 'Oi' });

    expect(NotificationCtor).not.toHaveBeenCalled();
  });

  it('aba oculta, permissão concedida: dispara Notification com nome do remetente + conteúdo', () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    setVisibility('hidden');
    const NotificationCtor = vi.fn() as any;
    NotificationCtor.permission = 'granted';
    (globalThis as any).Notification = NotificationCtor;
    const service = new SocketService();
    service.connect('tok-1');

    socket.emit('new_message', { from: { name: 'Ana' }, content: 'Oi' });

    expect(NotificationCtor).toHaveBeenCalledWith('Nova mensagem de Ana', { body: 'Oi', icon: '/favicon.ico' });
  });
});

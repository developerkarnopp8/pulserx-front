const ioMock = vi.fn();

vi.mock('socket.io-client', () => ({ io: (...args: unknown[]) => ioMock(...args) }));

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

// Import dinâmico + vi.resetModules(): outro arquivo de spec pode ter importado
// `auth.service.ts` (que importa SocketService de verdade, sem mock) antes deste
// arquivo rodar no mesmo worker — sem isso, o vi.mock acima não pega o módulo
// já resolvido sem mock e o teste vira flaky dependendo da ordem de execução.
async function buildService() {
  vi.resetModules();
  const { SocketService } = await import('./socket.service');
  return new SocketService();
}

describe('SocketService.connect', () => {
  beforeEach(() => { ioMock.mockReset(); });

  it('conecta ao namespace /messages com o token de auth', async () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    const service = await buildService();

    service.connect('tok-1');

    expect(ioMock).toHaveBeenCalledWith('http://localhost:3000/messages', {
      auth: { token: 'tok-1' },
      transports: ['websocket'],
    });
    expect(socket.on).toHaveBeenCalledWith('new_message', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('new_notification', expect.any(Function));
  });

  it('já conectado: não chama io() de novo', async () => {
    const socket = fakeSocket(true);
    ioMock.mockReturnValue(socket);
    const service = await buildService();
    service.connect('tok-1');
    ioMock.mockClear();

    service.connect('tok-1');

    expect(ioMock).not.toHaveBeenCalled();
  });

  it('evento new_message: emite em newMessage$', async () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    setVisibility('visible');
    const service = await buildService();
    service.connect('tok-1');

    const received: unknown[] = [];
    service.newMessage$.subscribe(m => received.push(m));
    socket.emit('new_message', { id: 'm1', from: { name: 'Ana' }, content: 'Oi' });

    expect(received).toHaveLength(1);
  });

  it('evento new_notification: emite em newNotification$', async () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    const service = await buildService();
    service.connect('tok-1');

    const received: unknown[] = [];
    service.newNotification$.subscribe(n => received.push(n));
    socket.emit('new_notification', { id: 'n1' });

    expect(received).toHaveLength(1);
  });
});

describe('SocketService.connect — troca de conta na mesma aba', () => {
  beforeEach(() => { ioMock.mockReset(); });

  it('token de OUTRO usuário: fecha o socket anterior e abre um novo com o token novo', async () => {
    const coachSocket = fakeSocket(true);
    const athleteSocket = fakeSocket();
    ioMock.mockReturnValueOnce(coachSocket).mockReturnValueOnce(athleteSocket);
    const service = await buildService();

    service.connect('tok-coach');
    service.connect('tok-athlete');

    expect(coachSocket.disconnect).toHaveBeenCalled();
    expect(ioMock).toHaveBeenLastCalledWith('http://localhost:3000/messages', {
      auth: { token: 'tok-athlete' },
      transports: ['websocket'],
    });
  });

  it('depois da troca, as mensagens chegam pelo socket do usuário novo', async () => {
    const coachSocket = fakeSocket(true);
    const athleteSocket = fakeSocket();
    ioMock.mockReturnValueOnce(coachSocket).mockReturnValueOnce(athleteSocket);
    const service = await buildService();
    service.connect('tok-coach');
    service.connect('tok-athlete');
    const received: unknown[] = [];
    service.newMessage$.subscribe(m => received.push(m));

    athleteSocket.emit('new_message', { id: 'm-atleta', from: { name: 'Luan' } });

    expect(received).toEqual([{ id: 'm-atleta', from: { name: 'Luan' } }]);
    expect(ioMock).toHaveBeenCalledTimes(2);
  });

  it('mesmo token ainda conectando: não abre um segundo socket', async () => {
    const socket = fakeSocket(false);
    ioMock.mockReturnValue(socket);
    const service = await buildService();

    service.connect('tok-1');
    service.connect('tok-1');

    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('depois do logout (disconnect), o mesmo token reconecta', async () => {
    ioMock.mockImplementation(() => fakeSocket());
    const service = await buildService();
    service.connect('tok-1');
    service.disconnect();

    service.connect('tok-1');

    expect(ioMock).toHaveBeenCalledTimes(2);
  });
});

describe('SocketService.disconnect', () => {
  beforeEach(() => { ioMock.mockReset(); });

  it('desconecta o socket ativo e zera a referência', async () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    const service = await buildService();
    service.connect('tok-1');

    service.disconnect();

    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('sem socket ativo: não lança (optional chaining)', async () => {
    const service = await buildService();
    expect(() => service.disconnect()).not.toThrow();
  });

  it('ngOnDestroy chama disconnect', async () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    const service = await buildService();
    service.connect('tok-1');

    service.ngOnDestroy();

    expect(socket.disconnect).toHaveBeenCalled();
  });
});

describe('SocketService — notificação do browser em nova mensagem', () => {
  const originalNotification = (globalThis as any).Notification;
  beforeEach(() => { ioMock.mockReset(); });
  afterEach(() => { (globalThis as any).Notification = originalNotification; });

  it('aba visível: não notifica', async () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    setVisibility('visible');
    const NotificationCtor = vi.fn();
    (globalThis as any).Notification = NotificationCtor;
    const service = await buildService();
    service.connect('tok-1');

    socket.emit('new_message', { from: { name: 'Ana' }, content: 'Oi' });

    expect(NotificationCtor).not.toHaveBeenCalled();
  });

  it('aba oculta mas API Notification indisponível: não notifica, sem lançar', async () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    setVisibility('hidden');
    delete (globalThis as any).Notification;
    const service = await buildService();
    service.connect('tok-1');

    expect(() => socket.emit('new_message', { from: { name: 'Ana' }, content: 'Oi' })).not.toThrow();
  });

  it('aba oculta, API disponível mas sem permissão concedida: não notifica', async () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    setVisibility('hidden');
    const NotificationCtor = vi.fn() as any;
    NotificationCtor.permission = 'denied';
    (globalThis as any).Notification = NotificationCtor;
    const service = await buildService();
    service.connect('tok-1');

    socket.emit('new_message', { from: { name: 'Ana' }, content: 'Oi' });

    expect(NotificationCtor).not.toHaveBeenCalled();
  });

  it('aba oculta, permissão concedida: dispara Notification com nome do remetente + conteúdo', async () => {
    const socket = fakeSocket();
    ioMock.mockReturnValue(socket);
    setVisibility('hidden');
    const NotificationCtor = vi.fn() as any;
    NotificationCtor.permission = 'granted';
    (globalThis as any).Notification = NotificationCtor;
    const service = await buildService();
    service.connect('tok-1');

    socket.emit('new_message', { from: { name: 'Ana' }, content: 'Oi' });

    expect(NotificationCtor).toHaveBeenCalledWith('Nova mensagem de Ana', { body: 'Oi', icon: '/favicon.ico' });
  });
});

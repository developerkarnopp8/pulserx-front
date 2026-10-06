import { Component, OnInit, OnDestroy, signal, computed, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService, ChatMessage } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';

interface Conversation {
  athleteId: string;
  athleteName: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

@Component({
  selector: 'app-coach-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
})
export class CoachMessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatEnd') chatEnd!: ElementRef;

  conversations = signal<Conversation[]>([]);
  messages      = signal<ChatMessage[]>([]);
  selectedId    = signal<string | null>(null);
  selectedName  = signal('');
  loading       = signal(true);
  sending       = signal(false);
  mobileView    = signal<'list' | 'chat'>('list');
  newMsg        = '';

  myId = computed(() => this.auth.currentUser()?.id ?? '');

  /** Filtro da lista: todas ou só as com mensagem não lida; busca por nome do atleta. */
  convFilter = signal<'all' | 'unread'>('all');
  convSearch = signal('');
  totalUnread = computed(() => this.conversations().reduce((n, c) => n + c.unread, 0));
  filteredConversations = computed(() => {
    const q = this.convSearch().trim().toLowerCase();
    return this.conversations().filter(c =>
      (this.convFilter() === 'all' || c.unread > 0) && (!q || c.athleteName.toLowerCase().includes(q)));
  });

  private destroy$ = new Subject<void>();

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private socket: SocketService,
  ) {}

  ngOnInit(): void {
    this.socket.newMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        // Adiciona à conversa aberta se for do atleta selecionado
        if (msg.fromId === this.selectedId()) {
          this.messages.update(list => [...list, msg]);
        }
        // Atualiza preview na lista de conversas
        this.conversations.update(list => {
          const exists = list.find(c => c.athleteId === msg.fromId);
          if (exists) {
            return list.map(c => c.athleteId === msg.fromId
              ? { ...c, lastMessage: msg.content, lastAt: msg.createdAt, unread: c.athleteId !== this.selectedId() ? c.unread + 1 : 0 }
              : c);
          }
          // Nova conversa — adiciona no topo
          return [{ athleteId: msg.fromId, athleteName: msg.from.name, lastMessage: msg.content, lastAt: msg.createdAt, unread: 1 }, ...list];
        });
      });

    this.api.getInbox().subscribe({
      next: inbox => {
        const convMap = new Map<string, Conversation>();
        for (const msg of inbox) {
          const other = msg.fromId === this.myId() ? msg.to : msg.from;
          if (!convMap.has(other.id)) {
            convMap.set(other.id, {
              athleteId:   other.id,
              athleteName: other.name,
              lastMessage: msg.content,
              lastAt:      msg.createdAt,
              unread:      !msg.read && msg.toId === this.myId() ? 1 : 0,
            });
          }
        }
        this.conversations.set(Array.from(convMap.values()));
        this.loading.set(false);
        if (convMap.size > 0) {
          const first = Array.from(convMap.values())[0];
          this.openConversation(first.athleteId, first.athleteName);
          this.mobileView.set('list'); // auto-abertura não força o chat no mobile — só o clique explícito
        }
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    try { this.chatEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }

  openConversation(athleteId: string, athleteName: string): void {
    this.selectedId.set(athleteId);
    this.selectedName.set(athleteName);
    this.messages.set([]);
    this.api.getConversation(athleteId).subscribe({
      next: msgs => this.messages.set(msgs),
    });
    this.mobileView.set('chat');
  }

  backToList(): void { this.mobileView.set('list'); }

  send(): void {
    const content = this.newMsg.trim();
    const toId = this.selectedId();
    if (!content || !toId || this.sending()) return;
    this.sending.set(true);
    this.newMsg = '';
    this.api.sendMessage(toId, content).subscribe({
      next: msg => {
        this.messages.update(list => [...list, msg]);
        this.conversations.update(list =>
          list.map(c => c.athleteId === toId ? { ...c, lastMessage: msg.content, lastAt: msg.createdAt } : c)
        );
        this.sending.set(false);
      },
      error: () => this.sending.set(false),
    });
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Hoje';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  groupedMessages = computed(() => {
    const msgs = this.messages();
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';
    for (const m of msgs) {
      const d = this.formatDate(m.createdAt);
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, messages: [m] });
      } else {
        groups[groups.length - 1].messages.push(m);
      }
    }
    return groups;
  });
}

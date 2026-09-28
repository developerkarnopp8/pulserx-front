import { Component, OnInit, OnDestroy, signal, computed, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService, ChatMessage } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';

@Component({
  selector: 'app-athlete-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.component.html',
})
export class AthleteMessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatEnd') chatEnd!: ElementRef;

  messages  = signal<ChatMessage[]>([]);
  loading   = signal(true);
  sending   = signal(false);
  newMsg    = '';
  coachId   = signal<string | null>(null);
  coachName = signal('Coach');

  myId = computed(() => this.auth.currentUser()?.id ?? '');

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
        // Só entra na conversa o que o coach mandou pra MIM — nunca um evento de outra conversa.
        if (msg.fromId !== this.coachId() || msg.toId !== this.myId()) return;
        this.messages.update(list => [...list, msg]);
      });

    // Carrega inbox para descobrir o coachId
    this.api.getInbox().subscribe({
      next: inbox => {
        if (inbox.length > 0) {
          const msg  = inbox[0];
          const other = msg.fromId === this.myId() ? msg.to : msg.from;
          this.coachId.set(other.id);
          this.coachName.set(other.name);
          this.loadConversation(other.id);
        } else {
          // Tenta buscar o coachId via perfil de aluno
          this.api.getMyStudentProfile().subscribe({
            next: student => {
              this.coachId.set(student.coachId);
              this.loadConversation(student.coachId);
            },
            error: () => this.loading.set(false),
          });
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
    this.scrollToBottom();
  }

  private loadConversation(otherId: string): void {
    this.api.getConversation(otherId).subscribe({
      next: msgs => { this.messages.set(msgs); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  send(): void {
    const content = this.newMsg.trim();
    const toId = this.coachId();
    if (!content || !toId || this.sending()) return;

    this.sending.set(true);
    this.newMsg = '';
    this.api.sendMessage(toId, content).subscribe({
      next: msg => {
        this.messages.update(list => [...list, msg]);
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

  /** Group messages by date for dividers */
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

  private scrollToBottom(): void {
    try { this.chatEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }
}

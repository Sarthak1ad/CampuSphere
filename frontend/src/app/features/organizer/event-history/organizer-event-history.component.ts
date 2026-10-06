import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { Event } from '../../../core/models';

@Component({
  selector: 'app-organizer-event-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="fade-in">
      <div class="page-header-row">
        <div>
          <h2 class="font-heading">Event History</h2>
          <p>Review completed and past events managed by your organizer account.</p>
        </div>
        <a routerLink="/organizer/events" class="btn btn-outline"><i class="fa-solid fa-calendar-days"></i> My Events</a>
      </div>

      <div *ngIf="isLoading" class="state"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>
      <div *ngIf="!isLoading && history().length === 0" class="card state">No completed events yet.</div>
      <div *ngIf="!isLoading && history().length > 0" class="card history-list">
        <div *ngFor="let event of history()" class="history-row">
          <div class="history-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
          <div class="history-info">
            <strong>{{ event.title }}</strong>
            <span>{{ event.category }} · Ended {{ event.endDate | date:'mediumDate' }}</span>
          </div>
          <span class="badge badge-info">{{ event.status === 'completed' ? 'Completed' : 'Past event' }}</span>
          <a [routerLink]="['/organizer/events', event._id, 'report']" class="btn btn-sm btn-outline">View report</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header-row { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;gap:1rem; }
    .page-header-row h2 { margin:0 0 .25rem; }
    .page-header-row p { margin:0;color:var(--text-muted); }
    .state { padding:3rem;text-align:center;color:var(--text-muted); }
    .history-list { padding:1.5rem;display:flex;flex-direction:column;gap:.75rem; }
    .history-row { display:flex;align-items:center;gap:1rem;padding:1rem;border:1px solid var(--border-light);border-radius:10px; }
    .history-icon { width:40px;height:40px;border-radius:10px;background:#EFF6FF;color:#3B82F6;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .history-info { display:flex;flex-direction:column;gap:.25rem;flex:1;min-width:0; }
    .history-info strong { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .history-info span { color:var(--text-muted);font-size:.8rem; }
    @media (max-width:700px) { .page-header-row,.history-row { flex-wrap:wrap; } .history-row .btn { margin-left:56px; } }
  `]
})
export class OrganizerEventHistoryComponent implements OnInit {
  private eventService = inject(EventService);
  events = signal<Event[]>([]);
  isLoading = true;

  history = computed(() => this.events()
    .filter(event => event.status === 'completed' || new Date(event.endDate).getTime() <= Date.now())
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()));

  ngOnInit(): void {
    this.eventService.getEvents({ myEvents: 'true', limit: 100 }).subscribe({
      next: response => {
        this.isLoading = false;
        if (response.success && response.data) this.events.set(response.data);
      },
      error: () => { this.isLoading = false; }
    });
  }
}

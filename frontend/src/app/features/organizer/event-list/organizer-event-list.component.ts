import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { ToastService } from '../../../core/services/toast.service';
import { Event } from '../../../core/models';

@Component({
  selector: 'app-organizer-event-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="fade-in">
      <div class="page-header-row">
        <div>
          <h2 class="font-heading">My Events</h2>
          <p>Create, edit, and manage all your events.</p>
        </div>
        <a routerLink="/organizer/create-event" class="btn btn-primary">
          <i class="fa-solid fa-plus"></i> Create New Event
        </a>
      </div>

      <div *ngIf="isLoading" class="loading-state">
        <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i>
      </div>

      <div *ngIf="!isLoading" class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Venue</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Views</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let event of events()">
                <td>
                  <div class="event-cell">
                    <div class="event-thumb" *ngIf="event.posterUrl">
                      <img [src]="event.posterUrl" alt="poster" />
                    </div>
                    <div class="event-thumb-ph" *ngIf="!event.posterUrl">
                      <i class="fa-solid fa-shapes" style="color:var(--primary);"></i>
                    </div>
                    <div class="event-cell-info">
                      <div style="display:flex;align-items:center;gap:0.4rem;">
                        <span class="event-name-cell">{{ event.title }}</span>
                        <span *ngIf="isOngoing(event)" class="badge-live-pulse" title="Event is actively running right now!">
                          <span class="live-dot"></span> LIVE NOW
                        </span>
                      </div>
                      <span class="badge badge-neutral" style="font-size:0.7rem;width:fit-content;">{{ event.category }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="date-col">
                    <span>{{ event.startDate | date:'MMM d, y' }}</span>
                    <small style="color:var(--text-muted);font-size:0.75rem;">{{ event.startDate | date:'shortTime' }} - {{ event.endDate | date:'shortTime' }}</small>
                  </div>
                </td>
                <td>
                  <span *ngIf="getVenueName(event)">{{ getVenueName(event) }}</span>
                  <span *ngIf="!getVenueName(event)" style="color:var(--text-light);">TBD</span>
                </td>
                <td>
                  <div class="capacity-cell">
                    {{ event.registeredCount }}/{{ event.capacity }}
                    <div class="mini-bar"><div class="mini-fill" [style.width.%]="(event.registeredCount / event.capacity)*100"></div></div>
                  </div>
                </td>
                <td><span class="badge" [ngClass]="getStatusBadge(event.status)">{{ event.status }}</span></td>
                <td><span style="font-size:0.875rem; color:var(--text-muted);">{{ event.views }}</span></td>
                <td>
                  <div style="display:flex;gap:0.5rem;align-items:center;">
                    <a [routerLink]="['/organizer/events', event._id, 'edit']" class="btn btn-sm btn-outline" title="Edit Event">
                      <i class="fa-solid fa-pen"></i>
                    </a>
                    <a *ngIf="isCompletedOrPast(event)" [routerLink]="['/organizer/events', event._id, 'report']" class="btn btn-sm btn-outline" title="View completed event report">
                      <i class="fa-solid fa-chart-column"></i>
                    </a>
                    <button class="btn btn-sm btn-danger" [disabled]="isLocked(event)" [title]="isLocked(event) ? 'Ongoing or completed events cannot be deleted' : 'Delete event'" (click)="deleteEvent(event)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="events().length === 0" class="empty-state">
            <i class="fa-solid fa-calendar-plus fa-2x" style="color:var(--text-light);"></i>
            <p>No events yet.</p>
            <a routerLink="/organizer/create-event" class="btn btn-primary btn-sm">Create First Event</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header-row { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem; }
    .page-header-row h2 { margin:0; }
    .loading-state, .empty-state { text-align:center;padding:3rem;display:flex;flex-direction:column;align-items:center;gap:0.75rem;color:var(--text-muted); }
    .event-cell { display:flex;gap:0.75rem;align-items:center; }
    .event-thumb, .event-thumb-ph { width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0; }
    .event-thumb img { width:100%;height:100%;object-fit:cover; }
    .event-thumb-ph { background:var(--primary-tint);display:flex;align-items:center;justify-content:center; }
    .event-cell-info { display:flex;flex-direction:column;gap:0.2rem; }
    .event-name-cell { font-weight:700;font-size:0.875rem; }
    .date-col { display:flex;flex-direction:column;font-size:0.875rem; }
    .capacity-cell { display:flex;flex-direction:column;gap:0.2rem;font-size:0.875rem; }
    .mini-bar { height:3px;background:#E5E7EB;border-radius:2px;overflow:hidden;width:60px; }
    .mini-fill { height:100%;background:var(--primary); }
    .badge-live-pulse {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #FEE2E2;
      color: #DC2626;
      border: 1px solid #FECACA;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 9999px;
      letter-spacing: 0.04em;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      background: #DC2626;
      border-radius: 50%;
      animation: pulseLive 1.5s infinite;
    }
    @keyframes pulseLive {
      0% { transform: scale(0.9); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.4; }
      100% { transform: scale(0.9); opacity: 1; }
    }
    .btn-disabled-ongoing {
      background: #F3F4F6;
      border: 1px solid #D1D5DB;
      color: #9CA3AF;
      cursor: not-allowed;
    }
    .btn-disabled-ongoing:hover {
      background: #FEE2E2;
      color: #DC2626;
      border-color: #FCA5A5;
    }
  `]
})
export class OrganizerEventListComponent implements OnInit {
  private eventService = inject(EventService);
  private toastService = inject(ToastService);

  events = signal<Event[]>([]);
  isLoading = true;

  ngOnInit(): void {
    this.eventService.getEvents({ limit: 50 }).subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) this.events.set(res.data);
      },
      error: () => { this.isLoading = false; }
    });
  }

  deleteEvent(event: Event): void {
    if (this.isLocked(event)) return;
    if (!confirm('Delete this event? This cannot be undone.')) return;
    this.eventService.deleteEvent(event._id).subscribe({
      next: () => {
        this.events.update(list => list.filter(e => e._id !== event._id));
        this.toastService.success('Event deleted.');
      },
      error: err => {
        this.toastService.error(err.error?.message || 'Failed to delete event.');
      }
    });
  }

  isLocked(event: Event): boolean {
    return event.status === 'completed' || new Date(event.startDate).getTime() <= Date.now();
  }

  isOngoing(event: Event): boolean {
    const now = Date.now();
    return event.status === 'published'
      && new Date(event.startDate).getTime() <= now
      && new Date(event.endDate).getTime() >= now;
  }

  isCompletedOrPast(event: Event): boolean {
    return event.status === 'completed' || new Date(event.endDate).getTime() <= Date.now();
  }

  getVenueName(event: Event): string {
    const v = event.venue;
    if (!v) return '';
    return typeof v === 'object' ? v.name : v;
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      published: 'badge-success', draft: 'badge-neutral', pending: 'badge-warning',
      rejected: 'badge-danger', cancelled: 'badge-danger', completed: 'badge-info'
    };
    return map[status] || 'badge-neutral';
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { AuthService } from '../../../core/services/auth.service';
import { Event } from '../../../core/models';

@Component({
  selector: 'app-organizer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="fade-in">
      <!-- Hero Banner -->
      <div class="hero-gradient organizer-hero">
        <div class="hero-text">
          <div class="hero-eyebrow">
            <i class="fa-solid fa-building-user"></i> Organizer Portal
          </div>
          <h1 class="font-heading">{{ getOrgName() }}</h1>
          <p>Manage your events, track attendance, and view engagement analytics.</p>
          <div class="hero-actions" style="margin-top:1rem; display:flex; gap:0.75rem;">
            <a routerLink="/organizer/create-event" class="btn" style="background:#FFFFFF;color:var(--primary);font-weight:700;">
              <i class="fa-solid fa-plus-circle"></i> Create Event
            </a>
            <a routerLink="/organizer/check-in" class="btn" style="background:rgba(255,255,255,0.15);color:#FFFFFF;border:1px solid rgba(255,255,255,0.3);">
              <i class="fa-solid fa-qrcode"></i> QR Check-in
            </a>
          </div>
        </div>
        <div class="hero-icon-bg">
          <i class="fa-solid fa-chart-pie fa-4x" style="opacity:0.12;"></i>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-grid" style="margin: 2rem 0;">
        <div class="card stat-card" *ngFor="let stat of stats">
          <div class="stat-icon-wrap" [style.background]="stat.bg">
            <i [class]="stat.icon" [style.color]="stat.color"></i>
          </div>
          <div>
            <div class="stat-number font-heading">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>

      <!-- Events Table -->
      <div class="card">
        <div class="card-heading" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
          <h3 class="font-heading" style="margin:0;">Recent Events</h3>
          <div style="display:flex;gap:0.5rem;">
            <a routerLink="/organizer/events" class="btn btn-sm btn-outline">View All</a>
            <a routerLink="/organizer/create-event" class="btn btn-sm btn-primary">
              <i class="fa-solid fa-plus"></i> New Event
            </a>
          </div>
        </div>

        <div *ngIf="isLoading" class="loading-state">
          <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i>
        </div>

        <div *ngIf="!isLoading" class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let event of myEvents()">
                <td>
                  <div class="event-table-name">
                    <span class="event-name">{{ event.title }}</span>
                    <span class="badge badge-neutral" style="font-size:0.7rem;">{{ event.category }}</span>
                  </div>
                </td>
                <td><span style="font-size:0.875rem;">{{ event.startDate | date:'MMM d, y' }}</span></td>
                <td>
                  <div class="capacity-cell">
                    <span>{{ event.registeredCount }} / {{ event.capacity }}</span>
                    <div class="mini-bar">
                      <div class="mini-fill" [style.width.%]="(event.registeredCount / event.capacity) * 100"></div>
                    </div>
                  </div>
                </td>
                <td><span class="badge" [ngClass]="getStatusBadge(event.status)">{{ event.status }}</span></td>
                <td>
                  <span *ngIf="event.avgRating" style="font-size:0.875rem;">
                    <i class="fa-solid fa-star" style="color:#F59E0B;"></i> {{ event.avgRating.toFixed(1) }}
                  </span>
                  <span *ngIf="!event.avgRating" style="color:var(--text-light);font-size:0.8rem;">No reviews</span>
                </td>
                <td>
                  <div style="display:flex;gap:0.5rem;">
                    <a [routerLink]="['/organizer/events', event._id, 'edit']" class="btn btn-sm btn-outline">Edit</a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="myEvents().length === 0" class="empty-state">
            <p>No events yet. <a routerLink="/organizer/create-event">Create your first event!</a></p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .organizer-hero { display:flex; justify-content:space-between; align-items:center; }
    .hero-eyebrow { font-size:0.875rem; opacity:0.85; margin-bottom:0.5rem; }
    .hero-text h1 { font-size:2rem; color:#FFFFFF; margin-bottom:0.5rem; }
    .hero-text p { color:rgba(255,255,255,0.85); }
    .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; }
    @media (max-width:900px) { .stats-grid { grid-template-columns:repeat(2,1fr); } }
    .stat-card { display:flex; align-items:center; gap:1rem; padding:1.25rem; }
    .stat-icon-wrap { width:50px;height:50px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0; }
    .stat-number { font-size:1.85rem;font-weight:800;line-height:1; }
    .stat-label { font-size:0.8rem;color:var(--text-muted);margin-top:0.2rem; }
    .event-table-name { display:flex;flex-direction:column;gap:0.25rem; }
    .event-name { font-weight:700;font-size:0.875rem; }
    .capacity-cell { display:flex;flex-direction:column;gap:0.2rem;font-size:0.875rem; }
    .mini-bar { height:4px;background:#E5E7EB;border-radius:2px;overflow:hidden;width:80px; }
    .mini-fill { height:100%;background:var(--primary);border-radius:2px; }
    .loading-state, .empty-state { text-align:center;padding:2rem;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:0.5rem; }
  `]
})
export class OrganizerDashboardComponent implements OnInit {
  private eventService = inject(EventService);
  authService = inject(AuthService);

  myEvents = signal<Event[]>([]);
  isLoading = true;
  stats: any[] = [];

  ngOnInit(): void {
    this.eventService.getEvents({ limit: 20 }).subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.myEvents.set(res.data);
          this.buildStats(res.data);
        }
      },
      error: () => { this.isLoading = false; }
    });
  }

  buildStats(events: Event[]): void {
    const published = events.filter(e => e.status === 'published').length;
    const total = events.reduce((s, e) => s + e.registeredCount, 0);
    const pending = events.filter(e => e.status === 'pending').length;
    const avgRating = events.filter(e => e.avgRating).reduce((s, e) => s + (e.avgRating || 0), 0) / (events.filter(e => e.avgRating).length || 1);

    this.stats = [
      { label: 'Total Events', value: events.length, icon: 'fa-solid fa-calendar-days', color: '#E05A1A', bg: '#FFF1EA' },
      { label: 'Live Published', value: published, icon: 'fa-solid fa-circle-check', color: '#10B981', bg: '#ECFDF5' },
      { label: 'Total Registrations', value: total, icon: 'fa-solid fa-users', color: '#3B82F6', bg: '#EFF6FF' },
      { label: 'Avg Rating', value: avgRating.toFixed(1) + ' ★', icon: 'fa-solid fa-star', color: '#F59E0B', bg: '#FEF3C7' }
    ];
  }

  getOrgName(): string {
    const user = this.authService.currentUser();
    return user?.organizerProfile?.orgName || user?.name || 'My Organization';
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      published: 'badge-success', draft: 'badge-neutral', pending: 'badge-warning',
      rejected: 'badge-danger', cancelled: 'badge-danger', completed: 'badge-info'
    };
    return map[status] || 'badge-neutral';
  }
}

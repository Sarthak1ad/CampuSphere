import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { Event, Registration } from '../../../core/models';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="fade-in">
      <!-- Welcome Banner -->
      <div class="hero-gradient welcome-banner">
        <div class="banner-content">
          <div class="welcome-eyebrow">
            <i class="fa-solid fa-sun"></i> Good {{ greeting }}, {{ authService.currentUser()?.name || 'Student' }}!
          </div>
          <h1 class="welcome-title font-heading">Your Campus Event Hub</h1>
          <p class="welcome-subtitle">
            Discover upcoming events, manage your RSVP tickets, and share your feedback after attending.
          </p>
          <a routerLink="/student/events" class="btn" style="background:#FFFFFF; color:var(--primary); font-weight:700; margin-top:1rem;">
            <i class="fa-solid fa-compass"></i> Explore Events
          </a>
        </div>
        <div class="banner-decor">
          <i class="fa-solid fa-calendar-days fa-5x" style="opacity:0.12;"></i>
        </div>
      </div>

      <!-- Quick Stats Row -->
      <div class="stats-grid" style="margin: 2rem 0;">
        <div class="card stat-card" *ngFor="let stat of statsCards">
          <div class="stat-icon" [style.background]="stat.bgColor">
            <i [class]="stat.icon" [style.color]="stat.color"></i>
          </div>
          <div class="stat-body">
            <div class="stat-number font-heading">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="dashboard-grid">
        <!-- Upcoming Registered Events -->
        <div class="card upcoming-events-card">
          <div class="card-heading">
            <h3><i class="fa-solid fa-ticket" style="color:var(--primary);"></i> My Upcoming Events</h3>
            <a routerLink="/student/my-tickets" class="btn btn-sm btn-outline">View All</a>
          </div>
          <div *ngIf="isLoadingRegistrations" class="loading-state">
            <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
          </div>
          <div *ngIf="!isLoadingRegistrations && myRegistrations().length === 0" class="empty-state">
            <i class="fa-regular fa-calendar-xmark fa-2x"></i>
            <p>No upcoming events. Start exploring!</p>
            <a routerLink="/student/events" class="btn btn-sm btn-primary">Explore Events</a>
          </div>
          <div class="event-list" *ngIf="!isLoadingRegistrations">
            <div *ngFor="let reg of upcomingRegistrations()" class="event-row">
              <div class="event-row-poster">
                <img *ngIf="getEvent(reg)?.posterUrl" [src]="getEvent(reg)?.posterUrl" alt="event">
                <div *ngIf="!getEvent(reg)?.posterUrl" class="poster-placeholder">
                  <i class="fa-solid fa-calendar-days"></i>
                </div>
              </div>
              <div class="event-row-info">
                <span class="event-row-title">{{ getEvent(reg)?.title }}</span>
                <span class="event-row-meta">
                  <i class="fa-regular fa-clock"></i>
                  {{ getEvent(reg)?.startDate | date:'medium' }}
                </span>
              </div>
              <span class="badge" [ngClass]="getStatusBadge(reg.status)">{{ reg.status }}</span>
            </div>
          </div>
        </div>

        <!-- Recommended Events -->
        <div class="card recommendations-card">
          <div class="card-heading">
            <h3><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--primary);"></i> Recommended For You</h3>
            <a routerLink="/student/events" class="btn btn-sm btn-outline">Browse All</a>
          </div>
          <div *ngIf="isLoadingRecommendations" class="loading-state">
            <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
          </div>
          <div class="recommendations-list" *ngIf="!isLoadingRecommendations">
            <div *ngFor="let event of recommendations()" class="recommendation-card card-hover">
              <div class="rec-poster">
                <img *ngIf="event.posterUrl" [src]="event.posterUrl" alt="poster" />
                <div *ngIf="!event.posterUrl" class="rec-poster-ph">
                  <i class="fa-solid fa-shapes"></i>
                </div>
              </div>
              <div class="rec-info">
                <span class="badge badge-primary" style="font-size:0.7rem;">{{ event.category }}</span>
                <h4 class="rec-title">{{ event.title }}</h4>
                <span class="rec-date"><i class="fa-regular fa-calendar"></i> {{ event.startDate | date:'MMM d, y' }}</span>
                <span class="rec-seats" [ngClass]="event.registeredCount >= event.capacity ? 'text-danger' : 'text-success'">
                  <i class="fa-solid fa-chair"></i>
                  {{ event.registeredCount >= event.capacity ? 'Full - Join Waitlist' : event.capacity - event.registeredCount + ' seats left' }}
                </span>
              </div>
              <a [routerLink]="['/student/events', event._id]" class="btn btn-sm btn-primary rec-cta">
                View <i class="fa-solid fa-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .welcome-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 180px;
    }
    .welcome-eyebrow { font-size:0.9rem; margin-bottom:0.5rem; opacity:0.9; }
    .welcome-title { font-size: 2rem; color: #FFFFFF; margin-bottom: 0.5rem; }
    .welcome-subtitle { color: rgba(255,255,255,0.85); max-width: 500px; }
    .banner-decor { display:flex; align-items:center; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 500px) { .stats-grid { grid-template-columns: 1fr; } }
    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
    }
    .stat-icon {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .stat-number { font-size: 1.85rem; font-weight: 800; line-height: 1; }
    .stat-label { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; font-weight: 500; }
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr; } }
    .card-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .card-heading h3 { margin: 0; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem; }
    .loading-state, .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .event-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .event-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-light);
    }
    .event-row-poster {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .event-row-poster img { width: 100%; height: 100%; object-fit: cover; }
    .poster-placeholder {
      width: 100%;
      height: 100%;
      background: var(--primary-tint);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
    }
    .event-row-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
    .event-row-title { font-size: 0.875rem; font-weight: 700; }
    .event-row-meta { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.3rem; }
    .recommendations-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .recommendation-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-light);
    }
    .rec-poster { width: 56px; height: 56px; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
    .rec-poster img { width: 100%; height: 100%; object-fit: cover; }
    .rec-poster-ph {
      width: 100%;
      height: 100%;
      background: var(--primary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
      font-size: 1.25rem;
    }
    .rec-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
    .rec-title { font-size: 0.875rem; font-weight: 700; margin: 0.2rem 0; }
    .rec-date, .rec-seats { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.3rem; }
    .text-success { color: var(--success) !important; }
    .text-danger { color: var(--danger) !important; }
  `]
})
export class StudentDashboardComponent implements OnInit {
  authService = inject(AuthService);
  private eventService = inject(EventService);
  private registrationService = inject(RegistrationService);
  private analyticsService = inject(AnalyticsService);

  myRegistrations = signal<Registration[]>([]);
  recommendations = signal<Event[]>([]);
  isLoadingRegistrations = true;
  isLoadingRecommendations = true;

  statsCards: any[] = [];

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.registrationService.getMyRegistrations().subscribe({
      next: res => {
        this.isLoadingRegistrations = false;
        if (res.success && res.data) {
          this.myRegistrations.set(res.data);
          this.buildStats(res.data);
        }
      },
      error: () => { this.isLoadingRegistrations = false; }
    });

    this.analyticsService.getStudentRecommendations().subscribe({
      next: res => {
        this.isLoadingRecommendations = false;
        if (res.success && res.data) {
          this.recommendations.set(res.data.slice(0, 4));
        }
      },
      error: () => { this.isLoadingRecommendations = false; }
    });
  }

  buildStats(registrations: Registration[]): void {
    const total = registrations.length;
    const confirmed = registrations.filter(r => r.status === 'registered').length;
    const attended = registrations.filter(r => r.status === 'checked-in').length;
    const waitlisted = registrations.filter(r => r.status === 'waitlisted').length;

    this.statsCards = [
      { label: 'Total RSVPs', value: total, icon: 'fa-solid fa-ticket', color: '#E05A1A', bgColor: '#FFF1EA' },
      { label: 'Confirmed', value: confirmed, icon: 'fa-solid fa-circle-check', color: '#10B981', bgColor: '#ECFDF5' },
      { label: 'Attended', value: attended, icon: 'fa-solid fa-user-check', color: '#3B82F6', bgColor: '#EFF6FF' },
      { label: 'On Waitlist', value: waitlisted, icon: 'fa-solid fa-clock', color: '#F59E0B', bgColor: '#FEF3C7' }
    ];
  }

  upcomingRegistrations(): Registration[] {
    return this.myRegistrations()
      .filter(r => r.status === 'registered' || r.status === 'waitlisted')
      .slice(0, 5);
  }

  getEvent(reg: Registration): Event | null {
    return typeof reg.event === 'object' ? reg.event as Event : null;
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      'registered': 'badge-success',
      'waitlisted': 'badge-warning',
      'checked-in': 'badge-info',
      'cancelled': 'badge-danger',
      'no-show': 'badge-neutral'
    };
    return map[status] || 'badge-neutral';
  }
}

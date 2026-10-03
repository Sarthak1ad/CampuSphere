import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { QrModalComponent } from '../../../shared/components/qr-modal/qr-modal.component';
import { Event, Registration } from '../../../core/models';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, QrModalComponent],
  template: `
    <div class="fade-in" *ngIf="event()">
      <!-- Breadcrumb -->
      <nav class="breadcrumb-nav">
        <a routerLink="/student/events"><i class="fa-solid fa-arrow-left"></i> Back to Events</a>
        <span>&rsaquo;</span>
        <span>{{ event()?.title }}</span>
      </nav>

      <div class="event-detail-layout">
        <!-- Main Content -->
        <div class="event-main">
          <!-- Poster -->
          <div class="event-poster-wrap">
            <img *ngIf="event()?.posterUrl" [src]="event()!.posterUrl" [alt]="event()?.title" class="event-poster-full" />
            <div *ngIf="!event()?.posterUrl" class="event-poster-ph-lg">
              <i class="fa-solid fa-shapes fa-4x" style="color:var(--primary); opacity:0.3;"></i>
            </div>
            <div class="poster-overlays">
              <span class="badge badge-primary">{{ event()?.category }}</span>
              <span class="badge" [ngClass]="getStatusBadge(event()?.status || '')">{{ event()?.status }}</span>
            </div>
          </div>

          <!-- Event Info -->
          <div class="card event-info-card">
            <h1 class="event-title font-heading">{{ event()?.title }}</h1>
            <p class="event-description">{{ event()?.description }}</p>

            <!-- Tags -->
            <div class="tags-row" *ngIf="event()?.tags?.length">
              <span *ngFor="let tag of event()?.tags" class="badge badge-neutral">
                <i class="fa-solid fa-hashtag"></i> {{ tag }}
              </span>
            </div>

            <!-- Meta Grid -->
            <div class="meta-grid">
              <div class="meta-item">
                <div class="meta-icon"><i class="fa-regular fa-calendar"></i></div>
                <div class="meta-body">
                  <span class="meta-label">Start Date & Time</span>
                  <span class="meta-value">{{ event()?.startDate | date:'fullDate' }}</span>
                  <span class="meta-sub">{{ event()?.startDate | date:'shortTime' }}</span>
                </div>
              </div>
              <div class="meta-item">
                <div class="meta-icon"><i class="fa-regular fa-clock"></i></div>
                <div class="meta-body">
                  <span class="meta-label">End Date & Time</span>
                  <span class="meta-value">{{ event()?.endDate | date:'fullDate' }}</span>
                  <span class="meta-sub">{{ event()?.endDate | date:'shortTime' }}</span>
                </div>
              </div>
              <div class="meta-item">
                <div class="meta-icon"><i class="fa-solid fa-location-dot"></i></div>
                <div class="meta-body">
                  <span class="meta-label">Venue</span>
                  <span class="meta-value">{{ getVenueName() }}</span>
                </div>
              </div>
              <div class="meta-item">
                <div class="meta-icon"><i class="fa-solid fa-users"></i></div>
                <div class="meta-body">
                  <span class="meta-label">Capacity</span>
                  <span class="meta-value">{{ event()?.registeredCount }} / {{ event()?.capacity }} registered</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Panel -->
        <div class="event-sidebar">
          <!-- Booking Card -->
          <div class="card booking-card">
            <div class="booking-status">
              <div class="capacity-visual">
                <div class="capacity-track">
                  <div class="capacity-fill" [style.width.%]="capacityPercent"></div>
                </div>
                <div class="capacity-text-row">
                  <span class="seats-left" [class.full]="isFull">
                    {{ isFull ? 'Event Full' : (event()!.capacity - event()!.registeredCount) + ' seats available' }}
                  </span>
                  <span class="capacity-pct">{{ capacityPercent }}% filled</span>
                </div>
              </div>
            </div>

            <!-- No Registration -->
            <ng-container *ngIf="!myRegistration()">
              <button
                class="btn btn-primary btn-block btn-lg"
                [disabled]="isRegistering || event()?.status !== 'published'"
                (click)="onRegister()"
              >
                <span *ngIf="isRegistering"><i class="fa-solid fa-spinner fa-spin"></i> Registering...</span>
                <span *ngIf="!isRegistering && !isFull"><i class="fa-solid fa-ticket"></i> Register — Get QR Pass</span>
                <span *ngIf="!isRegistering && isFull"><i class="fa-solid fa-clock"></i> Join Waitlist</span>
              </button>
            </ng-container>

            <!-- Already Registered -->
            <ng-container *ngIf="myRegistration() as reg">
              <div class="my-ticket-panel">
                <div class="ticket-status-row">
                  <span class="badge" [ngClass]="getStatusBadge(reg.status)">
                    <i class="fa-solid fa-circle-check"></i> {{ reg.status | titlecase }}
                  </span>
                  <span class="registered-label">You are registered!</span>
                </div>

                <button
                  class="btn btn-primary btn-block"
                  *ngIf="reg.status === 'registered'"
                  (click)="showQrModal = true">
                  <i class="fa-solid fa-qrcode"></i> View QR Pass
                </button>

                <button
                  class="btn btn-danger btn-block"
                  style="margin-top:0.5rem;"
                  [disabled]="isCancelling"
                  (click)="onCancel(reg._id)">
                  <span *ngIf="isCancelling"><i class="fa-solid fa-spinner fa-spin"></i> Cancelling...</span>
                  <span *ngIf="!isCancelling"><i class="fa-solid fa-xmark"></i> Cancel Registration</span>
                </button>
              </div>
            </ng-container>

            <div class="event-views">
              <i class="fa-regular fa-eye"></i> {{ event()?.views }} views
            </div>
          </div>

          <!-- Organizer Card -->
          <div class="card organizer-card">
            <h4><i class="fa-solid fa-building" style="color:var(--primary);"></i> Organized By</h4>
            <div class="organizer-row">
              <div class="organizer-avatar">{{ getOrganizerInitial() }}</div>
              <div class="organizer-info">
                <span class="organizer-name">{{ getOrganizerName() }}</span>
                <span *ngIf="getOrgName()" class="org-name">{{ getOrgName() }}</span>
              </div>
            </div>
            <div class="organizer-stats">
              <span *ngIf="event()?.avgRating" class="rating-row">
                <i class="fa-solid fa-star" style="color:#F59E0B;"></i>
                {{ event()!.avgRating!.toFixed(1) }} average rating ({{ event()?.ratingCount }} reviews)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div *ngIf="isLoading" class="loading-state">
      <i class="fa-solid fa-spinner fa-spin fa-3x" style="color:var(--primary);"></i>
      <p>Loading event details...</p>
    </div>

    <!-- QR Modal -->
    <app-qr-modal
      *ngIf="showQrModal && myRegistration()"
      [qrDataUrl]="myRegistration()?.qrDataUrl"
      [eventTitle]="event()?.title || ''"
      [studentName]="authService.currentUser()?.name || ''"
      [venueName]="getVenueName()"
      [eventDate]="event()?.startDate || ''"
      [status]="myRegistration()?.status || ''"
      (close)="showQrModal = false"
    ></app-qr-modal>
  `,
  styles: [`
    .breadcrumb-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .breadcrumb-nav a { font-weight: 600; }
    .event-detail-layout {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 1.5rem;
      align-items: start;
    }
    @media (max-width: 1000px) { .event-detail-layout { grid-template-columns: 1fr; } }
    .event-poster-wrap {
      position: relative;
      border-radius: var(--radius-md);
      overflow: hidden;
      height: 280px;
      background: #F0EDE8;
      margin-bottom: 1.25rem;
    }
    .event-poster-full { width: 100%; height: 100%; object-fit: cover; }
    .event-poster-ph-lg { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .poster-overlays {
      position: absolute;
      top: 1rem;
      left: 1rem;
      display: flex;
      gap: 0.5rem;
    }
    .event-info-card { padding: 1.5rem; }
    .event-title { font-size: 1.75rem; margin-bottom: 0.75rem; }
    .event-description { line-height: 1.7; margin-bottom: 1.25rem; }
    .tags-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .meta-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.85rem;
      background: #FAFAFA;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-light);
    }
    .meta-icon { color: var(--primary); font-size: 1.1rem; padding-top: 0.1rem; }
    .meta-body { display: flex; flex-direction: column; gap: 0.1rem; }
    .meta-label { font-size: 0.7rem; text-transform: uppercase; font-weight: 700; color: var(--text-light); letter-spacing: 0.05em; }
    .meta-value { font-weight: 700; font-size: 0.9rem; }
    .meta-sub { font-size: 0.8rem; color: var(--text-muted); }
    .booking-card { padding: 1.5rem; }
    .capacity-track {
      height: 8px;
      background: #EEE;
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-bottom: 0.5rem;
    }
    .capacity-fill {
      height: 100%;
      background: var(--primary);
      border-radius: var(--radius-full);
      transition: width 0.6s ease;
    }
    .capacity-text-row { display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 1rem; }
    .seats-left { font-weight: 700; color: var(--success); }
    .seats-left.full { color: var(--danger); }
    .capacity-pct { color: var(--text-muted); }
    .btn-block { width: 100%; }
    .my-ticket-panel { display: flex; flex-direction: column; gap: 0.5rem; }
    .ticket-status-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--success-bg); border-radius: var(--radius-sm); margin-bottom: 0.5rem; }
    .registered-label { font-size: 0.85rem; font-weight: 600; color: #065F46; }
    .event-views { text-align: center; margin-top: 1rem; font-size: 0.8rem; color: var(--text-light); }
    .organizer-card { padding: 1.25rem; }
    .organizer-card h4 { font-size: 1rem; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem; }
    .organizer-row { display: flex; align-items: center; gap: 0.75rem; }
    .organizer-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: var(--primary); color: #FFF;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1.1rem;
    }
    .organizer-info { display: flex; flex-direction: column; }
    .organizer-name { font-weight: 700; font-size: 0.9rem; }
    .org-name { font-size: 0.8rem; color: var(--text-muted); }
    .organizer-stats { margin-top: 0.75rem; }
    .rating-row { font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; color: var(--text-muted); }
    .loading-state { text-align: center; padding: 4rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--text-muted); }
  `]
})
export class EventDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventService = inject(EventService);
  private registrationService = inject(RegistrationService);
  authService = inject(AuthService);
  private toastService = inject(ToastService);

  event = signal<Event | null>(null);
  myRegistration = signal<Registration | null>(null);
  isLoading = true;
  isRegistering = false;
  isCancelling = false;
  showQrModal = false;

  get isFull(): boolean {
    const e = this.event();
    return !!e && e.registeredCount >= e.capacity;
  }

  get capacityPercent(): number {
    const e = this.event();
    if (!e) return 0;
    return Math.min(100, Math.round((e.registeredCount / e.capacity) * 100));
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.eventService.getEventById(id, 'student-portal').subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.event.set(res.data);
        }
      },
      error: () => { this.isLoading = false; }
    });

    // Check if already registered
    this.registrationService.getMyRegistrations().subscribe({
      next: res => {
        if (res.success && res.data) {
          const reg = res.data.find(r => {
            const ev = typeof r.event === 'object' ? (r.event as Event)._id : r.event;
            return ev === id;
          });
          if (reg) this.myRegistration.set(reg);
        }
      }
    });
  }

  onRegister(): void {
    const id = this.event()?._id;
    if (!id) return;
    this.isRegistering = true;
    this.registrationService.registerForEvent(id).subscribe({
      next: res => {
        this.isRegistering = false;
        if (res.success && res.data) {
          this.myRegistration.set(res.data);
          // Update event count locally
          const ev = this.event();
          if (ev && res.data.status === 'registered') {
            this.event.set({ ...ev, registeredCount: ev.registeredCount + 1 });
          }
          if (res.data.status === 'waitlisted') {
            this.toastService.warning('Event is full! You have been added to the waitlist.', 'Waitlisted');
          } else {
            this.toastService.success('You are registered! Check your QR pass.', 'Registration Confirmed');
          }
        }
      },
      error: err => {
        this.isRegistering = false;
        this.toastService.error(err.error?.message || 'Registration failed.');
      }
    });
  }

  onCancel(regId: string): void {
    if (!confirm('Are you sure you want to cancel your registration?')) return;
    this.isCancelling = true;
    this.registrationService.cancelRegistration(regId).subscribe({
      next: () => {
        this.isCancelling = false;
        this.myRegistration.set(null);
        const ev = this.event();
        if (ev) this.event.set({ ...ev, registeredCount: Math.max(0, ev.registeredCount - 1) });
        this.toastService.success('Registration cancelled. A waitlisted student may have been promoted.', 'Cancelled');
      },
      error: err => {
        this.isCancelling = false;
        this.toastService.error(err.error?.message || 'Could not cancel registration.');
      }
    });
  }

  getVenueName(): string {
    const v = this.event()?.venue;
    if (!v) return 'TBD';
    if (typeof v === 'object') return v.name;
    return v;
  }

  getOrganizerName(): string {
    const o = this.event()?.organizer;
    if (!o) return '';
    if (typeof o === 'object') return o.name;
    return o;
  }

  getOrgName(): string {
    const o = this.event()?.organizer;
    if (o && typeof o === 'object') return o.organizerProfile?.orgName || '';
    return '';
  }

  getOrganizerInitial(): string {
    return this.getOrganizerName().charAt(0).toUpperCase();
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      published: 'badge-success', draft: 'badge-neutral', pending: 'badge-warning',
      rejected: 'badge-danger', cancelled: 'badge-danger', completed: 'badge-info',
      registered: 'badge-success', waitlisted: 'badge-warning', 'checked-in': 'badge-info'
    };
    return map[status] || 'badge-neutral';
  }
}

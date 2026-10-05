import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService } from '../../../core/services/toast.service';
import { QrModalComponent } from '../../../shared/components/qr-modal/qr-modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { Registration, Event } from '../../../core/models';

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [CommonModule, QrModalComponent],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <h2 class="font-heading">My Tickets & RSVPs</h2>
        <p>All your event registrations — active, waitlisted, and past.</p>
      </div>

      <!-- Status Tabs -->
      <div class="ticket-tabs">
        <button *ngFor="let tab of tabs" class="ticket-tab" [class.active]="activeTab === tab.key" (click)="activeTab = tab.key">
          {{ tab.label }} <span class="tab-count">{{ getCount(tab.key) }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="loading-state">
        <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i>
        <p>Loading your registrations...</p>
      </div>

      <!-- Tickets -->
      <div *ngIf="!isLoading" class="tickets-list">
        <div *ngFor="let reg of filteredRegistrations()" class="ticket-row card">
          <div class="ticket-left">
            <div class="ticket-event-poster">
              <img *ngIf="getEvent(reg)?.posterUrl" [src]="getEvent(reg)!.posterUrl" alt="poster" />
              <div *ngIf="!getEvent(reg)?.posterUrl" class="poster-ph">
                <i class="fa-solid fa-calendar-days" style="color:var(--primary);"></i>
              </div>
            </div>
            <div class="ticket-event-info">
              <span class="badge badge-primary" style="margin-bottom:0.35rem;">{{ getEvent(reg)?.category }}</span>
              <h4 class="ticket-event-title">{{ getEvent(reg)?.title }}</h4>
              <span class="ticket-event-date">
                <i class="fa-regular fa-calendar"></i>
                {{ getEvent(reg)?.startDate | date:'medium' }}
              </span>
              <span class="ticket-venue" *ngIf="getVenueName(reg)">
                <i class="fa-solid fa-location-dot"></i>
                {{ getVenueName(reg) }}
              </span>
            </div>
          </div>

          <div class="ticket-right">
            <span class="badge status-badge" [ngClass]="getStatusBadge(reg.status)">
              {{ reg.status | titlecase }}
            </span>
            <span class="ticket-date">Registered: {{ reg.createdAt | date:'MMM d, y' }}</span>

            <div class="ticket-actions">
              <button
                *ngIf="reg.status === 'registered'"
                class="btn btn-sm btn-outline"
                (click)="openQr(reg)">
                <i class="fa-solid fa-qrcode"></i> View QR Pass
              </button>
              <button
                *ngIf="reg.status === 'registered' || reg.status === 'waitlisted'"
                class="btn btn-sm btn-danger"
                [disabled]="cancellingId === reg._id"
                (click)="cancelRegistration(reg._id)">
                <i class="fa-solid fa-xmark"></i> Cancel
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="filteredRegistrations().length === 0" class="empty-state">
          <i class="fa-regular fa-folder-open fa-2x"></i>
          <p>No {{ activeTab }} registrations.</p>
        </div>
      </div>
    </div>

    <!-- QR Modal -->
    <app-qr-modal
      *ngIf="selectedReg"
      [qrDataUrl]="selectedReg?.qrDataUrl || selectedReg?.qrCodeDataUrl"
      [qrToken]="selectedReg?.qrToken || ''"
      [eventTitle]="getEvent(selectedReg!)?.title || ''"
      [studentName]="authService.currentUser()?.name || ''"
      [venueName]="getVenueName(selectedReg!)"
      [eventDate]="getEvent(selectedReg!)?.startDate || ''"
      [status]="selectedReg?.status || ''"
      (close)="selectedReg = null"
    ></app-qr-modal>

  `,
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .ticket-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      background: #F3F4F6;
      padding: 0.25rem;
      border-radius: var(--radius-sm);
      overflow-x: auto;
    }
    .ticket-tab {
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      color: var(--text-muted);
      white-space: nowrap;
      transition: all 0.2s ease;
    }
    .ticket-tab.active {
      background: #FFFFFF;
      color: var(--primary);
      box-shadow: var(--shadow-sm);
    }
    .tab-count {
      background: #E5E7EB;
      border-radius: var(--radius-full);
      padding: 0.1rem 0.5rem;
      font-size: 0.7rem;
      margin-left: 0.3rem;
    }
    .ticket-tab.active .tab-count { background: var(--primary-tint); color: var(--primary); }
    .tickets-list { display: flex; flex-direction: column; gap: 1rem; }
    .ticket-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem;
    }
    .ticket-left { display: flex; gap: 1rem; align-items: flex-start; flex: 1; }
    .ticket-event-poster { width: 72px; height: 72px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: var(--primary-tint); }
    .ticket-event-poster img { width: 100%; height: 100%; object-fit: cover; }
    .poster-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .ticket-event-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .ticket-event-title { font-size: 1rem; margin: 0; }
    .ticket-event-date, .ticket-venue { font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; }
    .ticket-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.65rem;
      flex-shrink: 0;
    }
    .ticket-date { font-size: 0.75rem; color: var(--text-light); }
    .ticket-actions { display: flex; gap: 0.5rem; }
    .loading-state, .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
  `]
})
export class MyTicketsComponent implements OnInit {
  private registrationService = inject(RegistrationService);
  private toastService = inject(ToastService);
  authService = inject(AuthService);

  registrations = signal<Registration[]>([]);
  isLoading = true;
  activeTab = 'all';
  cancellingId: string | null = null;
  selectedReg: Registration | null = null;
  isLoadingQr = false;

  tabs = [
    { key: 'all', label: 'All' },
    { key: 'registered', label: 'Confirmed' },
    { key: 'waitlisted', label: 'Waitlisted' },
    { key: 'checked-in', label: 'Attended' },
    { key: 'cancelled', label: 'Cancelled' }
  ];

  ngOnInit(): void {
    this.registrationService.getMyRegistrations().subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) this.registrations.set(res.data);
      },
      error: () => { this.isLoading = false; }
    });
  }

  filteredRegistrations(): Registration[] {
    if (this.activeTab === 'all') return this.registrations();
    return this.registrations().filter(r => r.status === this.activeTab);
  }

  getCount(key: string): number {
    if (key === 'all') return this.registrations().length;
    return this.registrations().filter(r => r.status === key).length;
  }

  getEvent(reg: Registration): Event | null {
    return typeof reg.event === 'object' ? reg.event as Event : null;
  }

  getVenueName(reg: Registration): string {
    const ev = this.getEvent(reg);
    if (!ev) return '';
    const v = ev.venue;
    if (!v) return '';
    if (typeof v === 'object') return v.name;
    return v;
  }

  openQr(reg: Registration): void {
    const eventObj = this.getEvent(reg);
    const eventId = eventObj?._id || (typeof reg.event === 'string' ? reg.event : null);

    // Show modal immediately with what we have (may already have qrToken)
    this.selectedReg = { ...reg };

    if (!eventId) return;

    // Always fetch fresh QR pass to ensure token is populated
    this.isLoadingQr = true;
    this.registrationService.getQrPass(eventId).subscribe({
      next: res => {
        this.isLoadingQr = false;
        if (res.success && res.data) {
          this.selectedReg = {
            ...this.selectedReg!,
            qrToken: res.data.qrToken,
            qrDataUrl: res.data.qrDataUrl || res.data.qrCodeDataUrl,
            qrCodeDataUrl: res.data.qrCodeDataUrl,
          };
        }
      },
      error: () => { this.isLoadingQr = false; }
    });
  }

  cancelRegistration(regId: string): void {
    if (!confirm('Cancel this registration?')) return;
    this.cancellingId = regId;
    this.registrationService.cancelRegistration(regId).subscribe({
      next: () => {
        this.cancellingId = null;
        this.registrations.update(list =>
          list.map(r => r._id === regId ? { ...r, status: 'cancelled' as any } : r)
        );
        this.toastService.success('Registration cancelled.', 'Cancelled');
      },
      error: err => {
        this.cancellingId = null;
        this.toastService.error(err.error?.message || 'Failed to cancel.');
      }
    });
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      registered: 'badge-success', waitlisted: 'badge-warning',
      'checked-in': 'badge-info', cancelled: 'badge-danger', 'no-show': 'badge-neutral'
    };
    return map[status] || 'badge-neutral';
  }
}

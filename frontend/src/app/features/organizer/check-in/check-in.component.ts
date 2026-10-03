import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService } from '../../../core/services/toast.service';
import { Event, Registration } from '../../../core/models';

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header" style="margin-bottom:1.5rem;">
        <h2 class="font-heading">QR Check-in Scanner</h2>
        <p>Select an active event and scan QR tokens to mark attendees as checked-in.</p>
      </div>

      <!-- Event Selector -->
      <div class="card" style="margin-bottom:1.5rem;padding:1.5rem;">
        <div class="form-group" style="margin:0;">
          <label class="form-label">Select Event to Check-In</label>
          <select class="form-select" [(ngModel)]="selectedEventId" (change)="loadAttendees()">
            <option value="">-- Choose an Event --</option>
            <option *ngFor="let event of publishedEvents()" [value]="event._id">
              {{ event.title }} ({{ event.startDate | date:'MMM d' }})
            </option>
          </select>
        </div>
      </div>

      <div *ngIf="selectedEventId" class="check-in-layout">
        <!-- QR Scanner Input -->
        <div class="card scanner-card">
          <h3 class="font-heading"><i class="fa-solid fa-qrcode" style="color:var(--primary);"></i> Scan QR Token</h3>
          <p style="font-size:0.875rem;color:var(--text-muted);margin-bottom:1.5rem;">
            Use a QR scanner or type the token manually.
          </p>
          <div class="scan-input-group">
            <input
              type="text"
              class="form-control"
              [(ngModel)]="qrInput"
              placeholder="Scan QR code or type token here..."
              (keydown.enter)="checkInByQr()"
              autofocus
            />
            <button class="btn btn-primary" (click)="checkInByQr()" [disabled]="!qrInput || isCheckingIn">
              <span *ngIf="isCheckingIn"><i class="fa-solid fa-spinner fa-spin"></i></span>
              <span *ngIf="!isCheckingIn"><i class="fa-solid fa-check"></i> Check In</span>
            </button>
          </div>

          <!-- Last Check-in result -->
          <div *ngIf="lastResult" class="check-in-result" [ngClass]="lastResult.type">
            <i [class]="lastResult.icon"></i>
            <div>
              <strong>{{ lastResult.name }}</strong>
              <span>{{ lastResult.message }}</span>
            </div>
          </div>

          <!-- Stats -->
          <div class="check-in-stats" *ngIf="selectedEventId">
            <div class="stat-mini">
              <span class="stat-mini-num">{{ getCheckedInCount() }}</span>
              <span class="stat-mini-label">Checked In</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-num">{{ getRegisteredCount() }}</span>
              <span class="stat-mini-label">Confirmed Seats</span>
            </div>
            <div class="stat-mini">
              <span class="stat-mini-num">{{ getAttendanceRate() }}%</span>
              <span class="stat-mini-label">Attendance Rate</span>
            </div>
          </div>
        </div>

        <!-- Attendee List -->
        <div class="card attendees-card">
          <h3 class="font-heading" style="margin-bottom:1.25rem;">
            <i class="fa-solid fa-list-check" style="color:var(--primary);"></i> Attendee List
          </h3>
          <div *ngIf="isLoadingAttendees" class="loading-state">
            <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i>
          </div>
          <div *ngIf="!isLoadingAttendees" class="attendee-list">
            <div *ngFor="let reg of attendees()" class="attendee-row" [class.checked-in]="reg.status === 'checked-in'">
              <div class="attendee-avatar">{{ getStudentName(reg).charAt(0).toUpperCase() }}</div>
              <div class="attendee-info">
                <span class="attendee-name">{{ getStudentName(reg) }}</span>
                <span class="attendee-time" *ngIf="reg.checkedInAt">
                  <i class="fa-solid fa-clock"></i> {{ reg.checkedInAt | date:'h:mm a' }}
                </span>
              </div>
              <span class="badge" [ngClass]="reg.status === 'checked-in' ? 'badge-success' : 'badge-neutral'">
                {{ reg.status }}
              </span>
              <button
                *ngIf="reg.status === 'registered'"
                class="btn btn-sm btn-success"
                (click)="checkInManual(reg)">
                Check In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .check-in-layout { display:grid;grid-template-columns:1fr 1.2fr;gap:1.5rem;align-items:start; }
    @media (max-width:900px) { .check-in-layout { grid-template-columns:1fr; } }
    .scanner-card { padding:1.5rem; }
    .scan-input-group { display:flex;gap:0.75rem;margin-bottom:1.25rem; }
    .check-in-result {
      padding:1rem;border-radius:var(--radius-sm);display:flex;align-items:center;gap:0.75rem;
      margin-bottom:1rem;font-size:0.875rem;
    }
    .check-in-result.success { background:var(--success-bg);color:#065F46;border:1px solid #A7F3D0; }
    .check-in-result.danger { background:var(--danger-bg);color:#991B1B;border:1px solid #FECACA; }
    .check-in-result.warning { background:var(--warning-bg);color:#92400E;border:1px solid #FDE68A; }
    .check-in-result i { font-size:1.5rem; }
    .check-in-result div { display:flex;flex-direction:column;gap:0.1rem; }
    .check-in-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--border-light); }
    .stat-mini { text-align:center; }
    .stat-mini-num { display:block;font-family:var(--font-heading);font-size:2rem;font-weight:800;color:var(--primary); }
    .stat-mini-label { font-size:0.75rem;color:var(--text-muted); }
    .attendees-card { padding:1.5rem; }
    .attendee-list { display:flex;flex-direction:column;gap:0.5rem;max-height:60vh;overflow-y:auto; }
    .attendee-row {
      display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0.85rem;
      border-radius:var(--radius-sm);border:1px solid var(--border-light);
    }
    .attendee-row.checked-in { background:var(--success-bg); }
    .attendee-avatar {
      width:36px;height:36px;border-radius:50%;background:var(--primary);color:#FFF;
      display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.875rem;flex-shrink:0;
    }
    .attendee-info { flex:1;display:flex;flex-direction:column; }
    .attendee-name { font-weight:700;font-size:0.875rem; }
    .attendee-time { font-size:0.75rem;color:var(--text-muted); }
    .btn-success { background:var(--success);color:#FFF; }
    .loading-state { text-align:center;padding:2rem;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:0.5rem; }
  `]
})
export class CheckInComponent implements OnInit {
  private eventService = inject(EventService);
  private registrationService = inject(RegistrationService);
  private toastService = inject(ToastService);

  publishedEvents = signal<Event[]>([]);
  attendees = signal<Registration[]>([]);
  selectedEventId = '';
  qrInput = '';
  isCheckingIn = false;
  isLoadingAttendees = false;
  lastResult: any = null;

  ngOnInit(): void {
    this.eventService.getEvents({ status: 'published', limit: 50 }).subscribe(res => {
      if (res.success && res.data) this.publishedEvents.set(res.data);
    });
  }

  loadAttendees(): void {
    if (!this.selectedEventId) return;
    this.isLoadingAttendees = true;
    this.registrationService.getEventAttendees(this.selectedEventId).subscribe({
      next: res => {
        this.isLoadingAttendees = false;
        if (res.success && res.data) this.attendees.set(res.data);
      },
      error: () => { this.isLoadingAttendees = false; }
    });
  }

  checkInByQr(): void {
    if (!this.qrInput.trim()) return;
    this.isCheckingIn = true;
    this.registrationService.checkIn(this.selectedEventId, this.qrInput.trim()).subscribe({
      next: res => {
        this.isCheckingIn = false;
        if (res.success && res.data) {
          this.lastResult = {
            type: 'success',
            icon: 'fa-solid fa-circle-check',
            name: 'Check-in Successful',
            message: `Attendee marked as checked-in.`
          };
          this.attendees.update(list =>
            list.map(r => r._id === res.data!._id ? { ...r, status: 'checked-in' as any, checkedInAt: new Date().toISOString() } : r)
          );
        }
        this.qrInput = '';
      },
      error: err => {
        this.isCheckingIn = false;
        this.lastResult = {
          type: 'danger',
          icon: 'fa-solid fa-circle-xmark',
          name: 'Check-in Failed',
          message: err.error?.message || 'Invalid or expired QR token.'
        };
        this.qrInput = '';
      }
    });
  }

  checkInManual(reg: Registration): void {
    const student = typeof reg.student === 'object' ? reg.student : null;
    this.registrationService.checkIn(this.selectedEventId, undefined, typeof reg.student === 'string' ? reg.student : student?._id).subscribe({
      next: () => {
        this.attendees.update(list =>
          list.map(r => r._id === reg._id ? { ...r, status: 'checked-in' as any, checkedInAt: new Date().toISOString() } : r)
        );
        this.toastService.success(`${this.getStudentName(reg)} checked in!`);
      },
      error: err => this.toastService.error(err.error?.message || 'Check-in failed.')
    });
  }

  getStudentName(reg: Registration): string {
    const s = reg.student;
    if (typeof s === 'object') return s.name;
    return 'Student';
  }

  getCheckedInCount(): number { return this.attendees().filter(r => r.status === 'checked-in').length; }
  getRegisteredCount(): number { return this.attendees().filter(r => r.status === 'registered').length; }
  getAttendanceRate(): number {
    const total = this.attendees().filter(r => r.status !== 'waitlisted' && r.status !== 'cancelled').length;
    if (!total) return 0;
    return Math.round((this.getCheckedInCount() / total) * 100);
  }
}

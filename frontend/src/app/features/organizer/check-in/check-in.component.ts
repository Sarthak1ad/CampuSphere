import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef } from '@angular/core';
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
        <p>Select an active event and scan QR passes or enter attendance tokens to mark attendees in real time.</p>
      </div>

      <!-- Event Selector -->
      <div class="card" style="margin-bottom:1.5rem;padding:1.5rem;">
        <div class="form-group" style="margin:0;">
          <label class="form-label" style="font-weight:700;">Select Event to Check-In</label>
          <p *ngIf="publishedEvents().length === 0" style="margin:.5rem 0 0;color:var(--text-muted);">
            No events are currently ongoing. Check-in opens when an event starts and closes when it ends.
          </p>
          <select class="form-select" [(ngModel)]="selectedEventId" (change)="onEventChange()">
            <option value="">-- Choose an Event --</option>
            <option *ngFor="let event of publishedEvents()" [value]="event._id">
              {{ event.title }} ({{ event.startDate | date:'MMM d' }})
            </option>
          </select>
        </div>
      </div>

      <div *ngIf="selectedEventId" class="check-in-layout">
        <!-- Left: QR Scanner & Token Card -->
        <div class="card scanner-card">
          <div class="scanner-card-header">
            <h3 class="font-heading" style="margin:0;">
              <i class="fa-solid fa-qrcode" style="color:var(--primary);"></i> Scan / Verify Attendance
            </h3>
            <button 
              type="button" 
              class="btn btn-sm" 
              [ngClass]="isCameraActive ? 'btn-danger' : 'btn-primary'"
              (click)="toggleCameraScanner()">
              <i [class]="isCameraActive ? 'fa-solid fa-video-slash' : 'fa-solid fa-camera'"></i>
              {{ isCameraActive ? 'Close Camera' : 'Open Camera Scanner' }}
            </button>
          </div>

          <!-- Live Camera Viewfinder Overlay -->
          <div *ngIf="isCameraActive" class="camera-viewport-wrap">
            <video #videoElement autoplay playsinline muted class="camera-video"></video>
            <div class="scanner-overlay">
              <div class="target-box">
                <div class="corner tl"></div>
                <div class="corner tr"></div>
                <div class="corner bl"></div>
                <div class="corner br"></div>
                <div class="scan-laser"></div>
              </div>
            </div>
            <div class="camera-status-bar">
              <span><i class="fa-solid fa-circle-dot" style="color:#22C55E;"></i> Live Camera Active — Point at student QR code</span>
            </div>
          </div>

          <!-- Manual Token Input Group -->
          <p style="font-size:0.875rem;color:var(--text-muted);margin:1.25rem 0 0.5rem;">
            Or scan with handheld barcode gun / paste student's <strong>Attendance Token</strong>:
          </p>
          <div class="scan-input-group">
            <input
              type="text"
              class="form-control"
              [(ngModel)]="qrInput"
              placeholder="e.g. 01d57e27-c101-4829-85e0-25fd2569b184"
              (keydown.enter)="checkInByQr()"
              autofocus
            />
            <button class="btn btn-primary" (click)="checkInByQr()" [disabled]="!qrInput || isCheckingIn">
              <span *ngIf="isCheckingIn"><i class="fa-solid fa-spinner fa-spin"></i></span>
              <span *ngIf="!isCheckingIn"><i class="fa-solid fa-check"></i> Check In</span>
            </button>
          </div>

          <!-- Last Check-in Result Notification Box -->
          <div *ngIf="lastResult" class="check-in-result" [ngClass]="lastResult.type">
            <i [class]="lastResult.icon"></i>
            <div>
              <strong>{{ lastResult.name }}</strong>
              <span>{{ lastResult.message }}</span>
            </div>
          </div>

          <!-- Live Attendance Stats -->
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

        <!-- Right: Attendee List with 1-Click Check-in -->
        <div class="card attendees-card">
          <div class="attendees-header-row">
            <h3 class="font-heading" style="margin:0;">
              <i class="fa-solid fa-list-check" style="color:var(--primary);"></i> Attendee List ({{ attendees().length }})
            </h3>
            <span class="badge badge-neutral">{{ getCheckedInCount() }} / {{ attendees().length }} Present</span>
          </div>

          <div *ngIf="isLoadingAttendees" class="loading-state">
            <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i>
            <p>Loading attendee list...</p>
          </div>

          <div *ngIf="!isLoadingAttendees && attendees().length === 0" class="empty-state" style="padding:2rem; text-align:center;">
            <i class="fa-regular fa-folder-open fa-2x" style="opacity:0.4; margin-bottom:0.5rem; display:block;"></i>
            <p>No confirmed registrations yet for this event.</p>
          </div>

          <div *ngIf="!isLoadingAttendees && attendees().length > 0" class="attendee-list">
            <div *ngFor="let reg of attendees()" class="attendee-row" [class.checked-in]="reg.status === 'checked-in'">
              <div class="attendee-avatar">{{ getStudentName(reg).charAt(0).toUpperCase() }}</div>
              <div class="attendee-info">
                <span class="attendee-name">{{ getStudentName(reg) }}</span>
                <span class="attendee-time" *ngIf="reg.checkedInAt">
                  <i class="fa-solid fa-circle-check" style="color:#10B981;"></i> Checked In: {{ reg.checkedInAt | date:'h:mm a' }}
                </span>
                <span class="attendee-token-hint" *ngIf="reg.qrToken && reg.status !== 'checked-in'" (click)="fillToken(reg.qrToken)">
                  <i class="fa-solid fa-key"></i> {{ reg.qrToken.slice(0, 13) }}... (Click to load)
                </span>
              </div>
              <span class="badge" [ngClass]="reg.status === 'checked-in' ? 'badge-success' : 'badge-neutral'">
                {{ reg.status }}
              </span>
              <button
                *ngIf="reg.status === 'registered'"
                class="btn btn-sm btn-success"
                (click)="checkInManual(reg)">
                <i class="fa-solid fa-check"></i> Check In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .check-in-layout { display:grid;grid-template-columns:1fr 1.2fr;gap:1.5rem;align-items:start; }
    @media (max-width:960px) { .check-in-layout { grid-template-columns:1fr; } }
    .scanner-card { padding:1.5rem; }
    .scanner-card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    
    /* Live Camera Viewfinder Styles */
    .camera-viewport-wrap {
      position: relative;
      width: 100%;
      height: 260px;
      background: #000;
      border-radius: var(--radius-md);
      overflow: hidden;
      margin: 1rem 0;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    }
    .camera-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .scanner-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.35);
    }
    .target-box {
      position: relative;
      width: 180px;
      height: 180px;
      border: 2px solid rgba(255,255,255,0.4);
      border-radius: 12px;
      overflow: hidden;
    }
    .corner {
      position: absolute;
      width: 16px;
      height: 16px;
      border-color: var(--primary);
      border-style: solid;
    }
    .corner.tl { top: 0; left: 0; border-width: 3px 0 0 3px; }
    .corner.tr { top: 0; right: 0; border-width: 3px 3px 0 0; }
    .corner.bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; }
    .corner.br { bottom: 0; right: 0; border-width: 0 3px 3px 0; }
    
    .scan-laser {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, #FF5722, #FFB38A, transparent);
      box-shadow: 0 0 10px #FF5722;
      animation: laserSweep 2s infinite ease-in-out;
    }
    @keyframes laserSweep {
      0% { top: 5%; }
      50% { top: 95%; }
      100% { top: 5%; }
    }
    .camera-status-bar {
      position: absolute;
      bottom: 0.5rem;
      left: 0;
      right: 0;
      text-align: center;
      color: #FFFFFF;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(0,0,0,0.6);
      padding: 0.3rem;
    }

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
    .attendees-header-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; }
    .attendee-list { display:flex;flex-direction:column;gap:0.5rem;max-height:60vh;overflow-y:auto; }
    .attendee-row {
      display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0.85rem;
      border-radius:var(--radius-sm);border:1px solid var(--border-light);
    }
    .attendee-row.checked-in { background:var(--success-bg); border-color:#A7F3D0; }
    .attendee-avatar {
      width:36px;height:36px;border-radius:50%;background:var(--primary);color:#FFF;
      display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.875rem;flex-shrink:0;
    }
    .attendee-info { flex:1;display:flex;flex-direction:column; }
    .attendee-name { font-weight:700;font-size:0.875rem; }
    .attendee-time { font-size:0.75rem;color:#065F46; font-weight:600; margin-top:0.15rem; }
    .attendee-token-hint {
      font-size:0.72rem; color:var(--text-muted); cursor:pointer; font-family:monospace; margin-top:0.1rem;
    }
    .attendee-token-hint:hover { color:var(--primary); text-decoration:underline; }
    .btn-success { background:var(--success);color:#FFF; }
    .loading-state { text-align:center;padding:2rem;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:0.5rem; }
  `]
})
export class CheckInComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

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

  isCameraActive = false;
  private mediaStream: MediaStream | null = null;
  private scanInterval: any = null;

  ngOnInit(): void {
    this.eventService.getEvents({ status: 'published', limit: 50 }).subscribe(res => {
      if (res.success && res.data) {
        const activeEvents = res.data.filter(event => {
          const now = Date.now();
          return new Date(event.startDate).getTime() <= now && now <= new Date(event.endDate).getTime();
        });
        this.publishedEvents.set(activeEvents);
        if (activeEvents.length > 0 && !this.selectedEventId) {
          this.selectedEventId = activeEvents[0]._id;
          this.loadAttendees();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.stopCameraScanner();
  }

  onEventChange(): void {
    this.lastResult = null;
    this.loadAttendees();
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

  toggleCameraScanner(): void {
    if (this.isCameraActive) {
      this.stopCameraScanner();
    } else {
      this.startCameraScanner();
    }
  }

  startCameraScanner(): void {
    this.isCameraActive = true;
    setTimeout(() => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.toastService.warning('Camera access is not supported by your browser.', 'Camera Error');
        this.isCameraActive = false;
        return;
      }

      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          this.mediaStream = stream;
          if (this.videoElement) {
            this.videoElement.nativeElement.srcObject = stream;
            this.videoElement.nativeElement.play();
            this.startBarcodeScanningLoop();
          }
        })
        .catch(err => {
          console.error('Camera error:', err);
          this.toastService.error('Could not access webcam. Please check browser permissions.', 'Camera Permission');
          this.isCameraActive = false;
        });
    }, 100);
  }

  stopCameraScanner(): void {
    this.isCameraActive = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  startBarcodeScanningLoop(): void {
    // Check if BarcodeDetector is available natively in browser (Chrome/Edge)
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      this.scanInterval = setInterval(async () => {
        if (!this.videoElement || !this.videoElement.nativeElement || this.isCheckingIn) return;
        try {
          const barcodes = await barcodeDetector.detect(this.videoElement.nativeElement);
          if (barcodes && barcodes.length > 0) {
            const detectedValue = barcodes[0].rawValue;
            if (detectedValue && detectedValue !== this.qrInput) {
              this.qrInput = detectedValue;
              this.checkInByQr(detectedValue);
            }
          }
        } catch (e) {
          // ignore detection frame skip
        }
      }, 500);
    }
  }

  fillToken(token: string): void {
    this.qrInput = token;
    this.checkInByQr(token);
  }

  checkInByQr(explicitToken?: string): void {
    const token = (explicitToken || this.qrInput).trim();
    if (!token) return;
    this.isCheckingIn = true;

    this.registrationService.checkIn(this.selectedEventId, token).subscribe({
      next: res => {
        this.isCheckingIn = false;
        if (res.success && res.data) {
          const payload = res.data as any;
          const studentName = payload.studentName || 'Student';
          this.lastResult = {
            type: 'success',
            icon: 'fa-solid fa-circle-check',
            name: `✅ Checked In: ${studentName}`,
            message: `Confirmed entrance to "${payload.eventTitle || 'Event'}".`
          };
          this.toastService.success(`Attendee Checked In!`, studentName);
          this.loadAttendees();
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
        this.toastService.error(err.error?.message || 'Invalid QR code.');
        this.qrInput = '';
      }
    });
  }

  checkInManual(reg: Registration): void {
    const student = typeof reg.student === 'object' ? reg.student : null;
    const studentId = typeof reg.student === 'string' ? reg.student : student?._id;
    
    this.registrationService.checkIn(this.selectedEventId, undefined, studentId).subscribe({
      next: res => {
        this.attendees.update(list =>
          list.map(r => r._id === reg._id ? { ...r, status: 'checked-in' as any, checkedInAt: new Date().toISOString() } : r)
        );
        this.toastService.success(`${this.getStudentName(reg)} checked in!`);
        this.lastResult = {
          type: 'success',
          icon: 'fa-solid fa-circle-check',
          name: `Checked In: ${this.getStudentName(reg)}`,
          message: `Manually marked present.`
        };
      },
      error: err => this.toastService.error(err.error?.message || 'Check-in failed.')
    });
  }

  getStudentName(reg: Registration): string {
    const s = reg.student;
    if (typeof s === 'object' && s) return s.name;
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

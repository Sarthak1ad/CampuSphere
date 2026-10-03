import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from '../../../core/services/event.service';
import { ToastService } from '../../../core/services/toast.service';
import { Event } from '../../../core/models';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-event-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header" style="margin-bottom:1.5rem;">
        <h2 class="font-heading">Event Approval Queue</h2>
        <p>Review events submitted by organizers and approve or reject them.</p>
      </div>

      <div *ngIf="isLoading" class="loading-state">
        <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i>
        <p>Loading pending events...</p>
      </div>

      <div *ngIf="!isLoading && pendingEvents().length === 0" class="card empty-state">
        <i class="fa-solid fa-circle-check fa-3x" style="color:var(--success);"></i>
        <h3>All Clear!</h3>
        <p>No events pending review. All submissions have been processed.</p>
      </div>

      <div *ngIf="!isLoading && pendingEvents().length > 0" class="events-queue">
        <div *ngFor="let event of pendingEvents()" class="card event-review-card">
          <div class="event-review-header">
            <div class="event-review-poster">
              <img *ngIf="event.posterUrl" [src]="event.posterUrl" [alt]="event.title" />
              <div *ngIf="!event.posterUrl" class="poster-ph">
                <i class="fa-solid fa-shapes fa-2x" style="color:var(--primary);opacity:0.3;"></i>
              </div>
            </div>
            <div class="event-review-info">
              <span class="badge badge-primary">{{ event.category }}</span>
              <h3 class="event-review-title">{{ event.title }}</h3>
              <p class="event-review-desc">{{ event.description | slice:0:200 }}{{ event.description.length > 200 ? '...' : '' }}</p>
              <div class="event-review-meta">
                <span><i class="fa-regular fa-calendar"></i> {{ event.startDate | date:'medium' }}</span>
                <span><i class="fa-solid fa-users"></i> Capacity: {{ event.capacity }}</span>
                <span><i class="fa-solid fa-user"></i> By: {{ getOrganizerName(event) }}</span>
              </div>
            </div>
            <span class="badge badge-warning event-pending-badge">Pending Review</span>
          </div>

          <div class="event-review-actions">
            <button
              class="btn btn-success"
              [disabled]="processingId === event._id"
              (click)="approveEvent(event)">
              <i class="fa-solid fa-circle-check"></i> Approve & Publish
            </button>
            <button
              class="btn btn-danger"
              [disabled]="processingId === event._id"
              (click)="openRejectDialog(event)">
              <i class="fa-solid fa-circle-xmark"></i> Reject
            </button>
          </div>
        </div>
      </div>

      <!-- Rejection Dialog -->
      <div class="modal-backdrop" *ngIf="rejectEvent" (click)="closeRejectDialog()">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Reject Event</h3>
            <button class="btn-close" (click)="closeRejectDialog()">&times;</button>
          </div>
          <div class="modal-body">
            <p class="reject-event-name">Rejecting: <strong>{{ rejectEvent?.title }}</strong></p>
            <div class="form-group">
              <label class="form-label">Rejection Reason (visible to organizer)</label>
              <textarea
                class="form-control"
                rows="4"
                [(ngModel)]="rejectionReason"
                placeholder="Explain why the event is being rejected (required)...">
              </textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeRejectDialog()">Cancel</button>
            <button class="btn btn-danger" [disabled]="!rejectionReason.trim() || isRejecting" (click)="confirmReject()">
              <span *ngIf="isRejecting"><i class="fa-solid fa-spinner fa-spin"></i> Rejecting...</span>
              <span *ngIf="!isRejecting"><i class="fa-solid fa-xmark"></i> Confirm Rejection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loading-state, .empty-state { text-align:center;padding:3rem;display:flex;flex-direction:column;align-items:center;gap:0.75rem;color:var(--text-muted); }
    .events-queue { display:flex;flex-direction:column;gap:1.25rem; }
    .event-review-card { padding:1.5rem; }
    .event-review-header { display:flex;gap:1.5rem;align-items:flex-start;margin-bottom:1.25rem; }
    .event-review-poster { width:120px;height:100px;border-radius:var(--radius-sm);overflow:hidden;flex-shrink:0;background:#F0EDE8; }
    .event-review-poster img { width:100%;height:100%;object-fit:cover; }
    .poster-ph { width:100%;height:100%;display:flex;align-items:center;justify-content:center; }
    .event-review-info { flex:1;display:flex;flex-direction:column;gap:0.4rem; }
    .event-review-title { font-size:1.15rem;margin:0; }
    .event-review-desc { font-size:0.85rem;color:var(--text-muted);margin:0; }
    .event-review-meta { display:flex;gap:1rem;flex-wrap:wrap;font-size:0.8rem;color:var(--text-muted); }
    .event-review-meta span { display:flex;align-items:center;gap:0.35rem; }
    .event-pending-badge { flex-shrink:0; }
    .event-review-actions { display:flex;gap:0.75rem;padding-top:1rem;border-top:1px solid var(--border-light); }
    .btn-success { background:var(--success);color:#FFFFFF;border:none;padding:0.65rem 1.25rem;border-radius:var(--radius-sm);font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem; }
    .btn-close { background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted); }
    .reject-event-name { margin-bottom:1rem;font-size:0.9rem; }
  `]
})
export class EventApprovalsComponent implements OnInit {
  private eventService = inject(EventService);
  private toastService = inject(ToastService);

  pendingEvents = signal<Event[]>([]);
  isLoading = true;
  processingId: string | null = null;
  rejectEvent: Event | null = null;
  rejectionReason = '';
  isRejecting = false;

  ngOnInit(): void {
    this.eventService.getEvents({ status: 'pending', limit: 50 }).subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) this.pendingEvents.set(res.data);
      },
      error: () => { this.isLoading = false; }
    });
  }

  approveEvent(event: Event): void {
    this.processingId = event._id;
    this.eventService.updateStatus(event._id, 'published').subscribe({
      next: () => {
        this.processingId = null;
        this.pendingEvents.update(list => list.filter(e => e._id !== event._id));
        this.toastService.success(`"${event.title}" approved and published!`, 'Event Approved');
      },
      error: err => {
        this.processingId = null;
        this.toastService.error(err.error?.message || 'Approval failed.');
      }
    });
  }

  openRejectDialog(event: Event): void {
    this.rejectEvent = event;
    this.rejectionReason = '';
  }

  closeRejectDialog(): void {
    this.rejectEvent = null;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    if (!this.rejectEvent || !this.rejectionReason.trim()) return;
    this.isRejecting = true;
    this.eventService.updateStatus(this.rejectEvent._id, 'rejected', this.rejectionReason).subscribe({
      next: () => {
        this.isRejecting = false;
        this.pendingEvents.update(list => list.filter(e => e._id !== this.rejectEvent!._id));
        this.toastService.warning(`Event rejected.`, 'Event Rejected');
        this.closeRejectDialog();
      },
      error: err => {
        this.isRejecting = false;
        this.toastService.error(err.error?.message || 'Rejection failed.');
      }
    });
  }

  getOrganizerName(event: Event): string {
    const o = event.organizer;
    if (typeof o === 'object') return o.name;
    return 'Unknown';
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-qr-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop fade-in" (click)="close.emit()">
      <div class="modal-dialog" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="header-content">
            <span class="badge badge-primary">E-Ticket Pass</span>
            <h3 class="event-title">{{ eventTitle }}</h3>
          </div>
          <button class="btn-close" (click)="close.emit()">&times;</button>
        </div>

        <div class="modal-body text-center">
          <div class="qr-wrapper">
            <img *ngIf="qrDataUrl" [src]="qrDataUrl" alt="QR Code Ticket" class="qr-image" />
            <div *ngIf="!qrDataUrl" class="qr-placeholder">
              <i class="fa-solid fa-qrcode fa-3x"></i>
              <p>Generating pass...</p>
            </div>
          </div>

          <div class="ticket-meta">
            <div class="meta-row">
              <span class="meta-label">Ticket Holder</span>
              <span class="meta-val">{{ studentName }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Pass Status</span>
              <span class="badge" [ngClass]="status === 'registered' ? 'badge-success' : 'badge-warning'">
                {{ status }}
              </span>
            </div>
            <div class="meta-row" *ngIf="venueName">
              <span class="meta-label">Location / Venue</span>
              <span class="meta-val">{{ venueName }}</span>
            </div>
            <div class="meta-row" *ngIf="eventDate">
              <span class="meta-label">Date & Time</span>
              <span class="meta-val">{{ eventDate | date:'medium' }}</span>
            </div>
          </div>

          <p class="qr-hint">
            <i class="fa-solid fa-camera"></i> Present this QR code at the registration desk for check-in.
          </p>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">Close</button>
          <button class="btn btn-primary" (click)="printTicket()">
            <i class="fa-solid fa-print"></i> Print / Save Pass
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-center { text-align: center; }
    .header-content { display: flex; flex-direction: column; gap: 0.35rem; }
    .event-title { font-size: 1.15rem; margin: 0; }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-muted);
    }
    .qr-wrapper {
      padding: 1.5rem;
      background: #FAFAFA;
      border: 1px dashed var(--border-light);
      border-radius: var(--radius-md);
      display: inline-block;
      margin: 1rem auto;
    }
    .qr-image {
      width: 200px;
      height: 200px;
      display: block;
      border-radius: var(--radius-sm);
    }
    .ticket-meta {
      background: #FFFFFF;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      padding: 1rem;
      text-align: left;
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
    }
    .meta-label { color: var(--text-muted); font-weight: 500; }
    .meta-val { font-weight: 700; color: var(--text-main); }
    .qr-hint {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 1rem;
    }
  `]
})
export class QrModalComponent {
  @Input() qrDataUrl?: string;
  @Input() eventTitle: string = '';
  @Input() studentName: string = '';
  @Input() venueName?: string = '';
  @Input() eventDate?: string = '';
  @Input() status: string = 'registered';
  @Output() close = new EventEmitter<void>();

  printTicket(): void {
    window.print();
  }
}

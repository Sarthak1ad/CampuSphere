import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-qr-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop fade-in" (click)="close.emit()">
      <div class="modal-dialog" (click)="$event.stopPropagation()" style="max-width:520px;">
        <div class="modal-header">
          <div class="header-content">
            <span class="badge badge-primary">E-Ticket Pass</span>
            <h3 class="event-title">{{ eventTitle }}</h3>
          </div>
          <button class="btn-close" (click)="close.emit()">&times;</button>
        </div>

        <div class="modal-body text-center">
          <!-- QR Code Image Wrap -->
          <div class="qr-wrapper">
            <img *ngIf="qrDataUrl" [src]="qrDataUrl" alt="QR Code Ticket" class="qr-image" />
            <div *ngIf="!qrDataUrl" class="qr-placeholder">
              <i class="fa-solid fa-qrcode fa-3x" style="color:var(--primary); margin-bottom:0.5rem;"></i>
              <p style="margin:0; font-size:0.9rem; font-weight:600;">{{ qrToken ? 'Pass Ready' : 'Generating pass...' }}</p>
            </div>
          </div>

          <!-- Attendance Token Display & Copy Box -->
          <div class="token-box" *ngIf="qrToken">
            <div class="token-box-header">
              <span><i class="fa-solid fa-key" style="color:var(--primary);"></i> Attendance Check-in Token:</span>
              <button type="button" class="btn-copy" (click)="copyToken()">
                <i class="fa-regular fa-copy"></i> {{ copied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
            <code class="token-code">{{ qrToken }}</code>
          </div>

          <!-- Ticket Details Meta Card -->
          <div class="ticket-meta">
            <div class="meta-row">
              <span class="meta-label">Ticket Holder</span>
              <span class="meta-val">{{ studentName }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Pass Status</span>
              <span class="badge" [ngClass]="status === 'registered' ? 'badge-success' : 'badge-warning'">
                <i class="fa-solid fa-circle-check"></i> {{ status | uppercase }}
              </span>
            </div>
            <div class="meta-row" *ngIf="venueName">
              <span class="meta-label">Location / Venue</span>
              <span class="meta-val">{{ venueName }}</span>
            </div>
            <div class="meta-row" *ngIf="eventDate">
              <span class="meta-label">Event Date & Time</span>
              <span class="meta-val">{{ eventDate | date:'medium' }}</span>
            </div>
          </div>

          <!-- Attendance Instructions -->
          <div class="attendance-guide">
            <div class="guide-title"><i class="fa-solid fa-clipboard-user" style="color:var(--primary);"></i> How to Mark Attendance at Venue:</div>
            <ol class="guide-list">
              <li><strong>Scan QR Pass:</strong> Show this QR code to the coordinator at the entrance.</li>
              <li><strong>Or Give Token:</strong> If camera is unavailable, give the Token above to the organizer.</li>
            </ol>
          </div>
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
    .event-title { font-size: 1.2rem; margin: 0; font-weight: 700; color: var(--text-main); }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-muted);
    }
    .qr-wrapper {
      padding: 1.25rem;
      background: #FAFAFA;
      border: 1px dashed var(--border-light);
      border-radius: var(--radius-md);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0.5rem auto 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .qr-image {
      width: 200px;
      height: 200px;
      display: block;
      border-radius: var(--radius-sm);
    }
    .qr-placeholder {
      width: 200px;
      height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
    }
    .token-box {
      background: #FFF7ED;
      border: 1px solid #FED7AA;
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      text-align: left;
    }
    .token-box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.78rem;
      font-weight: 700;
      color: #9A3412;
      margin-bottom: 0.4rem;
    }
    .btn-copy {
      background: #FFFFFF;
      border: 1px solid #FDBA74;
      color: #9A3412;
      border-radius: 4px;
      padding: 0.2rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-copy:hover {
      background: var(--primary);
      color: #FFFFFF;
      border-color: var(--primary);
    }
    .token-code {
      display: block;
      font-family: monospace;
      font-size: 0.85rem;
      color: #7C2D12;
      word-break: break-all;
      background: #FFFFFF;
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      border: 1px solid #FED7AA;
    }
    .ticket-meta {
      background: #FFFFFF;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      padding: 1rem;
      text-align: left;
      margin-bottom: 1rem;
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
    .attendance-guide {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.8rem;
      color: #166534;
    }
    .guide-title { font-weight: 700; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
    .guide-list { margin: 0; padding-left: 1.2rem; line-height: 1.5; }
  `]
})
export class QrModalComponent {
  @Input() qrDataUrl?: string;
  @Input() qrToken?: string;
  @Input() eventTitle: string = '';
  @Input() studentName: string = '';
  @Input() venueName?: string = '';
  @Input() eventDate?: string = '';
  @Input() status: string = 'registered';
  @Output() close = new EventEmitter<void>();

  copied = false;

  copyToken(): void {
    if (!this.qrToken) return;
    navigator.clipboard.writeText(this.qrToken).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }

  printTicket(): void {
    window.print();
  }
}


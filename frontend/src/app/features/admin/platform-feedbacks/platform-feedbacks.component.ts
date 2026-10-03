import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../../core/services/feedback.service';
import { ToastService } from '../../../core/services/toast.service';
import { PlatformFeedback } from '../../../core/models';

@Component({
  selector: 'app-platform-feedbacks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="feedback-page">
      <div class="page-header">
        <div>
          <h1>Platform Bug Reports & Feedback</h1>
          <p class="subtitle">Review bug submissions, user suggestions, and change issue resolution statuses</p>
        </div>
        <div class="filter-group">
          <select [(ngModel)]="statusFilter" (change)="loadFeedbacks()" class="form-select">
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      <div class="feedback-grid" *ngIf="feedbacks().length > 0; else noFeedbacks">
        <div *ngFor="let item of feedbacks()" class="feedback-card">
          <div class="card-top">
            <div class="type-author">
              <span class="badge-type" [class.bug]="item.type === 'bug'" [class.suggestion]="item.type === 'suggestion'">
                {{ item.type | uppercase }}
              </span>
              <span class="user-meta">Submitted by <strong>{{ item.user?.name || 'Anonymous User' }}</strong></span>
            </div>
            <span class="badge-status" [ngClass]="item.status">
              {{ item.status }}
            </span>
          </div>

          <h3 class="item-title">{{ item.title }}</h3>
          <p class="item-desc">{{ item.description }}</p>

          <div *ngIf="item.screenshotUrl" class="screenshot-wrap">
            <a [href]="item.screenshotUrl" target="_blank" class="screenshot-link">
              <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              View Attached Screenshot
            </a>
          </div>

          <div class="card-actions">
            <span class="time-stamp">{{ item.createdAt | date:'medium' }}</span>
            <div class="status-buttons">
              <button 
                *ngIf="item.status !== 'planned'"
                class="btn-action in-review" 
                (click)="updateStatus(item._id, 'planned')">
                Plan
              </button>
              <button 
                *ngIf="item.status !== 'in-progress'"
                class="btn-action in-review" 
                (click)="updateStatus(item._id, 'in-progress')">
                In Progress
              </button>
              <button 
                *ngIf="item.status !== 'done'"
                class="btn-action resolved" 
                (click)="updateStatus(item._id, 'done')">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>

      <ng-template #noFeedbacks>
        <div class="empty-state-box">
          <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3>No feedback items found</h3>
          <p>No user suggestions or bug reports matching the selected criteria.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .feedback-page {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }

    .form-select {
      padding: 8px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      background: #ffffff;
    }

    .feedback-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .feedback-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .type-author {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .badge-type {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .badge-type.bug { background: #fee2e2; color: #991b1b; }
    .badge-type.suggestion { background: #dbeafe; color: #1e40af; }

    .user-meta {
      font-size: 13px;
      color: #475569;
    }

    .badge-status {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: capitalize;
    }

    .badge-status.pending { background: #fef3c7; color: #92400e; }
    .badge-status.in-review { background: #e0e7ff; color: #3730a3; }
    .badge-status.resolved { background: #dcfce7; color: #166534; }
    .badge-status.closed { background: #f1f5f9; color: #475569; }

    .item-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px 0;
    }

    .item-desc {
      font-size: 14px;
      color: #334155;
      line-height: 1.5;
      margin: 0 0 14px 0;
    }

    .screenshot-wrap {
      margin-bottom: 14px;
    }

    .screenshot-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #4f46e5;
      font-weight: 600;
      text-decoration: none;
    }

    .screenshot-link:hover {
      text-decoration: underline;
    }

    .icon {
      width: 14px;
      height: 14px;
    }

    .card-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
      flex-wrap: wrap;
      gap: 8px;
    }

    .time-stamp {
      font-size: 12px;
      color: #94a3b8;
    }

    .status-buttons {
      display: flex;
      gap: 8px;
    }

    .btn-action {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s;
    }

    .btn-action.in-review {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }

    .btn-action.resolved {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }

    .btn-action.closed {
      background: #f8fafc;
      color: #475569;
      border-color: #cbd5e1;
    }

    .empty-state-box {
      text-align: center;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      padding: 48px 24px;
      color: #64748b;
    }

    .empty-icon {
      width: 48px;
      height: 48px;
      color: #94a3b8;
      margin-bottom: 12px;
    }
  `]
})
export class PlatformFeedbacksComponent implements OnInit {
  private feedbackService = inject(FeedbackService);
  private toast = inject(ToastService);

  feedbacks = signal<PlatformFeedback[]>([]);
  statusFilter = '';

  ngOnInit() {
    this.loadFeedbacks();
  }

  loadFeedbacks() {
    this.feedbackService.getPlatformFeedbacks(this.statusFilter).subscribe({
      next: (res) => {
        this.feedbacks.set(res.data || []);
      },
      error: () => this.toast.error('Failed to load platform feedback items')
    });
  }

  updateStatus(id: string, status: string) {
    this.feedbackService.updatePlatformFeedbackStatus(id, status).subscribe({
      next: () => {
        this.toast.success(`Marked as ${status}`);
        this.loadFeedbacks();
      },
      error: () => this.toast.error('Failed to update status')
    });
  }
}

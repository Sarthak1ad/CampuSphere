import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeedbackService } from '../../../core/services/feedback.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService } from '../../../core/services/toast.service';
import { Registration, Event } from '../../../core/models';

@Component({
  selector: 'app-student-feedback',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <h2 class="font-heading">Event Reviews & Feedback</h2>
        <p>Share your experience from events you attended. Your feedback helps improve future events.</p>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="loading-state">
        <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i>
        <p>Loading attended events...</p>
      </div>

      <!-- No attended events -->
      <div *ngIf="!isLoading && attendedEvents().length === 0" class="empty-state card">
        <i class="fa-solid fa-star fa-3x" style="color:var(--text-light);"></i>
        <h3>No Events to Review</h3>
        <p>Attend and get checked-in to events to unlock the feedback form.</p>
      </div>

      <!-- Feedback Forms -->
      <div *ngIf="!isLoading && attendedEvents().length > 0" class="feedback-list">
        <div *ngFor="let reg of attendedEvents()" class="card feedback-card">
          <div class="feedback-event-header">
            <div class="feedback-event-info">
              <span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Attended</span>
              <h3 class="feedback-event-title">{{ getEvent(reg)?.title }}</h3>
              <span class="feedback-event-date">
                <i class="fa-regular fa-calendar"></i>
                {{ getEvent(reg)?.startDate | date:'EEE, MMM d, y' }}
              </span>
            </div>
            <div *ngIf="submittedIds.has(reg._id)" class="already-submitted">
              <i class="fa-solid fa-circle-check" style="color:var(--success);"></i>
              <span>Review submitted!</span>
            </div>
          </div>

          <div *ngIf="!submittedIds.has(reg._id)" class="feedback-form-wrap">
            <form [formGroup]="getFeedbackForm(reg._id)" (ngSubmit)="submitFeedback(reg)">
              <!-- Rating criteria -->
              <div class="criteria-grid">
                <div *ngFor="let crit of criteria" class="criterion-row">
                  <label class="criterion-label">{{ crit.label }}</label>
                  <div class="star-rating">
                    <button *ngFor="let star of [1,2,3,4,5]"
                      type="button"
                      class="star-btn"
                      [class.active]="getFeedbackForm(reg._id).get(crit.key)!.value >= star"
                      (click)="setRating(reg._id, crit.key, star)">
                      <i class="fa-solid fa-star"></i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Comment -->
              <div class="form-group" style="margin-top:1rem;">
                <label class="form-label">Overall Comments (optional)</label>
                <textarea
                  class="form-control"
                  rows="3"
                  formControlName="comment"
                  placeholder="Share your experience, suggestions, or highlights...">
                </textarea>
              </div>

              <button type="submit" class="btn btn-primary" [disabled]="submittingId === reg._id">
                <span *ngIf="submittingId === reg._id"><i class="fa-solid fa-spinner fa-spin"></i> Submitting...</span>
                <span *ngIf="submittingId !== reg._id"><i class="fa-solid fa-paper-plane"></i> Submit Review</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .loading-state, .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .feedback-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .feedback-card { padding: 1.5rem; }
    .feedback-event-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
    }
    .feedback-event-info { display: flex; flex-direction: column; gap: 0.35rem; }
    .feedback-event-title { font-size: 1.15rem; margin: 0; }
    .feedback-event-date { font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; }
    .already-submitted {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--success);
      font-weight: 600;
      font-size: 0.875rem;
    }
    .criteria-grid { display: flex; flex-direction: column; gap: 0.85rem; }
    .criterion-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0.85rem;
      background: #FAFAFA;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
    }
    .criterion-label { font-size: 0.875rem; font-weight: 600; }
    .star-rating { display: flex; gap: 0.25rem; }
    .star-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: #D1D5DB;
      cursor: pointer;
      transition: all 0.15s ease;
      padding: 0 0.1rem;
    }
    .star-btn.active { color: #F59E0B; }
    .star-btn:hover { color: #F59E0B; transform: scale(1.15); }
  `]
})
export class StudentFeedbackComponent implements OnInit {
  private registrationService = inject(RegistrationService);
  private feedbackService = inject(FeedbackService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  attendedEvents = signal<Registration[]>([]);
  isLoading = true;
  submittedIds = new Set<string>();
  submittingId: string | null = null;

  private forms = new Map<string, FormGroup>();

  criteria = [
    { key: 'eventQuality', label: 'Event Quality & Content' },
    { key: 'organization', label: 'Organization & Management' },
    { key: 'venueSuitability', label: 'Venue Suitability' },
    { key: 'contentRelevance', label: 'Content Relevance' },
    { key: 'overallValue', label: 'Overall Value / Experience' }
  ];

  ngOnInit(): void {
    this.registrationService.getMyRegistrations().subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) {
          const attended = res.data.filter(r => r.status === 'checked-in');
          this.attendedEvents.set(attended);
          attended.forEach(r => this.initForm(r._id));
        }
      },
      error: () => { this.isLoading = false; }
    });
  }

  initForm(regId: string): void {
    this.forms.set(regId, this.fb.group({
      eventQuality: [3],
      organization: [3],
      venueSuitability: [3],
      contentRelevance: [3],
      overallValue: [3],
      comment: ['']
    }));
  }

  getFeedbackForm(regId: string): FormGroup {
    if (!this.forms.has(regId)) this.initForm(regId);
    return this.forms.get(regId)!;
  }

  setRating(regId: string, key: string, value: number): void {
    this.getFeedbackForm(regId).get(key)?.setValue(value);
  }

  getEvent(reg: Registration): Event | null {
    return typeof reg.event === 'object' ? reg.event as Event : null;
  }

  submitFeedback(reg: Registration): void {
    const form = this.getFeedbackForm(reg._id);
    const val = form.value;
    const eventId = typeof reg.event === 'object' ? (reg.event as Event)._id : reg.event;
    const avgRating = (val.eventQuality + val.organization + val.venueSuitability + val.contentRelevance + val.overallValue) / 5;

    this.submittingId = reg._id;
    this.feedbackService.submitEventFeedback({
      event: eventId,
      rating: Math.round(avgRating),
      answers: {
        eventQuality: val.eventQuality,
        organization: val.organization,
        venueSuitability: val.venueSuitability,
        contentRelevance: val.contentRelevance,
        overallValue: val.overallValue
      },
      comment: val.comment
    }).subscribe({
      next: () => {
        this.submittingId = null;
        this.submittedIds.add(reg._id);
        this.toastService.success('Feedback submitted! Thank you for reviewing.', 'Review Submitted');
      },
      error: err => {
        this.submittingId = null;
        this.toastService.error(err.error?.message || 'Failed to submit feedback.');
      }
    });
  }
}

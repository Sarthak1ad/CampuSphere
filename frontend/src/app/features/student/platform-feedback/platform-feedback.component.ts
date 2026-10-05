import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeedbackService } from '../../../core/services/feedback.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-platform-feedback',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <h2 class="font-heading">Submit Platform Feedback</h2>
        <p>Found a bug or have a feature request? Let us know! Your reports help improve CampuSphere.</p>
      </div>

      <div class="card" style="max-width:640px;">
        <div *ngIf="submitted" class="success-box">
          <i class="fa-solid fa-circle-check fa-2x" style="color:var(--success);"></i>
          <div>
            <h3 style="margin:0 0 0.25rem 0;">Thank you for your feedback!</h3>
            <p style="margin:0; color:var(--text-muted); font-size:0.9rem;">Your feedback has been submitted successfully and is visible to the admin team.</p>
          </div>
          <button type="button" class="btn btn-secondary" style="margin-top:1rem;" (click)="resetForm()">
            <i class="fa-solid fa-plus"></i> Submit Another Feedback
          </button>
        </div>

        <form *ngIf="!submitted" [formGroup]="feedbackForm" (ngSubmit)="onSubmit()">
          <!-- Type Selection -->
          <div class="form-group">
            <label class="form-label">Feedback Type</label>
            <div class="type-selector">
              <button type="button" class="type-btn" [class.active]="feedbackForm.get('type')?.value === 'bug'" (click)="feedbackForm.get('type')?.setValue('bug')">
                <i class="fa-solid fa-bug"></i> Bug Report
              </button>
              <button type="button" class="type-btn" [class.active]="feedbackForm.get('type')?.value === 'suggestion'" (click)="feedbackForm.get('type')?.setValue('suggestion')">
                <i class="fa-solid fa-lightbulb"></i> Feature Request
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Title (Short Summary) <span style="color:var(--danger);">*</span></label>
            <input type="text" class="form-control" formControlName="title" placeholder="e.g. Management Issue or QR code error" />
            <div class="form-error" *ngIf="f['title'].touched && f['title'].errors?.['required']">Title is required</div>
            <div class="form-error" *ngIf="f['title'].touched && f['title'].errors?.['minlength']">Title must be at least 2 characters</div>
          </div>

          <div class="form-group">
            <label class="form-label">Description (Details / Notes) <span style="color:var(--danger);">*</span></label>
            <textarea class="form-control" formControlName="description" rows="5" placeholder="Please describe the issue or suggestion in detail..."></textarea>
            <div class="form-error" *ngIf="f['description'].touched && f['description'].errors?.['required']">Description is required</div>
            <div class="form-error" *ngIf="f['description'].touched && f['description'].errors?.['minlength']">Description must be at least 2 characters</div>
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="isSubmitting">
            <span *ngIf="isSubmitting"><i class="fa-solid fa-spinner fa-spin"></i> Submitting...</span>
            <span *ngIf="!isSubmitting"><i class="fa-solid fa-paper-plane"></i> Send Feedback</span>
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .type-selector { display: flex; gap: 0.75rem; }
    .type-btn {
      flex: 1;
      padding: 0.85rem;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: #FAFAFA;
      cursor: pointer;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }
    .type-btn.active {
      border-color: var(--primary);
      background: var(--primary-tint);
      color: var(--primary);
    }
    .form-error {
      color: var(--danger, #EF4444);
      font-size: 0.8rem;
      margin-top: 0.35rem;
    }
    .success-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.75rem;
      padding: 2rem 1rem;
    }
  `]
})
export class PlatformFeedbackComponent {
  private fb = inject(FormBuilder);
  private feedbackService = inject(FeedbackService);
  private toastService = inject(ToastService);

  submitted = false;
  isSubmitting = false;

  feedbackForm: FormGroup = this.fb.group({
    type: ['bug'],
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(2)]]
  });

  get f() { return this.feedbackForm.controls; }

  resetForm(): void {
    this.submitted = false;
    this.feedbackForm.reset({ type: 'bug', title: '', description: '' });
  }

  onSubmit(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      this.toastService.warning('Please fill in all required fields (minimum 2 characters).');
      return;
    }
    this.isSubmitting = true;
    this.feedbackService.submitPlatformFeedback(this.feedbackForm.value).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitted = true;
        this.toastService.success('Thank you! Your feedback has been submitted to the admin team.', 'Feedback Sent');
      },
      error: err => {
        this.isSubmitting = false;
        let msg = err.error?.message || 'Failed to submit feedback.';
        if (err.error?.errors && Array.isArray(err.error.errors) && err.error.errors.length > 0) {
          const fieldMsgs = err.error.errors.map((e: any) => e.message || e.msg).filter(Boolean).join(', ');
          if (fieldMsgs) msg = `${msg}: ${fieldMsgs}`;
        }
        this.toastService.error(msg);
      }
    });
  }
}

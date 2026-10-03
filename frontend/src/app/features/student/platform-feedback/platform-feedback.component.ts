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
        <div *ngIf="submitted" class="alert alert-success">
          <i class="fa-solid fa-circle-check fa-lg"></i>
          <div>
            <strong>Thank you!</strong> Your feedback has been submitted and is visible to the admin team.
          </div>
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
            <label class="form-label">Title (Short Summary)</label>
            <input type="text" class="form-control" formControlName="title" placeholder="e.g. QR code not loading on iOS Safari" />
            <div class="form-error" *ngIf="f['title'].touched && f['title'].errors?.['required']">Title is required</div>
          </div>

          <div class="form-group">
            <label class="form-label">Description (Steps to Reproduce / Details)</label>
            <textarea class="form-control" formControlName="description" rows="5" placeholder="Please be as detailed as possible. Include browser, device, and steps to reproduce (for bugs)."></textarea>
            <div class="form-error" *ngIf="f['description'].touched && f['description'].errors?.['required']">Description is required</div>
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="feedbackForm.invalid || isSubmitting">
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
    title: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(10)]]
  });

  get f() { return this.feedbackForm.controls; }

  onSubmit(): void {
    if (this.feedbackForm.invalid) return;
    this.isSubmitting = true;
    this.feedbackService.submitPlatformFeedback(this.feedbackForm.value).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitted = true;
      },
      error: err => {
        this.isSubmitting = false;
        this.toastService.error(err.error?.message || 'Failed to submit.');
      }
    });
  }
}

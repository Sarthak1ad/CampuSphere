import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { VenueService } from '../../../core/services/venue.service';
import { ToastService } from '../../../core/services/toast.service';
import { Venue, EventCategory } from '../../../core/models';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="fade-in">
      <nav class="breadcrumb-nav">
        <a routerLink="/organizer/events"><i class="fa-solid fa-arrow-left"></i> My Events</a>
        <span>&rsaquo;</span>
        <span>{{ isEditMode ? 'Edit Event' : 'Create New Event' }}</span>
      </nav>

      <div class="page-header" style="margin-bottom:1.5rem;">
        <h2 class="font-heading">{{ isEditMode ? 'Edit Event' : 'Create New Event' }}</h2>
        <p *ngIf="!isEditMode">Fill in the details below. Event will be sent for admin approval before publishing.</p>
      </div>

      <form [formGroup]="eventForm" (ngSubmit)="onSubmit()">
        <div class="form-layout">
          <!-- Left: Core Details -->
          <div class="form-main">
            <div class="card form-section">
              <h3 class="section-title"><i class="fa-solid fa-circle-info" style="color:var(--primary);"></i> Core Details</h3>

              <div class="form-group">
                <label class="form-label">Event Title *</label>
                <input type="text" class="form-control" formControlName="title" placeholder="e.g. Annual Hackathon 2025"
                  [class.is-invalid]="f['title'].touched && f['title'].invalid" />
                <div class="form-error" *ngIf="f['title'].touched && f['title'].errors?.['required']">Title is required</div>
              </div>

              <div class="form-group">
                <label class="form-label">Description * <span class="char-hint" [class.char-ok]="descLen >= 50" [class.char-warn]="descLen < 50">({{ descLen }}/50 min)</span></label>
                <textarea class="form-control" formControlName="description" rows="5" placeholder="Describe the event in at least 50 characters (markdown like **bold** supported)..."
                  [class.is-invalid]="f['description'].touched && f['description'].invalid"></textarea>
                <div class="form-error" *ngIf="f['description'].touched && f['description'].errors?.['required']">Description is required</div>
                <div class="form-error" *ngIf="f['description'].touched && f['description'].errors?.['minlength']">Description must be at least 50 characters (currently {{ descLen }})</div>
              </div>

              <div class="two-col">
                <div class="form-group">
                  <label class="form-label">Category *</label>
                  <select class="form-select" formControlName="category">
                    <option value="" disabled>Select category</option>
                    <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Capacity (Max Seats) *</label>
                  <input type="number" class="form-control" formControlName="capacity" placeholder="e.g. 200" min="1" />
                </div>
              </div>

              <div class="two-col">
                <div class="form-group">
                  <label class="form-label">Start Date & Time *</label>
                  <input type="datetime-local" class="form-control" formControlName="startDate"
                    [class.is-invalid]="f['startDate'].touched && f['startDate'].invalid" />
                  <div class="form-error" *ngIf="f['startDate'].touched && f['startDate'].errors?.['required']">Start date is required</div>
                  <div class="form-error" *ngIf="f['startDate'].touched && f['startDate'].errors?.['pastDate']">⚠️ Start date must be in the future</div>
                </div>
                <div class="form-group">
                  <label class="form-label">End Date & Time *</label>
                  <input type="datetime-local" class="form-control" formControlName="endDate"
                    [class.is-invalid]="f['endDate'].touched && f['endDate'].invalid" />
                  <div class="form-error" *ngIf="f['endDate'].touched && f['endDate'].errors?.['required']">End date is required</div>
                  <div class="form-error" *ngIf="eventForm.errors?.['endBeforeStart']">⚠️ End date must be at least 1 hour after start date</div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Venue</label>
                <select class="form-select" formControlName="venue">
                  <option value="">Select Venue</option>
                  <option *ngFor="let venue of venues()" [value]="venue._id">
                    {{ venue.name }} ({{ venue.address.city }}) — Capacity: {{ venue.capacity }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Tags (comma separated)</label>
                <input type="text" class="form-control" formControlName="tagsInput" placeholder="e.g. coding, AI, hackathon" />
              </div>
            </div>

            <!-- Budget Section -->
            <div class="card form-section">
              <h3 class="section-title"><i class="fa-solid fa-indian-rupee-sign" style="color:var(--primary);"></i> Budget Breakdown</h3>
              <div class="form-group">
                <label class="form-label">Total Budget (₹)</label>
                <input type="number" class="form-control" formControlName="budgetTotal" placeholder="0" min="0" />
              </div>
              <div formArrayName="budgetBreakdown">
                <div *ngFor="let item of budgetItems.controls; let i = index" [formGroupName]="i" class="budget-row">
                  <input type="text" class="form-control" formControlName="item" placeholder="Budget Item (e.g. Venue Rental)" />
                  <input type="number" class="form-control" formControlName="amount" placeholder="Amount (₹)" style="max-width:160px;" />
                  <button type="button" class="btn btn-sm btn-danger" (click)="removeBudgetItem(i)">
                    <i class="fa-solid fa-minus"></i>
                  </button>
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-outline" (click)="addBudgetItem()" style="margin-top:0.5rem;">
                <i class="fa-solid fa-plus"></i> Add Budget Item
              </button>
            </div>

            <div class="card form-section">
              <h3 class="section-title"><i class="fa-solid fa-list-check" style="color:var(--primary);"></i> Event Tasks</h3>
              <p class="form-help">Add the main tasks completed for this event. They will appear in the completed event report.</p>
              <div formArrayName="tasks">
                <div *ngFor="let task of taskItems.controls; let i = index" [formGroupName]="i" class="task-row">
                  <input type="text" class="form-control" formControlName="title" placeholder="Task (e.g. Registration desk setup)" />
                  <button type="button" class="btn btn-sm btn-danger" (click)="removeTask(i)"><i class="fa-solid fa-minus"></i></button>
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-outline" (click)="addTask()" style="margin-top:0.5rem;">
                <i class="fa-solid fa-plus"></i> Add Task
              </button>
            </div>
          </div>

          <!-- Right: Poster & Submit -->
          <div class="form-sidebar">
            <div class="card form-section">
              <h3 class="section-title"><i class="fa-solid fa-image" style="color:var(--primary);"></i> Event Poster</h3>
              <div class="poster-upload-zone" (click)="posterInput.click()">
                <img *ngIf="posterPreview" [src]="posterPreview" alt="poster preview" class="poster-preview" />
                <div *ngIf="!posterPreview" class="upload-placeholder">
                  <i class="fa-solid fa-cloud-arrow-up fa-2x"></i>
                  <span>Click to upload image</span>
                  <small>JPG/PNG, max 5MB</small>
                </div>
              </div>
              <input #posterInput type="file" accept="image/jpeg,image/png" style="display:none;" (change)="onFileChange($event)" />
              <button *ngIf="posterPreview" type="button" class="btn btn-sm btn-secondary" (click)="clearPoster()" style="margin-top:0.5rem;width:100%;">
                <i class="fa-solid fa-xmark"></i> Remove Poster
              </button>
            </div>

            <div class="card form-section">
              <h3 class="section-title"><i class="fa-solid fa-paper-plane" style="color:var(--primary);"></i> Publish</h3>
              <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">
                Save as draft or submit for admin review. Published events appear on the student portal.
              </p>

              <div style="display:flex;flex-direction:column;gap:0.75rem;">
                <button type="submit" class="btn btn-primary" [disabled]="isSubmitting">
                  <span *ngIf="isSubmitting"><i class="fa-solid fa-spinner fa-spin"></i> {{ isEditMode ? 'Saving...' : 'Submitting...' }}</span>
                  <span *ngIf="!isSubmitting">
                    <i class="fa-solid fa-paper-plane"></i> {{ isEditMode ? 'Save Changes' : 'Submit for Approval' }}
                  </span>
                </button>
                <a routerLink="/organizer/events" class="btn btn-secondary" style="text-align:center;">
                  <i class="fa-solid fa-xmark"></i> Cancel
                </a>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .breadcrumb-nav { display:flex;align-items:center;gap:0.5rem;margin-bottom:1.5rem;font-size:0.875rem;color:var(--text-muted); }
    .breadcrumb-nav a { font-weight:600; }
    .form-layout { display:grid;grid-template-columns:1fr 340px;gap:1.5rem;align-items:start; }
    @media (max-width:1000px) { .form-layout { grid-template-columns:1fr; } }
    .form-section { padding:1.5rem;margin-bottom:0; }
    .form-main { display:flex;flex-direction:column;gap:1.25rem; }
    .form-sidebar { display:flex;flex-direction:column;gap:1.25rem; }
    .section-title { font-size:1rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:0.5rem; }
    .two-col { display:grid;grid-template-columns:1fr 1fr;gap:1rem; }
    @media (max-width:640px) { .two-col { grid-template-columns:1fr; } }
    .budget-row { display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:center; }
    .task-row { display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:center; }
    .form-help { color:var(--text-muted);font-size:0.85rem;margin:0 0 0.75rem; }
    .poster-upload-zone {
      border:2px dashed var(--border-light);border-radius:var(--radius-md);
      padding:1.5rem;cursor:pointer;text-align:center;
      background:#FAFAFA;transition:all 0.2s ease;
      min-height:200px;display:flex;align-items:center;justify-content:center;
    }
    .poster-upload-zone:hover { border-color:var(--primary);background:var(--primary-tint); }
    .poster-preview { max-width:100%;max-height:250px;border-radius:var(--radius-sm);object-fit:cover; }
    .upload-placeholder { display:flex;flex-direction:column;align-items:center;gap:0.5rem;color:var(--text-muted); }
    .char-hint { font-size:0.75rem; font-weight:600; margin-left:0.4rem; }
    .char-warn { color: #DC2626; }
    .char-ok { color: #16A34A; }
  `]
})
export class EventFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventService = inject(EventService);
  private venueService = inject(VenueService);
  private toastService = inject(ToastService);

  isEditMode = false;
  eventId: string | null = null;
  isSubmitting = false;
  posterPreview: string | null = null;
  posterFile: File | null = null;
  venues = signal<Venue[]>([]);

  categories: EventCategory[] = ['Academic', 'Cultural', 'Sports', 'Social', 'Workshop', 'Seminar'];

  eventForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(10000)]],
    category: ['', Validators.required],
    capacity: [100, [Validators.required, Validators.min(1)]],
    startDate: ['', [Validators.required, this.futureDateValidator()]],
    endDate: ['', Validators.required],
    venue: ['', Validators.required],
    tagsInput: [''],
    budgetTotal: [0],
    budgetBreakdown: this.fb.array([]),
    tasks: this.fb.array([])
  }, { validators: this.dateRangeValidator() });

  get f() { return this.eventForm.controls; }
  get budgetItems(): FormArray { return this.eventForm.get('budgetBreakdown') as FormArray; }
  get taskItems(): FormArray { return this.eventForm.get('tasks') as FormArray; }
  get descLen(): number { return (this.f['description'].value || '').length; }

  // Validator: start date must be in the future
  futureDateValidator() {
    return (control: any) => {
      if (!control.value) return null;
      const selected = new Date(control.value);
      return selected > new Date() ? null : { pastDate: true };
    };
  }

  // Cross-field validator: end must be >= start + 1 hour
  dateRangeValidator() {
    return (group: any) => {
      const start = group.get('startDate')?.value;
      const end = group.get('endDate')?.value;
      if (!start || !end) return null;
      const diffMs = new Date(end).getTime() - new Date(start).getTime();
      return diffMs >= 3600000 ? null : { endBeforeStart: true };
    };
  }

  ngOnInit(): void {
    this.venueService.getVenues().subscribe(res => {
      if (res.success && res.data) this.venues.set(res.data);
    });

    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.isEditMode = true;
      this.eventService.getEventById(this.eventId).subscribe(res => {
        if (res.success && res.data) {
          const e = res.data;
          this.eventForm.patchValue({
            title: e.title,
            description: e.description,
            category: e.category,
            capacity: e.capacity,
            startDate: new Date(e.startDate).toISOString().slice(0, 16),
            endDate: new Date(e.endDate).toISOString().slice(0, 16),
            venue: typeof e.venue === 'object' ? e.venue._id : e.venue,
            tagsInput: (e.tags || []).join(', '),
            budgetTotal: e.budget?.total || 0
          });
          (e.tasks || []).forEach(task => this.taskItems.push(this.fb.group({
            title: [task.title, [Validators.required, Validators.maxLength(200)]],
          })));
          if (e.posterUrl) this.posterPreview = e.posterUrl;
        }
      });
    }
  }

  addBudgetItem(): void {
    this.budgetItems.push(this.fb.group({ item: [''], amount: [0] }));
  }

  removeBudgetItem(i: number): void {
    this.budgetItems.removeAt(i);
  }

  addTask(): void {
    this.taskItems.push(this.fb.group({ title: ['', [Validators.required, Validators.maxLength(200)]] }));
  }

  removeTask(i: number): void {
    this.taskItems.removeAt(i);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.posterFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => { this.posterPreview = e.target?.result as string; };
      reader.readAsDataURL(this.posterFile);
    }
  }

  clearPoster(): void {
    this.posterPreview = null;
    this.posterFile = null;
  }

  onSubmit(): void {
    this.eventForm.markAllAsTouched();

    if (this.eventForm.invalid) {
      // Give specific error messages to guide the user
      const errors: string[] = [];
      if (this.f['title'].errors) errors.push('Event title is invalid');
      if (this.f['description'].errors?.['required']) errors.push('Description is required');
      if (this.f['description'].errors?.['minlength']) errors.push(`Description too short (${this.descLen}/50 chars)`);
      if (this.f['startDate'].errors?.['required']) errors.push('Start date is required');
      if (this.f['startDate'].errors?.['pastDate']) errors.push('Start date must be in the future');
      if (this.f['endDate'].errors?.['required']) errors.push('End date is required');
      if (this.eventForm.errors?.['endBeforeStart']) errors.push('End date must be at least 1 hour after start');
      if (this.f['category'].errors) errors.push('Category is required');

      this.toastService.error(errors.length ? errors[0] : 'Please fix the errors in the form.', 'Validation Error');
      return;
    }

    this.isSubmitting = true;
    const val = this.eventForm.value;

    const formData = new FormData();
    formData.append('title', val.title);
    formData.append('description', val.description);
    formData.append('category', val.category);
    formData.append('capacity', val.capacity);
    formData.append('startDate', new Date(val.startDate).toISOString());
    formData.append('endDate', new Date(val.endDate).toISOString());
    if (val.venue) formData.append('venueId', val.venue);
    if (val.tagsInput) {
      const tags = val.tagsInput.split(',').map((t: string) => t.trim()).filter(Boolean);
      formData.append('tags', JSON.stringify(tags));
    }
    formData.append('budget', JSON.stringify({
      total: val.budgetTotal,
      breakdown: val.budgetBreakdown
    }));
    formData.append('tasks', JSON.stringify((val.tasks || []).map((task: { title: string }) => ({
      title: task.title,
      completed: false,
    }))));
    if (this.posterFile) formData.append('poster', this.posterFile);

    const req$ = this.isEditMode
      ? this.eventService.updateEvent(this.eventId!, formData)
      : this.eventService.createEvent(formData);

    req$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastService.success(
          this.isEditMode ? 'Event updated!' : 'Event submitted for admin approval!',
          this.isEditMode ? 'Saved' : 'Submitted'
        );
        this.router.navigate(['/organizer/events']);
      },
      error: err => {
        this.isSubmitting = false;
        this.toastService.error(err.error?.message || 'Failed to save event.');
      }
    });
  }
}

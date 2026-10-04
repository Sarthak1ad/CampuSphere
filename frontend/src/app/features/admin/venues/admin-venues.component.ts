import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { VenueService } from '../../../core/services/venue.service';
import { ToastService } from '../../../core/services/toast.service';
import { Venue } from '../../../core/models';

@Component({
  selector: 'app-admin-venues',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header-row">
        <div>
          <h2 class="font-heading">Campus Venues</h2>
          <p>Manage venue data including GeoJSON coordinates for MongoDB 2dsphere spatial queries.</p>
        </div>
        <button class="btn btn-primary" (click)="openForm()">
          <i class="fa-solid fa-plus"></i> Add Venue
        </button>
      </div>

      <div *ngIf="isLoading" class="loading-state">
        <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i>
      </div>

      <!-- Venues Grid -->
      <div *ngIf="!isLoading" class="venues-grid">
        <div *ngFor="let venue of venues()" class="card venue-card card-hover">
          <div class="venue-header">
            <div class="venue-icon"><i class="fa-solid fa-building"></i></div>
            <div class="venue-header-info">
              <h4 class="venue-name">{{ venue.name }}</h4>
              <span class="venue-address">{{ venue.address?.building }}, {{ venue.address?.city }}</span>
            </div>
          </div>
          <div class="venue-stats">
            <span class="venue-stat"><i class="fa-solid fa-chair"></i> {{ venue.capacity }} seats</span>
            <span class="venue-stat geo" *ngIf="venue.location?.coordinates">
              <i class="fa-solid fa-location-dot"></i>
              {{ venue.location.coordinates[0].toFixed(4) }}, {{ venue.location.coordinates[1].toFixed(4) }}
            </span>
          </div>
          <div class="venue-amenities" *ngIf="venue.amenities?.length">
            <span *ngFor="let a of venue.amenities.slice(0,3)" class="badge badge-neutral amenity-tag">{{ a }}</span>
          </div>
          <div class="venue-actions">
            <button class="btn btn-sm btn-outline" (click)="editVenue(venue)">Edit</button>
            <button class="btn btn-sm btn-danger" (click)="deleteVenue(venue._id)">Delete</button>
          </div>
        </div>
      </div>

      <!-- Venue Form Modal -->
      <div class="modal-backdrop" *ngIf="showForm" (click)="closeForm()">
        <div class="modal-dialog" (click)="$event.stopPropagation()" style="max-width:620px;">
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:0.6rem;">
              <i class="fa-solid fa-map-location-dot" style="color:var(--primary); font-size:1.2rem;"></i>
              <h3 style="margin:0; font-size:1.25rem;">{{ editingVenue ? 'Edit Venue' : 'Add New Venue' }}</h3>
            </div>
            <button class="btn-close" (click)="closeForm()">&times;</button>
          </div>
          <div class="modal-body">
            <form [formGroup]="venueForm">
              <div class="form-group" style="margin-bottom:1.15rem;">
                <label class="form-label" style="font-weight:700; color:var(--text-main); font-size:0.95rem;">
                  Venue Name <span style="color:var(--primary);">*</span>
                </label>
                <input 
                  type="text" 
                  class="form-control" 
                  formControlName="name" 
                  placeholder="e.g. Main Auditorium / Seminar Hall A" 
                  style="font-size:1rem; padding:0.75rem 1rem; border:1.5px solid var(--border-light);"
                  [class.is-invalid]="venueForm.get('name')?.touched && venueForm.get('name')?.invalid"
                />
                <div class="form-error" *ngIf="venueForm.get('name')?.touched && venueForm.get('name')?.invalid">
                  Venue Name is required
                </div>
              </div>

              <div class="two-col">
                <div class="form-group">
                  <label class="form-label">Building / Hall</label>
                  <input type="text" class="form-control" formControlName="building" placeholder="e.g. Block A" />
                </div>
                <div class="form-group">
                  <label class="form-label">Room / Floor</label>
                  <input type="text" class="form-control" formControlName="roomNumber" placeholder="e.g. Ground Floor" />
                </div>
              </div>

              <div class="two-col">
                <div class="form-group">
                  <label class="form-label">City *</label>
                  <input type="text" class="form-control" formControlName="city" placeholder="e.g. Kopargaon" />
                </div>
                <div class="form-group">
                  <label class="form-label">Capacity (Seats) *</label>
                  <input type="number" class="form-control" formControlName="capacity" min="1" placeholder="100" />
                </div>
              </div>

              <!-- GeoJSON Coordinates -->
              <div class="geo-section">
                <label class="form-label" style="font-weight:600;">
                  <i class="fa-solid fa-location-crosshairs" style="color:var(--primary);"></i>
                  GeoJSON Coordinates (for 2dsphere Spatial Index)
                </label>
                <div class="two-col">
                  <div class="form-group">
                    <label class="form-label" style="font-size:0.8rem;color:var(--text-muted);">Longitude</label>
                    <input type="number" class="form-control" formControlName="longitude" step="any" placeholder="e.g. 74.4750" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size:0.8rem;color:var(--text-muted);">Latitude</label>
                    <input type="number" class="form-control" formControlName="latitude" step="any" placeholder="e.g. 19.8820" />
                  </div>
                </div>
                <p class="geo-hint">These coordinates enable <code>$near</code> and <code>$geoWithin</code> queries on MongoDB's 2dsphere index.</p>
              </div>

              <div class="form-group" style="margin-bottom:0.5rem;">
                <label class="form-label">Amenities (comma separated)</label>
                <input type="text" class="form-control" formControlName="amenitiesInput" placeholder="e.g. Projector, AC, Sound System, Wi-Fi" />
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeForm()">Cancel</button>
            <button class="btn btn-primary" [disabled]="venueForm.invalid || isSaving" (click)="saveVenue()">
              <span *ngIf="isSaving"><i class="fa-solid fa-spinner fa-spin"></i> Saving...</span>
              <span *ngIf="!isSaving"><i class="fa-solid fa-floppy-disk"></i> Save Venue</span>
            </button>
          </div>
        </div>
      </div>
    </div>

  `,
  styles: [`
    .page-header-row { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem; }
    .page-header-row h2 { margin:0; }
    .loading-state { text-align:center;padding:3rem;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:0.75rem; }
    .venues-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem; }
    @media (max-width:1000px) { .venues-grid { grid-template-columns:repeat(2,1fr); } }
    @media (max-width:600px) { .venues-grid { grid-template-columns:1fr; } }
    .venue-card { padding:1.25rem; }
    .venue-header { display:flex;gap:0.85rem;align-items:flex-start;margin-bottom:0.85rem; }
    .venue-icon { width:44px;height:44px;border-radius:10px;background:var(--primary-tint);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0; }
    .venue-header-info { display:flex;flex-direction:column; }
    .venue-name { margin:0;font-size:0.95rem; }
    .venue-address { font-size:0.75rem;color:var(--text-muted); }
    .venue-stats { display:flex;flex-direction:column;gap:0.3rem;margin-bottom:0.75rem; }
    .venue-stat { font-size:0.8rem;color:var(--text-muted);display:flex;align-items:center;gap:0.4rem; }
    .venue-stat.geo { font-family:monospace;font-size:0.75rem;color:var(--primary); }
    .venue-amenities { display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.75rem; }
    .amenity-tag { font-size:0.65rem; }
    .venue-actions { display:flex;gap:0.5rem; }
    .two-col { display:grid;grid-template-columns:1fr 1fr;gap:1rem; }
    .geo-section { background:#FAFAFA;border:1px dashed var(--border-light);border-radius:var(--radius-sm);padding:1rem;margin-bottom:1rem; }
    .geo-hint { font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem; }
    code { background:#F3F4F6;padding:0.1rem 0.35rem;border-radius:4px;font-size:0.8em; }
    .btn-close { background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted); }
  `]
})
export class AdminVenuesComponent implements OnInit {
  private venueService = inject(VenueService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  venues = signal<Venue[]>([]);
  isLoading = true;
  showForm = false;
  editingVenue: Venue | null = null;
  isSaving = false;

  venueForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    building: [''],
    roomNumber: [''],
    city: ['', Validators.required],
    capacity: [100, [Validators.required, Validators.min(1)]],
    longitude: [77.2090, Validators.required],
    latitude: [28.6139, Validators.required],
    amenitiesInput: ['']
  });

  ngOnInit(): void {
    this.venueService.getVenues().subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) this.venues.set(res.data);
      },
      error: () => { this.isLoading = false; }
    });
  }

  openForm(): void {
    this.editingVenue = null;
    this.venueForm.reset({ longitude: 77.2090, latitude: 28.6139, capacity: 100 });
    this.showForm = true;
  }

  editVenue(venue: Venue): void {
    this.editingVenue = venue;
    this.venueForm.patchValue({
      name: venue.name,
      building: venue.address?.building || '',
      roomNumber: venue.address?.roomNumber || '',
      city: venue.address?.city || '',
      capacity: venue.capacity,
      longitude: venue.location?.coordinates?.[0] || 77.2090,
      latitude: venue.location?.coordinates?.[1] || 28.6139,
      amenitiesInput: (venue.amenities || []).join(', ')
    });
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingVenue = null;
  }

  saveVenue(): void {
    if (this.venueForm.invalid) return;
    const val = this.venueForm.value;
    this.isSaving = true;

    const payload = {
      name: val.name,
      capacity: val.capacity,
      address: { building: val.building, roomNumber: val.roomNumber, city: val.city },
      location: { type: 'Point', coordinates: [val.longitude, val.latitude] },
      amenities: val.amenitiesInput ? val.amenitiesInput.split(',').map((a: string) => a.trim()).filter(Boolean) : []
    };

    const req$ = this.editingVenue
      ? this.venueService.updateVenue(this.editingVenue._id, payload)
      : this.venueService.createVenue(payload);

    req$.subscribe({
      next: res => {
        this.isSaving = false;
        if (res.success && res.data) {
          if (this.editingVenue) {
            this.venues.update(list => list.map(v => v._id === this.editingVenue!._id ? res.data! : v));
          } else {
            this.venues.update(list => [res.data!, ...list]);
          }
          this.toastService.success('Venue saved!');
          this.closeForm();
        }
      },
      error: err => {
        this.isSaving = false;
        this.toastService.error(err.error?.message || 'Failed to save venue.');
      }
    });
  }

  deleteVenue(id: string): void {
    if (!confirm('Delete this venue?')) return;
    this.venueService.deleteVenue(id).subscribe({
      next: () => {
        this.venues.update(list => list.filter(v => v._id !== id));
        this.toastService.success('Venue deleted.');
      },
      error: err => this.toastService.error(err.error?.message || 'Delete failed.')
    });
  }
}

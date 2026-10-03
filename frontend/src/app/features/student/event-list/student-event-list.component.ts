import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService } from '../../../core/services/toast.service';
import { Event, EventCategory } from '../../../core/models';

@Component({
  selector: 'app-student-event-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h2 class="font-heading">Explore Campus Events</h2>
          <p>Discover and register for upcoming events at your institution.</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="card filters-card">
        <div class="filters-row">
          <div class="search-input-wrap">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              class="form-control search-input"
              placeholder="Search events by title, tag, description..."
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
            />
          </div>
          <select class="form-select filter-select" [(ngModel)]="selectedCategory" (change)="applyFilters()">
            <option value="">All Categories</option>
            <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
          </select>
          <select class="form-select filter-select" [(ngModel)]="sortBy" (change)="applyFilters()">
            <option value="-startDate">Upcoming First</option>
            <option value="startDate">Latest Added</option>
            <option value="-avgRating">Top Rated</option>
            <option value="registeredCount">Most Popular</option>
          </select>
          <button class="btn btn-outline btn-sm" (click)="clearFilters()">
            <i class="fa-solid fa-xmark"></i> Clear
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state">
        <i class="fa-solid fa-spinner fa-spin fa-3x" style="color:var(--primary);"></i>
        <p>Loading events from MongoDB Atlas...</p>
      </div>

      <!-- Events Grid -->
      <div *ngIf="!isLoading" class="events-grid">
        <div *ngFor="let event of events()" class="event-card card card-hover">
          <div class="event-poster-wrap">
            <img *ngIf="event.posterUrl" [src]="event.posterUrl" [alt]="event.title" class="event-poster" />
            <div *ngIf="!event.posterUrl" class="event-poster-placeholder">
              <i class="fa-solid fa-shapes fa-2x" style="color:var(--primary); opacity:0.4;"></i>
            </div>
            <span class="event-category-badge badge badge-primary">{{ event.category }}</span>
            <div class="event-capacity-bar" [style.width.%]="getCapacityPercent(event)"></div>
          </div>

          <div class="event-card-body">
            <h4 class="event-card-title">{{ event.title }}</h4>
            <p class="event-card-desc">{{ event.description | slice:0:90 }}...</p>

            <div class="event-card-meta">
              <span><i class="fa-regular fa-calendar"></i> {{ event.startDate | date:'EEE, MMM d' }}</span>
              <span><i class="fa-regular fa-clock"></i> {{ event.startDate | date:'h:mm a' }}</span>
            </div>

            <div class="event-card-footer">
              <div class="capacity-info">
                <span class="capacity-text" [ngClass]="isFull(event) ? 'text-danger' : ''">
                  <i class="fa-solid fa-chair"></i>
                  {{ isFull(event) ? 'Full — Waitlist Available' : (event.capacity - event.registeredCount) + ' seats left' }}
                </span>
              </div>

              <div class="card-actions">
                <a [routerLink]="['/student/events', event._id]" class="btn btn-sm btn-primary">
                  View Details
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && events().length === 0" class="empty-page-state">
        <i class="fa-solid fa-calendar-xmark fa-3x" style="color:var(--text-light);"></i>
        <h3>No Events Found</h3>
        <p>Try adjusting your search filters or check back later for new events.</p>
      </div>

      <!-- Pagination -->
      <div *ngIf="!isLoading && totalPages > 1" class="pagination-row">
        <button class="btn btn-sm btn-secondary" [disabled]="currentPage === 1" (click)="changePage(currentPage - 1)">
          <i class="fa-solid fa-chevron-left"></i> Prev
        </button>
        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button class="btn btn-sm btn-secondary" [disabled]="currentPage === totalPages" (click)="changePage(currentPage + 1)">
          Next <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .page-header h2 { margin: 0; }
    .filters-card { padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
    .filters-row {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .search-input-wrap { position: relative; flex: 2; min-width: 200px; }
    .search-icon { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
    .search-input { padding-left: 2.5rem; }
    .filter-select { flex: 1; min-width: 160px; }
    .events-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }
    @media (max-width: 1100px) { .events-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 700px) { .events-grid { grid-template-columns: 1fr; } }
    .event-card { padding: 0; overflow: hidden; }
    .event-poster-wrap {
      position: relative;
      height: 185px;
      overflow: hidden;
      background: #F9F6F0;
    }
    .event-poster { width: 100%; height: 100%; object-fit: cover; }
    .event-poster-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #FFF7F0 0%, #FFE4D0 100%);
    }
    .event-category-badge {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
    }
    .event-capacity-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: var(--primary);
      transition: width 0.5s ease;
    }
    .event-card-body { padding: 1rem 1.25rem; }
    .event-card-title { font-size: 1rem; margin-bottom: 0.4rem; }
    .event-card-desc { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem; line-height: 1.5; }
    .event-card-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }
    .event-card-meta span { display: flex; align-items: center; gap: 0.35rem; }
    .event-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
    }
    .capacity-text { font-size: 0.8rem; font-weight: 600; }
    .text-danger { color: var(--danger) !important; }
    .loading-state, .empty-page-state {
      text-align: center;
      padding: 4rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: var(--text-muted);
    }
    .pagination-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
    }
    .page-info { font-size: 0.875rem; color: var(--text-muted); }
  `]
})
export class StudentEventListComponent implements OnInit {
  private eventService = inject(EventService);
  private toastService = inject(ToastService);

  events = signal<Event[]>([]);
  isLoading = true;
  searchQuery = '';
  selectedCategory = '';
  sortBy = '-startDate';
  currentPage = 1;
  totalPages = 1;

  categories: EventCategory[] = ['Academic', 'Cultural', 'Sports', 'Social', 'Workshop', 'Seminar'];

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.eventService.getEvents({
      page: this.currentPage,
      limit: 12,
      q: this.searchQuery || undefined,
      category: this.selectedCategory || undefined,
      sort: this.sortBy,
      status: 'published'
    }).subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.events.set(res.data);
          this.totalPages = res.pagination?.totalPages || 1;
        }
      },
      error: () => { this.isLoading = false; }
    });
  }

  onSearch(): void {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadEvents();
    }, 350);
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadEvents();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.sortBy = '-startDate';
    this.currentPage = 1;
    this.loadEvents();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadEvents();
  }

  isFull(event: Event): boolean {
    return event.registeredCount >= event.capacity;
  }

  getCapacityPercent(event: Event): number {
    return Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));
  }

  private _searchTimer: any;
}

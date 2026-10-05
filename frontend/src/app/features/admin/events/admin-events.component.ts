import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { VenueService } from '../../../core/services/venue.service';
import { ToastService } from '../../../core/services/toast.service';
import { Event, Venue } from '../../../core/models';

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="fade-in">
      <!-- Page Header -->
      <div class="page-header-row">
        <div>
          <h2 class="font-heading">All Campus Events</h2>
          <p>Complete directory of all upcoming, live, completed, pending, and archived events across campus.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/admin/event-approvals" class="btn btn-warning btn-sm" *ngIf="pendingCount() > 0">
            <i class="fa-solid fa-bell"></i> {{ pendingCount() }} Pending Approval
          </a>
          <button class="btn btn-outline btn-sm" (click)="loadEvents()">
            <i class="fa-solid fa-rotate-right" [class.fa-spin]="isLoading"></i> Refresh
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card card">
          <div class="kpi-icon icon-primary"><i class="fa-solid fa-calendar-days"></i></div>
          <div class="kpi-body">
            <span class="kpi-num">{{ totalEventsCount() }}</span>
            <span class="kpi-lbl">Total Events</span>
          </div>
        </div>
        <div class="kpi-card card">
          <div class="kpi-icon icon-success"><i class="fa-solid fa-circle-play"></i></div>
          <div class="kpi-body">
            <span class="kpi-num">{{ upcomingCount() }}</span>
            <span class="kpi-lbl">Upcoming & Active</span>
          </div>
        </div>
        <div class="kpi-card card">
          <div class="kpi-icon icon-info"><i class="fa-solid fa-flag-checkered"></i></div>
          <div class="kpi-body">
            <span class="kpi-num">{{ completedCount() }}</span>
            <span class="kpi-lbl">Completed Events</span>
          </div>
        </div>
        <div class="kpi-card card">
          <div class="kpi-icon icon-warning"><i class="fa-solid fa-ticket"></i></div>
          <div class="kpi-body">
            <span class="kpi-num">{{ totalRegistrationsCount() }}</span>
            <span class="kpi-lbl">Total Registrations</span>
          </div>
        </div>
      </div>

      <!-- Main Directory Card -->
      <div class="card event-directory-card">
        <!-- Status Tabs -->
        <div class="status-tabs-row">
          <button
            *ngFor="let tab of statusTabs"
            type="button"
            class="status-tab"
            [class.active]="selectedTab === tab.id"
            (click)="setTab(tab.id)">
            {{ tab.label }}
            <span class="tab-badge" *ngIf="getTabCount(tab.id) > 0">{{ getTabCount(tab.id) }}</span>
          </button>
        </div>

        <!-- Filter Controls Bar -->
        <div class="filters-bar">
          <div class="search-input-wrap">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              class="form-control search-input"
              placeholder="Search by title, organizer, club, category..."
              [(ngModel)]="searchQuery"
            />
            <button class="btn-clear-search" *ngIf="searchQuery" (click)="searchQuery = ''">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="select-filters">
            <select class="form-control" [(ngModel)]="selectedCategory">
              <option value="">All Categories</option>
              <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
            </select>

            <select class="form-control" [(ngModel)]="timeframeFilter">
              <option value="all">All Dates</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past / Completed</option>
            </select>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-state">
          <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i>
          <p>Loading campus events...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading && filteredEvents().length === 0" class="empty-state">
          <i class="fa-solid fa-calendar-xmark fa-3x" style="color:var(--text-light);"></i>
          <h3>No events found</h3>
          <p>Try adjusting your search query, status tab, or category filters.</p>
        </div>

        <!-- Events Table -->
        <div *ngIf="!isLoading && filteredEvents().length > 0" class="table-responsive">
          <table class="table events-table">
            <thead>
              <tr>
                <th>Event & Category</th>
                <th>Organizer / Club</th>
                <th>Venue</th>
                <th>Schedule</th>
                <th>Attendance</th>
                <th>Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let event of filteredEvents()" [class.row-archived]="event.status === 'archived'">
                <!-- Event info -->
                <td>
                  <div class="event-info-cell">
                    <div class="event-thumb">
                      <img *ngIf="event.posterUrl" [src]="event.posterUrl" [alt]="event.title" />
                      <div *ngIf="!event.posterUrl" class="thumb-ph">
                        <i class="fa-solid fa-shapes"></i>
                      </div>
                    </div>
                    <div class="event-title-group">
                      <a href="javascript:void(0)" class="event-title-link" (click)="openDetailModal(event)">
                        {{ event.title }}
                      </a>
                      <div class="badge-row">
                        <span class="badge badge-primary">{{ event.category }}</span>
                        <span class="badge badge-neutral" *ngIf="isPast(event.endDate)">Past</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Organizer -->
                <td>
                  <div class="organizer-cell">
                    <span class="org-name">{{ getOrganizerName(event) }}</span>
                    <span class="org-email">{{ getOrganizerEmail(event) }}</span>
                  </div>
                </td>

                <!-- Venue -->
                <td>
                  <div class="venue-cell">
                    <span class="venue-name"><i class="fa-solid fa-location-dot"></i> {{ getVenueName(event) }}</span>
                    <span class="venue-cap">Cap: {{ event.capacity }}</span>
                  </div>
                </td>

                <!-- Schedule -->
                <td>
                  <div class="date-cell">
                    <span class="date-main">{{ event.startDate | date:'mediumDate' }}</span>
                    <span class="date-sub">{{ event.startDate | date:'shortTime' }} &ndash; {{ event.endDate | date:'shortTime' }}</span>
                  </div>
                </td>

                <!-- Capacity & Registrations -->
                <td>
                  <div class="capacity-bar-cell">
                    <div class="cap-numbers">
                      <strong>{{ event.registeredCount || 0 }}</strong> / {{ event.capacity }}
                      <span class="pct">({{ getFillPercentage(event) }}%)</span>
                    </div>
                    <div class="progress-bar-wrap">
                      <div
                        class="progress-fill"
                        [style.width.%]="getFillPercentage(event)"
                        [ngClass]="getFillColorClass(event)">
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Status -->
                <td>
                  <span class="badge" [ngClass]="getStatusBadge(event.status)">
                    {{ event.status | uppercase }}
                  </span>
                </td>

                <!-- Actions -->
                <td style="text-align:right;">
                  <div class="action-buttons-group">
                    <button
                      type="button"
                      class="btn-icon"
                      title="View Full Details"
                      (click)="openDetailModal(event)">
                      <i class="fa-solid fa-circle-info"></i>
                    </button>

                    <button
                      type="button"
                      class="btn-icon"
                      title="Manage Status"
                      (click)="openStatusModal(event)">
                      <i class="fa-solid fa-sliders"></i>
                    </button>

                    <button
                      type="button"
                      class="btn-icon btn-icon-danger"
                      title="Delete Event"
                      (click)="deleteEvent(event)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- EVENT DETAIL MODAL -->
      <div class="modal-backdrop" *ngIf="selectedDetailEvent" (click)="selectedDetailEvent = null">
        <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-header-info">
              <span class="badge badge-primary">{{ selectedDetailEvent.category }}</span>
              <h3>{{ selectedDetailEvent.title }}</h3>
            </div>
            <button class="btn-close" (click)="selectedDetailEvent = null">&times;</button>
          </div>

          <div class="modal-body modal-scroll">
            <div class="detail-grid">
              <!-- Left Col: Poster & Key Info -->
              <div class="detail-col">
                <div class="modal-poster" *ngIf="selectedDetailEvent.posterUrl">
                  <img [src]="selectedDetailEvent.posterUrl" [alt]="selectedDetailEvent.title" />
                </div>
                
                <div class="info-box">
                  <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="badge" [ngClass]="getStatusBadge(selectedDetailEvent.status)">
                      {{ selectedDetailEvent.status | uppercase }}
                    </span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Organizer:</span>
                    <span><strong>{{ getOrganizerName(selectedDetailEvent) }}</strong> ({{ getOrganizerEmail(selectedDetailEvent) }})</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Venue:</span>
                    <span>{{ getVenueName(selectedDetailEvent) }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Starts:</span>
                    <span>{{ selectedDetailEvent.startDate | date:'fullDate' }} at {{ selectedDetailEvent.startDate | date:'shortTime' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Ends:</span>
                    <span>{{ selectedDetailEvent.endDate | date:'fullDate' }} at {{ selectedDetailEvent.endDate | date:'shortTime' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Attendance:</span>
                    <span><strong>{{ selectedDetailEvent.registeredCount }}</strong> registered out of {{ selectedDetailEvent.capacity }} capacity</span>
                  </div>
                  <div class="info-row" *ngIf="selectedDetailEvent.budget?.total">
                    <span class="info-label">Budget:</span>
                    <span>₹{{ selectedDetailEvent.budget?.total | number }}</span>
                  </div>
                  <div class="info-row" *ngIf="selectedDetailEvent.adminNote">
                    <span class="info-label">Admin Note:</span>
                    <span class="note-text">{{ selectedDetailEvent.adminNote }}</span>
                  </div>
                </div>
              </div>

              <!-- Right Col: Description & Tags -->
              <div class="detail-col">
                <h4 style="margin-top:0;">Event Description</h4>
                <div class="description-box">
                  {{ selectedDetailEvent.description }}
                </div>

                <div class="tags-section" *ngIf="selectedDetailEvent.tags?.length">
                  <h4>Tags</h4>
                  <div class="tags-row">
                    <span *ngFor="let t of selectedDetailEvent.tags" class="badge badge-neutral">
                      #{{ t }}
                    </span>
                  </div>
                </div>

                <div class="budget-section" *ngIf="selectedDetailEvent.budget?.breakdown?.length">
                  <h4>Budget Breakdown</h4>
                  <table class="table mini-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style="text-align:right;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let b of selectedDetailEvent.budget?.breakdown">
                        <td>{{ b.item }}</td>
                        <td style="text-align:right;">₹{{ b.amount | number }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="selectedDetailEvent = null">Close</button>
            <button class="btn btn-primary" (click)="openStatusModal(selectedDetailEvent); selectedDetailEvent = null">
              <i class="fa-solid fa-sliders"></i> Change Status
            </button>
          </div>
        </div>
      </div>

      <!-- CHANGE STATUS MODAL -->
      <div class="modal-backdrop" *ngIf="statusModalEvent" (click)="statusModalEvent = null">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Update Status &bull; {{ statusModalEvent.title }}</h3>
            <button class="btn-close" (click)="statusModalEvent = null">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Event Status</label>
              <select class="form-control" [(ngModel)]="newStatusValue">
                <option value="published">Published (Live to Students)</option>
                <option value="completed">Completed (Event Finished)</option>
                <option value="pending">Pending (Needs Review)</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived (Hidden)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Admin Note / Reason (Optional)</label>
              <textarea
                class="form-control"
                rows="3"
                [(ngModel)]="newStatusNote"
                placeholder="Reason or notes for status change...">
              </textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="statusModalEvent = null">Cancel</button>
            <button class="btn btn-primary" [disabled]="isUpdatingStatus" (click)="confirmStatusChange()">
              <span *ngIf="isUpdatingStatus"><i class="fa-solid fa-spinner fa-spin"></i> Saving...</span>
              <span *ngIf="!isUpdatingStatus"><i class="fa-solid fa-check"></i> Save Status</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .page-header-row h2 { margin: 0 0 0.25rem 0; }
    .page-header-row p { margin: 0; color: var(--text-muted); }
    .header-actions { display: flex; gap: 0.75rem; align-items: center; }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .kpi-card {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.25rem;
    }
    .kpi-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }
    .icon-primary { background: #FFF1EA; color: var(--primary, #E05A1A); }
    .icon-success { background: #DCFCE7; color: #16A34A; }
    .icon-info { background: #E0F2FE; color: #0284C7; }
    .icon-warning { background: #FEF3C7; color: #D97706; }
    .kpi-body { display: flex; flex-direction: column; }
    .kpi-num { font-size: 1.6rem; font-weight: 800; line-height: 1.1; color: var(--text-main); }
    .kpi-lbl { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 0.2rem; }

    /* Directory Card & Tabs */
    .event-directory-card { padding: 1.5rem; }
    .status-tabs-row {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border-light);
      padding-bottom: 0.85rem;
      margin-bottom: 1.25rem;
      overflow-x: auto;
    }
    .status-tab {
      background: none;
      border: none;
      padding: 0.5rem 0.85rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .status-tab:hover { background: #F3F4F6; color: var(--text-main); }
    .status-tab.active {
      background: var(--primary, #E05A1A);
      color: #FFFFFF;
    }
    .tab-badge {
      background: rgba(0,0,0,0.1);
      padding: 0.1rem 0.4rem;
      border-radius: 9999px;
      font-size: 0.75rem;
    }
    .status-tab.active .tab-badge {
      background: rgba(255,255,255,0.25);
      color: #FFFFFF;
    }

    /* Filters Bar */
    .filters-bar {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .search-input-wrap {
      position: relative;
      flex: 1;
      min-width: 260px;
    }
    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #9CA3AF;
    }
    .search-input {
      padding-left: 2.5rem;
      padding-right: 2rem;
    }
    .btn-clear-search {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #9CA3AF;
      cursor: pointer;
    }
    .select-filters {
      display: flex;
      gap: 0.75rem;
    }

    /* Table & Rows */
    .events-table { width: 100%; border-collapse: collapse; }
    .events-table th {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      padding: 0.75rem 1rem;
      border-bottom: 1.5px solid var(--border-light);
    }
    .events-table td {
      padding: 1rem;
      vertical-align: middle;
      border-bottom: 1px solid var(--border-light);
      font-size: 0.9rem;
    }
    .row-archived { opacity: 0.55; }

    .event-info-cell {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .event-thumb {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      background: #F3F4F6;
    }
    .event-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .thumb-ph {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary, #E05A1A);
      background: #FFF1EA;
    }
    .event-title-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .event-title-link {
      font-weight: 700;
      color: var(--text-main);
      text-decoration: none;
      font-size: 0.95rem;
    }
    .event-title-link:hover { color: var(--primary, #E05A1A); text-decoration: underline; }
    .badge-row { display: flex; gap: 0.35rem; align-items: center; }

    .organizer-cell { display: flex; flex-direction: column; gap: 0.15rem; }
    .org-name { font-weight: 600; color: #1F2937; }
    .org-email { font-size: 0.75rem; color: var(--text-muted); }

    .venue-cell { display: flex; flex-direction: column; gap: 0.15rem; }
    .venue-name { font-weight: 600; font-size: 0.88rem; }
    .venue-cap { font-size: 0.75rem; color: var(--text-muted); }

    .date-cell { display: flex; flex-direction: column; gap: 0.15rem; }
    .date-main { font-weight: 600; color: #1F2937; }
    .date-sub { font-size: 0.75rem; color: var(--text-muted); }

    .capacity-bar-cell { display: flex; flex-direction: column; gap: 0.35rem; min-width: 110px; }
    .cap-numbers { font-size: 0.82rem; }
    .pct { font-size: 0.75rem; color: var(--text-muted); }
    .progress-bar-wrap { height: 5px; background: #E5E7EB; border-radius: 3px; overflow: hidden; width: 100%; }
    .progress-fill { height: 100%; }
    .fill-low { background: #3B82F6; }
    .fill-mid { background: #10B981; }
    .fill-high { background: #F59E0B; }
    .fill-full { background: #EF4444; }

    .action-buttons-group {
      display: inline-flex;
      gap: 0.4rem;
      align-items: center;
    }
    .btn-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid #E5E7EB;
      background: #FFFFFF;
      color: #4B5563;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-icon:hover {
      background: var(--primary-tint, #FFF1EA);
      border-color: var(--primary, #E05A1A);
      color: var(--primary, #E05A1A);
    }
    .btn-icon-danger:hover {
      background: #FEE2E2;
      border-color: #EF4444;
      color: #DC2626;
    }

    /* Loading & Empty States */
    .loading-state, .empty-state {
      text-align: center;
      padding: 3.5rem 1rem;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    /* Modal Layout */
    .modal-lg { max-width: 800px; width: 95%; }
    .modal-header-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .modal-header-info h3 { margin: 0; }
    .modal-scroll { max-height: 70vh; overflow-y: auto; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media (max-width: 700px) {
      .detail-grid { grid-template-columns: 1fr; }
    }
    .modal-poster img {
      width: 100%;
      height: 180px;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .info-box {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      background: #FAFAFA;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #F3F4F6;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.88rem;
      gap: 0.5rem;
    }
    .info-label { color: var(--text-muted); font-weight: 600; }
    .description-box {
      font-size: 0.9rem;
      line-height: 1.6;
      color: #374151;
      white-space: pre-wrap;
      background: #FAFAFA;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #F3F4F6;
      max-height: 180px;
      overflow-y: auto;
    }
    .tags-section, .budget-section { margin-top: 1rem; }
    .tags-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .mini-table { width: 100%; font-size: 0.85rem; }
    .note-text { color: #9A3412; font-style: italic; }
  `]
})
export class AdminEventsComponent implements OnInit {
  private eventService = inject(EventService);
  private venueService = inject(VenueService);
  private toastService = inject(ToastService);

  events = signal<Event[]>([]);
  venues = signal<Venue[]>([]);
  isLoading = true;

  selectedTab = 'all';
  searchQuery = '';
  selectedCategory = '';
  timeframeFilter = 'all';

  selectedDetailEvent: Event | null = null;
  statusModalEvent: Event | null = null;
  newStatusValue = 'published';
  newStatusNote = '';
  isUpdatingStatus = false;

  statusTabs = [
    { id: 'all', label: 'All Events' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'published', label: 'Published' },
    { id: 'completed', label: 'Completed' },
    { id: 'pending', label: 'Pending Review' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'archived', label: 'Archived' }
  ];

  categories = ['Academic', 'Cultural', 'Sports', 'Social', 'Workshop', 'Seminar'];

  // KPI Computations
  totalEventsCount = computed(() => this.events().filter(e => e.status !== 'archived').length);
  upcomingCount = computed(() => this.events().filter(e => e.status === 'published' && new Date(e.startDate) > new Date()).length);
  completedCount = computed(() => this.events().filter(e => e.status === 'completed' || (e.status === 'published' && new Date(e.endDate) < new Date())).length);
  pendingCount = computed(() => this.events().filter(e => e.status === 'pending').length);
  totalRegistrationsCount = computed(() => this.events().reduce((sum, e) => sum + (e.registeredCount || 0), 0));

  filteredEvents = computed(() => {
    let list = this.events();

    // Tab Filter
    if (this.selectedTab === 'upcoming') {
      list = list.filter(e => e.status === 'published' && new Date(e.startDate) > new Date());
    } else if (this.selectedTab === 'completed') {
      list = list.filter(e => e.status === 'completed' || (e.status === 'published' && new Date(e.endDate) < new Date()));
    } else if (this.selectedTab !== 'all') {
      list = list.filter(e => e.status === this.selectedTab);
    }

    // Category Filter
    if (this.selectedCategory) {
      list = list.filter(e => e.category === this.selectedCategory);
    }

    // Timeframe Filter
    if (this.timeframeFilter === 'upcoming') {
      list = list.filter(e => new Date(e.startDate) > new Date());
    } else if (this.timeframeFilter === 'past') {
      list = list.filter(e => new Date(e.endDate) < new Date());
    }

    // Search Query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        this.getOrganizerName(e).toLowerCase().includes(q) ||
        this.getVenueName(e).toLowerCase().includes(q)
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.loadEvents();
    this.loadVenues();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.eventService.getEvents({ limit: 100 }).subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.events.set(res.data);
        }
      },
      error: () => {
        this.isLoading = false;
        this.toastService.error('Failed to load events.');
      }
    });
  }

  loadVenues(): void {
    this.venueService.getVenues().subscribe({
      next: res => {
        if (res.success && res.data) this.venues.set(res.data);
      }
    });
  }

  setTab(tabId: string): void {
    this.selectedTab = tabId;
  }

  getTabCount(tabId: string): number {
    if (tabId === 'all') return this.events().length;
    if (tabId === 'upcoming') return this.upcomingCount();
    if (tabId === 'completed') return this.completedCount();
    return this.events().filter(e => e.status === tabId).length;
  }

  isPast(date: string | Date): boolean {
    return new Date(date) < new Date();
  }

  getFillPercentage(event: Event): number {
    if (!event.capacity || event.capacity === 0) return 0;
    const count = event.registeredCount || 0;
    return Math.min(100, Math.round((count / event.capacity) * 100));
  }

  getFillColorClass(event: Event): string {
    const pct = this.getFillPercentage(event);
    if (pct >= 100) return 'fill-full';
    if (pct >= 75) return 'fill-high';
    if (pct >= 40) return 'fill-mid';
    return 'fill-low';
  }

  getOrganizerName(event: Event): string {
    const o = event.organizer;
    if (typeof o === 'object' && o) {
      return (o as any).organizerProfile?.orgName || o.name || 'Unknown';
    }
    return 'Unknown';
  }

  getOrganizerEmail(event: Event): string {
    const o = event.organizer;
    if (typeof o === 'object' && o) return o.email || '';
    return '';
  }

  getVenueName(event: Event): string {
    const v = event.venue;
    if (typeof v === 'object' && v) return v.name || 'Campus Venue';
    return 'Campus Venue';
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      published: 'badge-success',
      completed: 'badge-info',
      pending: 'badge-warning',
      rejected: 'badge-danger',
      cancelled: 'badge-danger',
      draft: 'badge-neutral',
      archived: 'badge-neutral'
    };
    return map[status] || 'badge-neutral';
  }

  openDetailModal(event: Event): void {
    this.selectedDetailEvent = event;
  }

  openStatusModal(event: Event): void {
    this.statusModalEvent = event;
    this.newStatusValue = event.status || 'published';
    this.newStatusNote = event.adminNote || '';
  }

  confirmStatusChange(): void {
    if (!this.statusModalEvent) return;
    this.isUpdatingStatus = true;

    this.eventService.updateEventStatus(
      this.statusModalEvent._id,
      this.newStatusValue,
      this.newStatusNote
    ).subscribe({
      next: res => {
        this.isUpdatingStatus = false;
        if (res.success && res.data) {
          const updated = res.data;
          this.events.update(list => list.map(e => e._id === updated._id ? { ...e, ...updated } : e));
          this.toastService.success(`Status updated to ${this.newStatusValue}.`);
        }
        this.statusModalEvent = null;
      },
      error: err => {
        this.isUpdatingStatus = false;
        this.toastService.error(err.error?.message || 'Failed to update event status.');
      }
    });
  }

  deleteEvent(event: Event): void {
    if (!confirm(`Are you sure you want to delete/archive "${event.title}"?`)) return;

    this.eventService.deleteEvent(event._id).subscribe({
      next: () => {
        this.events.update(list => list.filter(e => e._id !== event._id));
        this.toastService.success(`Event "${event.title}" deleted.`);
      },
      error: err => {
        this.toastService.error(err.error?.message || 'Failed to delete event.');
      }
    });
  }
}

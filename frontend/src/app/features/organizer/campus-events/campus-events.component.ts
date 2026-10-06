import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Event } from '../../../core/models';

@Component({
  selector: 'app-campus-events',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="fade-in">
      <!-- Page Header -->
      <div class="page-header-row">
        <div>
          <div class="header-tag">
            <i class="fa-solid fa-calendar-week"></i> Inter-Club Coordination
          </div>
          <h2 class="font-heading">Campus Events Directory</h2>
          <p>Explore upcoming, live, and completed events organized across all campus clubs to prevent venue and date clashes.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/organizer/create-event" class="btn btn-primary btn-sm">
            <i class="fa-solid fa-plus"></i> Host New Event
          </a>
          <button class="btn btn-outline btn-sm" (click)="loadEvents()">
            <i class="fa-solid fa-rotate-right" [class.fa-spin]="isLoading"></i> Refresh
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards (Identical to Admin Metrics) -->
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
        <!-- Status Tabs Bar (Matching Admin Page Filter Tabs) -->
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
          <p>Loading all campus events directory...</p>
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
                <th style="text-align:right;">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let event of filteredEvents()" [class.highlight-mine]="isMyEvent(event)">
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
                      <div class="title-row">
                        <a href="javascript:void(0)" class="event-title-link" (click)="openDetailModal(event)">
                          {{ event.title }}
                        </a>
                        <span *ngIf="isMyEvent(event)" class="badge-mine">My Club</span>
                      </div>
                      <div class="badge-row">
                        <span class="badge badge-primary">{{ event.category }}</span>
                        <span *ngIf="isOngoing(event)" class="badge-live">
                          <span class="live-dot"></span> LIVE NOW
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Organizing Club -->
                <td>
                  <div class="organizer-cell">
                    <span class="org-name"><i class="fa-solid fa-users"></i> {{ getOrganizerName(event) }}</span>
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
                  <div class="schedule-cell">
                    <span class="sch-date">{{ event.startDate | date:'mediumDate' }}</span>
                    <span class="sch-time">{{ event.startDate | date:'shortTime' }} &ndash; {{ event.endDate | date:'shortTime' }}</span>
                  </div>
                </td>

                <!-- Attendance Progress Bar -->
                <td>
                  <div class="attendance-cell">
                    <div class="att-nums">
                      <strong>{{ event.registeredCount || 0 }}</strong> / {{ event.capacity }}
                      <span class="pct">({{ getFillPercentage(event) }}%)</span>
                    </div>
                    <div class="att-bar">
                      <div
                        class="att-bar-fill"
                        [style.width.%]="getFillPercentage(event)"
                        [ngClass]="getFillColorClass(event)">
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Status -->
                <td>
                  <span class="badge" [ngClass]="getStatusBadge(event.status)">
                    {{ (event.status || 'draft') | uppercase }}
                  </span>
                </td>

                <!-- Action (Read-Only Detail / Edit if own club) -->
                <td style="text-align:right;">
                  <button type="button" class="btn btn-sm btn-outline view-btn" (click)="openDetailModal(event)">
                    <i class="fa-solid fa-eye"></i> View Details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- READ-ONLY EVENT DETAIL MODAL -->
      <div class="modal-backdrop" *ngIf="selectedDetailEvent" (click)="selectedDetailEvent = null">
        <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-header-info">
              <div class="modal-eyebrow">
                <span class="badge badge-primary">{{ selectedDetailEvent.category }}</span>
                <span class="badge" [ngClass]="getStatusBadge(selectedDetailEvent.status)">
                  {{ selectedDetailEvent.status | uppercase }}
                </span>
                <span *ngIf="isOngoing(selectedDetailEvent)" class="badge-live">
                  <span class="live-dot"></span> LIVE NOW
                </span>
                <span *ngIf="isMyEvent(selectedDetailEvent)" class="badge-mine">Organized by Your Club</span>
              </div>
              <h3>{{ selectedDetailEvent.title }}</h3>
            </div>
            <button class="btn-close" (click)="selectedDetailEvent = null">&times;</button>
          </div>

          <div class="modal-body modal-scroll">
            <div class="detail-grid">
              <!-- Left Column: Poster & Quick Meta -->
              <div class="detail-col">
                <div class="modal-poster" *ngIf="selectedDetailEvent.posterUrl">
                  <img [src]="selectedDetailEvent.posterUrl" [alt]="selectedDetailEvent.title" />
                </div>
                <div class="info-box">
                  <div class="info-row">
                    <span class="info-label"><i class="fa-solid fa-users"></i> Organizing Club:</span>
                    <strong>{{ getOrganizerName(selectedDetailEvent) }}</strong>
                  </div>
                  <div class="info-row">
                    <span class="info-label"><i class="fa-regular fa-envelope"></i> Club Email:</span>
                    <span>{{ getOrganizerEmail(selectedDetailEvent) }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label"><i class="fa-solid fa-location-dot"></i> Venue:</span>
                    <strong>{{ getVenueName(selectedDetailEvent) }}</strong>
                  </div>
                  <div class="info-row">
                    <span class="info-label"><i class="fa-solid fa-chair"></i> Capacity:</span>
                    <span>{{ selectedDetailEvent.capacity }} seats</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label"><i class="fa-solid fa-ticket"></i> Registered:</span>
                    <span><strong>{{ selectedDetailEvent.registeredCount || 0 }}</strong> ({{ getFillPercentage(selectedDetailEvent) }}%)</span>
                  </div>
                  <div class="info-row" *ngIf="selectedDetailEvent.budget?.total">
                    <span class="info-label"><i class="fa-solid fa-wallet"></i> Budget:</span>
                    <span>₹{{ selectedDetailEvent.budget?.total | number }}</span>
                  </div>
                </div>
              </div>

              <!-- Right Column: Description & Schedule -->
              <div class="detail-col">
                <div class="info-box" style="margin-bottom:1rem;">
                  <div class="info-row">
                    <span class="info-label"><i class="fa-regular fa-calendar-check"></i> Starts:</span>
                    <strong>{{ selectedDetailEvent.startDate | date:'fullDate' }} at {{ selectedDetailEvent.startDate | date:'shortTime' }}</strong>
                  </div>
                  <div class="info-row">
                    <span class="info-label"><i class="fa-regular fa-calendar-xmark"></i> Ends:</span>
                    <strong>{{ selectedDetailEvent.endDate | date:'fullDate' }} at {{ selectedDetailEvent.endDate | date:'shortTime' }}</strong>
                  </div>
                  <div class="info-row" *ngIf="selectedDetailEvent.adminNote">
                    <span class="info-label"><i class="fa-solid fa-note-sticky"></i> Note:</span>
                    <span style="color:#9A3412;">{{ selectedDetailEvent.adminNote }}</span>
                  </div>
                </div>

                <div class="desc-heading" style="font-weight:700; margin-bottom:0.4rem; color:var(--text-main);">Event Overview</div>
                <div class="description-box">
                  {{ selectedDetailEvent.description || 'No description provided.' }}
                </div>

                <div class="tags-section" *ngIf="selectedDetailEvent.tags && selectedDetailEvent.tags.length > 0">
                  <div style="font-weight:700; margin-bottom:0.4rem; font-size:0.85rem; color:var(--text-muted);">Tags</div>
                  <div class="tags-row">
                    <span *ngFor="let tag of selectedDetailEvent.tags" class="badge badge-neutral">#{{ tag }}</span>
                  </div>
                </div>

                <div class="read-only-notice" *ngIf="!isMyEvent(selectedDetailEvent)">
                  <i class="fa-solid fa-shield-halved"></i>
                  <span>Read-only campus coordination view. Contact <strong>{{ getOrganizerName(selectedDetailEvent) }}</strong> for scheduling adjustments.</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="selectedDetailEvent = null">Close</button>
            <a
              *ngIf="isMyEvent(selectedDetailEvent)"
              [routerLink]="['/organizer/events', selectedDetailEvent._id, 'edit']"
              class="btn btn-primary"
              (click)="selectedDetailEvent = null">
              <i class="fa-solid fa-pen"></i> Edit My Event
            </a>
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
    .header-tag {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--primary, #E05A1A);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }
    .page-header-row h2 { margin: 0 0 0.25rem 0; }
    .page-header-row p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }
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
      background: #FFFFFF;
      border-radius: var(--radius-md, 12px);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      border: 1px solid var(--border-light, #E5E7EB);
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

    /* Event Directory Card */
    .event-directory-card {
      padding: 1.5rem;
      background: #FFFFFF;
      border-radius: var(--radius-md, 12px);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      border: 1px solid var(--border-light, #E5E7EB);
    }

    /* Status Tabs */
    .status-tabs-row {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border-light, #E5E7EB);
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
      border-radius: var(--radius-sm, 6px);
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

    /* Filter Controls Bar */
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
      border: 1px solid #E5E7EB;
      border-radius: 8px;
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
    .select-filters { display: flex; gap: 0.75rem; }

    /* Events Table */
    .events-table { width: 100%; border-collapse: collapse; }
    .events-table th {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      padding: 0.75rem 1rem;
      border-bottom: 1.5px solid var(--border-light, #E5E7EB);
    }
    .events-table td {
      padding: 1rem;
      vertical-align: middle;
      border-bottom: 1px solid var(--border-light, #E5E7EB);
      font-size: 0.9rem;
    }
    .highlight-mine { background: #FFFDF9; }

    .event-info-cell { display: flex; align-items: center; gap: 0.85rem; }
    .event-thumb {
      width: 44px;
      height: 44px;
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
    .title-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .event-title-link {
      font-weight: 700;
      color: var(--text-main);
      text-decoration: none;
    }
    .event-title-link:hover { color: var(--primary, #E05A1A); }
    .badge-mine {
      font-size: 0.7rem;
      font-weight: 700;
      background: #EFF6FF;
      color: #2563EB;
      border: 1px solid #BFDBFE;
      padding: 0.1rem 0.4rem;
      border-radius: 9999px;
    }
    .badge-row { display: flex; gap: 0.35rem; align-items: center; }
    .badge-live {
      font-size: 0.7rem;
      font-weight: 800;
      color: #DC2626;
      background: #FEE2E2;
      border: 1px solid #FECACA;
      padding: 0.1rem 0.45rem;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      animation: pulse-live 2s infinite ease-in-out;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #DC2626;
    }
    @keyframes pulse-live {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .organizer-cell, .venue-cell, .schedule-cell { display: flex; flex-direction: column; gap: 0.2rem; }
    .org-name, .venue-name { font-weight: 600; color: var(--text-main); }
    .org-email, .venue-cap, .sch-time { font-size: 0.8rem; color: var(--text-muted); }
    .sch-date { font-weight: 600; color: var(--text-main); }

    /* Attendance progress bar */
    .attendance-cell { min-width: 120px; }
    .att-nums {
      font-size: 0.82rem;
      margin-bottom: 0.25rem;
      display: flex;
      justify-content: space-between;
      color: var(--text-muted);
    }
    .att-nums strong { color: var(--text-main); }
    .att-bar {
      height: 6px;
      background: #E5E7EB;
      border-radius: 9999px;
      overflow: hidden;
    }
    .att-bar-fill { height: 100%; border-radius: 9999px; transition: width 0.3s ease; }
    .fill-low { background: #3B82F6; }
    .fill-mid { background: #10B981; }
    .fill-high { background: #F59E0B; }
    .fill-full { background: #EF4444; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-primary { background: #FFF1EA; color: var(--primary, #E05A1A); }
    .badge-success { background: #DCFCE7; color: #16A34A; }
    .badge-info { background: #E0F2FE; color: #0284C7; }
    .badge-warning { background: #FEF3C7; color: #D97706; }
    .badge-danger { background: #FEE2E2; color: #DC2626; }
    .badge-neutral { background: #F3F4F6; color: #4B5563; }

    .view-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
    }

    /* Modal Layout */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-dialog {
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
      width: 100%;
      overflow: hidden;
    }
    .modal-lg { max-width: 800px; }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #E5E7EB;
    }
    .modal-header-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .modal-eyebrow { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
    .modal-header h3 { margin: 0.25rem 0 0 0; }
    .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #9CA3AF; }
    .modal-body { padding: 1.5rem; }
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
    .tags-section { margin-top: 1rem; }
    .tags-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .read-only-notice {
      margin-top: 1.25rem;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.8rem;
      color: #6B7280;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #E5E7EB;
      background: #F9FAFB;
    }
    .loading-state, .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-muted);
    }
    .empty-state h3 { margin: 1rem 0 0.25rem 0; color: var(--text-main); }
  `]
})
export class CampusEventsComponent implements OnInit {
  private eventService = inject(EventService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  events = signal<Event[]>([]);
  isLoading = true;

  selectedTab = 'all';
  searchQuery = '';
  selectedCategory = '';
  timeframeFilter = 'all';
  selectedDetailEvent: Event | null = null;

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

  // KPI Computations (Matching Admin Page Exact Counters)
  totalEventsCount = computed(() => this.events().filter(e => e.status !== 'archived').length);
  upcomingCount = computed(() => this.events().filter(e => e.status === 'published' && new Date(e.startDate) > new Date()).length);
  completedCount = computed(() => this.events().filter(e => e.status === 'completed' || (e.status === 'published' && new Date(e.endDate) < new Date())).length);
  pendingCount = computed(() => this.events().filter(e => e.status === 'pending').length);
  totalRegistrationsCount = computed(() => this.events().reduce((sum, e) => sum + (e.registeredCount || 0), 0));

  filteredEvents = computed(() => {
    let list = this.events();

    // Tab Filter (Identical to Admin logic)
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
        this.toastService.error('Failed to load campus events directory.');
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

  isOngoing(event: Event): boolean {
    if (event.status !== 'published') return false;
    const now = new Date();
    return new Date(event.startDate) <= now && now <= new Date(event.endDate);
  }

  isPast(date: string | Date): boolean {
    return new Date(date) < new Date();
  }

  isMyEvent(event: Event): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    const organizerId = typeof event.organizer === 'object' ? event.organizer?._id : event.organizer;
    return organizerId === user._id;
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
      return (o as any).organizerProfile?.orgName || o.name || 'Campus Club';
    }
    return 'Campus Club';
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
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { EventService } from '../../../core/services/event.service';
import { Event } from '../../../core/models';

@Component({
  selector: 'app-organizer-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="fade-in">
      <div class="page-header" style="margin-bottom:1.5rem;">
        <h2 class="font-heading">Event Analytics</h2>
        <p>Understand your audience, engagement, and event performance through aggregated data.</p>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="loading-state">
        <i class="fa-solid fa-spinner fa-spin fa-3x" style="color:var(--primary);"></i>
        <p>Running aggregation pipeline...</p>
      </div>

      <ng-container *ngIf="!isLoading && analytics">
        <!-- KPI Cards -->
        <div class="kpi-grid" style="margin-bottom:2rem;">
          <div class="card kpi-card">
            <div class="kpi-icon" style="background:#FFF1EA;color:var(--primary);">
              <i class="fa-solid fa-calendar-days fa-lg"></i>
            </div>
            <div class="kpi-num font-heading">{{ analytics?.totalEvents || 0 }}</div>
            <div class="kpi-label">Total Events</div>
          </div>
          <div class="card kpi-card">
            <div class="kpi-icon" style="background:#ECFDF5;color:#10B981;">
              <i class="fa-solid fa-users fa-lg"></i>
            </div>
            <div class="kpi-num font-heading">{{ analytics?.totalRegistrations || 0 }}</div>
            <div class="kpi-label">Total Registrations</div>
          </div>
          <div class="card kpi-card">
            <div class="kpi-icon" style="background:#EFF6FF;color:#3B82F6;">
              <i class="fa-solid fa-user-check fa-lg"></i>
            </div>
            <div class="kpi-num font-heading">{{ analytics?.attendanceRate?.toFixed(1) || 0 }}%</div>
            <div class="kpi-label">Avg Attendance Rate</div>
          </div>
          <div class="card kpi-card">
            <div class="kpi-icon" style="background:#FEF3C7;color:#F59E0B;">
              <i class="fa-solid fa-star fa-lg"></i>
            </div>
            <div class="kpi-num font-heading">{{ analytics?.avgRating?.toFixed(1) || 'N/A' }}</div>
            <div class="kpi-label">Overall Rating</div>
          </div>
        </div>

        <!-- Category Distribution -->
        <div class="card" style="margin-bottom:1.5rem;padding:1.5rem;" *ngIf="analytics?.byCategory?.length">
          <h3 class="font-heading" style="margin-bottom:1.25rem;">
            <i class="fa-solid fa-chart-bar" style="color:var(--primary);"></i> Events by Category
          </h3>
          <div class="category-bars">
            <div *ngFor="let cat of analytics.byCategory" class="cat-bar-row">
              <span class="cat-name">{{ cat._id }}</span>
              <div class="cat-bar-track">
                <div class="cat-bar-fill" [style.width.%]="getCatPercent(cat, analytics.byCategory)"></div>
              </div>
              <span class="cat-count">{{ cat.totalEvents }} events</span>
            </div>
          </div>
        </div>

        <!-- Per-Event Performance -->
        <div class="card" *ngIf="analytics?.eventBreakdown?.length">
          <div style="padding:1.5rem;border-bottom:1px solid var(--border-light);">
            <h3 class="font-heading" style="margin:0;">Per-Event Performance</h3>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Registered</th>
                  <th>Checked-in</th>
                  <th>Waitlisted</th>
                  <th>Attendance Rate</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let ev of analytics.eventBreakdown">
                  <td><strong>{{ ev.eventTitle }}</strong></td>
                  <td>{{ ev.totalRegistered }}</td>
                  <td>{{ ev.checkedIn }}</td>
                  <td>{{ ev.waitlisted }}</td>
                  <td>
                    <div class="mini-bar-inline">
                      <div class="mini-fill-inline" [style.width.%]="ev.attendanceRate"></div>
                    </div>
                    <span>{{ ev.attendanceRate?.toFixed(1) }}%</span>
                  </td>
                  <td>
                    <span *ngIf="ev.avgRating"><i class="fa-solid fa-star" style="color:#F59E0B;"></i> {{ ev.avgRating?.toFixed(1) }}</span>
                    <span *ngIf="!ev.avgRating" style="color:var(--text-light);">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .loading-state { text-align:center;padding:4rem;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:1rem; }
    .kpi-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:1rem; }
    @media (max-width:900px) { .kpi-grid { grid-template-columns:repeat(2,1fr); } }
    .kpi-card { display:flex;flex-direction:column;align-items:center;text-align:center;padding:1.5rem;gap:0.75rem; }
    .kpi-icon { width:52px;height:52px;border-radius:12px;display:flex;align-items:center;justify-content:center; }
    .kpi-num { font-size:2rem;font-weight:800;line-height:1; }
    .kpi-label { font-size:0.8rem;color:var(--text-muted); }
    .category-bars { display:flex;flex-direction:column;gap:0.75rem; }
    .cat-bar-row { display:flex;align-items:center;gap:1rem; }
    .cat-name { width:100px;font-size:0.875rem;font-weight:600;flex-shrink:0; }
    .cat-bar-track { flex:1;height:8px;background:#EEE;border-radius:4px;overflow:hidden; }
    .cat-bar-fill { height:100%;background:var(--primary);border-radius:4px;transition:width 0.5s ease; }
    .cat-count { font-size:0.8rem;color:var(--text-muted);width:80px;text-align:right; }
    .mini-bar-inline { display:inline-block;width:60px;height:4px;background:#EEE;border-radius:2px;margin-right:0.5rem;vertical-align:middle; }
    .mini-fill-inline { height:100%;background:var(--success);border-radius:2px; }
  `]
})
export class OrganizerAnalyticsComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  analytics: any = null;
  isLoading = true;

  ngOnInit(): void {
    this.analyticsService.getOrganizerEventAnalytics().subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) this.analytics = res.data;
      },
      error: () => { this.isLoading = false; }
    });
  }

  getCatPercent(cat: any, list: any[]): number {
    const max = Math.max(...list.map((c: any) => c.totalEvents));
    return max ? Math.round((cat.totalEvents / max) * 100) : 0;
  }
}

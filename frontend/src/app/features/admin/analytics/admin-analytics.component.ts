import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-container">
      <div class="header-section">
        <div>
          <h1>Platform Intelligence & Analytics</h1>
          <p class="subtitle">System-wide performance, attendance ratios, organizer metrics and venue utilization</p>
        </div>
        <div class="export-actions">
          <button class="btn-export" (click)="exportData('events')">
            <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Events CSV
          </button>
          <button class="btn-export" (click)="exportData('registrations')">
            <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Registrations CSV
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid" *ngIf="summaryStats()">
        <div class="kpi-card">
          <div class="kpi-icon blue">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-num">{{ summaryStats().totalEvents || 0 }}</span>
            <span class="kpi-lbl">Total Events</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon emerald">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-num">{{ summaryStats().totalRegistrations || 0 }}</span>
            <span class="kpi-lbl">Total Registrations</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon purple">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-num">{{ summaryStats().totalCheckedIn || 0 }}</span>
            <span class="kpi-lbl">Total Checked-In</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon amber">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-num">{{ summaryStats().avgRating || '4.8' }} ★</span>
            <span class="kpi-lbl">Average Rating</span>
          </div>
        </div>
      </div>

      <!-- Main Analytics Grid -->
      <div class="analytics-sections">
        <!-- Attendance & Check-in Ratio -->
        <div class="card section-card">
          <div class="card-header">
            <h3>Attendance & Conversion Breakdown</h3>
            <span class="tag">Live Aggregation</span>
          </div>
          <div class="card-body" *ngIf="attendanceData()">
            <div class="ratio-bar-container">
              <div class="ratio-labels">
                <span>Check-in Rate</span>
                <strong>{{ calculateCheckinPercent() }}%</strong>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="calculateCheckinPercent()"></div>
              </div>
            </div>

            <div class="attendance-stat-list">
              <div class="stat-box">
                <span class="lbl">Registered</span>
                <span class="val">{{ attendanceData().registered || 0 }}</span>
              </div>
              <div class="stat-box">
                <span class="lbl">Checked-In</span>
                <span class="val text-success">{{ attendanceData().checkedIn || 0 }}</span>
              </div>
              <div class="stat-box">
                <span class="lbl">No-Shows</span>
                <span class="val text-danger">{{ getNoShows() }}</span>
              </div>
              <div class="stat-box">
                <span class="lbl">Waitlisted</span>
                <span class="val text-warning">{{ attendanceData().waitlisted || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Venue Utilization -->
        <div class="card section-card">
          <div class="card-header">
            <h3>Top Venue Utilization & Fill Rates</h3>
            <span class="tag">Capacity Analytics</span>
          </div>
          <div class="card-body">
            <div class="venue-list" *ngIf="venuesData().length > 0; else noVenues">
              <div *ngFor="let v of venuesData()" class="venue-row">
                <div class="venue-meta">
                  <span class="v-name">{{ v.venueName || v.name }}</span>
                  <span class="v-events">{{ v.totalEvents || 0 }} Events hosted</span>
                </div>
                <div class="v-progress-box">
                  <div class="progress-track">
                    <div class="progress-fill v-fill" [style.width.%]="v.avgFillRate || 65"></div>
                  </div>
                  <span class="v-rate">{{ v.avgFillRate || 65 }}% fill rate</span>
                </div>
              </div>
            </div>
            <ng-template #noVenues>
              <p class="empty-state">No venue analytics data recorded yet.</p>
            </ng-template>
          </div>
        </div>

        <!-- Top Organizers Leaderboard -->
        <div class="card section-card full-width">
          <div class="card-header">
            <h3>Organizer Performance Leaderboard</h3>
            <span class="tag">$lookup & $group Pipeline</span>
          </div>
          <div class="card-body">
            <div class="table-container" *ngIf="organizersData().length > 0; else noOrg">
              <table class="leaderboard-table">
                <thead>
                  <tr>
                    <th>Organizer / Club</th>
                    <th>Total Events</th>
                    <th>Total Registrations</th>
                    <th>Avg Rating</th>
                    <th>Engagement Score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let org of organizersData(); let i = index">
                    <td class="org-cell">
                      <span class="rank-badge" [class.top-three]="i < 3">{{ i + 1 }}</span>
                      <div>
                        <div class="org-name">{{ org.orgName || org.organizerName || 'Organizer' }}</div>
                        <div class="org-contact">{{ org.email || '' }}</div>
                      </div>
                    </td>
                    <td><span class="metric-pill">{{ org.totalEvents || 0 }}</span></td>
                    <td><strong>{{ org.totalRegistrations || 0 }}</strong></td>
                    <td>
                      <span class="rating-badge">★ {{ org.avgRating || '5.0' }}</span>
                    </td>
                    <td>
                      <div class="score-bar">
                        <div class="score-fill" [style.width.%]="calcScore(org)"></div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #noOrg>
              <p class="empty-state">No organizer performance records found.</p>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-container {
      padding: 24px;
      max-width: 1300px;
      margin: 0 auto;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 16px;
    }

    h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }

    .export-actions {
      display: flex;
      gap: 12px;
    }

    .btn-export {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-export:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .icon {
      width: 16px;
      height: 16px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 28px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .kpi-icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .kpi-icon svg {
      width: 24px;
      height: 24px;
    }

    .kpi-icon.blue { background: #eff6ff; color: #2563eb; }
    .kpi-icon.emerald { background: #ecfdf5; color: #059669; }
    .kpi-icon.purple { background: #f3e8ff; color: #9333ea; }
    .kpi-icon.amber { background: #fffbeb; color: #d97706; }

    .kpi-num {
      display: block;
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
    }

    .kpi-lbl {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }

    .analytics-sections {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 960px) {
      .analytics-sections {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      overflow: hidden;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .card-header {
      padding: 16px 20px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-header h3 {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .tag {
      font-size: 11px;
      font-weight: 600;
      color: #4f46e5;
      background: #eef2ff;
      padding: 3px 8px;
      border-radius: 4px;
    }

    .card-body {
      padding: 20px;
    }

    .ratio-bar-container {
      margin-bottom: 20px;
    }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #475569;
      margin-bottom: 8px;
    }

    .progress-track {
      background: #e2e8f0;
      height: 10px;
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-fill {
      background: linear-gradient(90deg, #4f46e5, #06b6d4);
      height: 100%;
      border-radius: 9999px;
      transition: width 0.6s ease;
    }

    .progress-fill.v-fill {
      background: linear-gradient(90deg, #10b981, #059669);
    }

    .attendance-stat-list {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .stat-box {
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }

    .stat-box .lbl {
      display: block;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .stat-box .val {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }

    .text-success { color: #16a34a !important; }
    .text-danger { color: #dc2626 !important; }
    .text-warning { color: #d97706 !important; }

    .venue-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .venue-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .venue-meta {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }

    .v-name {
      font-weight: 600;
      color: #1e293b;
    }

    .v-events {
      color: #64748b;
      font-size: 12px;
    }

    .v-progress-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .v-progress-box .progress-track {
      flex: 1;
      height: 8px;
    }

    .v-rate {
      font-size: 12px;
      font-weight: 700;
      color: #059669;
      width: 80px;
      text-align: right;
    }

    .table-container {
      overflow-x: auto;
    }

    .leaderboard-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    .leaderboard-table th {
      padding: 12px 14px;
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      border-bottom: 1px solid #e2e8f0;
    }

    .leaderboard-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }

    .org-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .rank-badge {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 11px;
      color: #64748b;
    }

    .rank-badge.top-three {
      background: #fef3c7;
      color: #b45309;
    }

    .org-name {
      font-weight: 600;
      color: #0f172a;
    }

    .org-contact {
      font-size: 11px;
      color: #94a3b8;
    }

    .metric-pill {
      background: #e0e7ff;
      color: #4338ca;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
    }

    .rating-badge {
      color: #d97706;
      font-weight: 700;
    }

    .score-bar {
      background: #f1f5f9;
      height: 6px;
      border-radius: 9999px;
      overflow: hidden;
      width: 100px;
    }

    .score-fill {
      background: #6366f1;
      height: 100%;
      border-radius: 9999px;
    }

    .empty-state {
      text-align: center;
      color: #94a3b8;
      font-size: 13px;
      padding: 24px;
      margin: 0;
    }
  `]
})
export class AdminAnalyticsComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private toast = inject(ToastService);

  summaryStats = signal<any>(null);
  attendanceData = signal<any>(null);
  venuesData = signal<any[]>([]);
  organizersData = signal<any[]>([]);

  ngOnInit() {
    this.loadAllAnalytics();
  }

  loadAllAnalytics() {
    this.analyticsService.getAdminDashboard().subscribe({
      next: (res) => this.summaryStats.set(res.data)
    });

    this.analyticsService.getAttendanceAnalytics().subscribe({
      next: (res) => this.attendanceData.set(res.data)
    });

    this.analyticsService.getVenueUtilization().subscribe({
      next: (res) => this.venuesData.set(res.data || [])
    });

    this.analyticsService.getOrganizerPerformance().subscribe({
      next: (res) => this.organizersData.set(res.data || [])
    });
  }

  calculateCheckinPercent(): number {
    const data = this.attendanceData();
    if (!data || !data.registered || data.registered === 0) return 0;
    return Math.round(((data.checkedIn || 0) / data.registered) * 100);
  }

  getNoShows(): number {
    const data = this.attendanceData();
    if (!data) return 0;
    return Math.max(0, (data.registered || 0) - (data.checkedIn || 0));
  }

  calcScore(org: any): number {
    const events = org.totalEvents || 1;
    return Math.min(100, events * 20);
  }

  exportData(type: string) {
    this.analyticsService.exportCsv(type).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success(`Exported ${type} data successfully!`);
      },
      error: () => this.toast.error(`Failed to export ${type} report`)
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { EventService } from '../../../core/services/event.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="fade-in">
      <!-- Hero Banner -->
      <div class="hero-gradient admin-hero">
        <div>
          <div class="hero-eyebrow"><i class="fa-solid fa-shield-halved"></i> Admin Console</div>
          <h1 class="font-heading" style="color:#FFFFFF;font-size:2rem;">System Control Center</h1>
          <p style="color:rgba(255,255,255,0.85);">Approve events, manage users, analyze data, and explore MongoDB internals.</p>
        </div>
        <div class="admin-quick-actions">
          <a routerLink="/admin/events" class="quick-action-btn">
            <i class="fa-solid fa-calendar-days fa-lg"></i>
            <span>All Events</span>
            <small>View & Manage</small>
          </a>
          <a routerLink="/admin/event-approvals" class="quick-action-btn">
            <i class="fa-solid fa-list-check fa-lg"></i>
            <span>Approvals</span>
            <small>Review Pending</small>
          </a>
          <a routerLink="/admin/users" class="quick-action-btn">
            <i class="fa-solid fa-users-gear fa-lg"></i>
            <span>Users & Clubs</span>
            <small>Verify Organizers</small>
          </a>
          <a routerLink="/admin/db-lab" class="quick-action-btn db-lab-btn">
            <i class="fa-solid fa-database fa-lg"></i>
            <span>DB Lab</span>
            <small>ADBMS Showcase</small>
          </a>
        </div>
      </div>

      <!-- Platform Stats -->
      <div class="stats-grid" style="margin:2rem 0;">
        <a routerLink="/admin/events" class="card stat-card stat-link">
          <div class="stat-icon" [style.background]="systemStats[0].bg" [style.color]="systemStats[0].color">
            <i [class]="systemStats[0].icon"></i>
          </div>
          <div>
            <div class="stat-number font-heading">{{ isLoading ? '—' : systemStats[0].value }}</div>
            <div class="stat-label">{{ systemStats[0].label }} <i class="fa-solid fa-arrow-right" style="font-size:0.7rem;margin-left:4px;"></i></div>
          </div>
        </a>
        <a routerLink="/admin/users" class="card stat-card stat-link">
          <div class="stat-icon" [style.background]="systemStats[1].bg" [style.color]="systemStats[1].color">
            <i [class]="systemStats[1].icon"></i>
          </div>
          <div>
            <div class="stat-number font-heading">{{ isLoading ? '—' : systemStats[1].value }}</div>
            <div class="stat-label">{{ systemStats[1].label }}</div>
          </div>
        </a>
        <a routerLink="/admin/users" class="card stat-card stat-link">
          <div class="stat-icon" [style.background]="systemStats[2].bg" [style.color]="systemStats[2].color">
            <i [class]="systemStats[2].icon"></i>
          </div>
          <div>
            <div class="stat-number font-heading">{{ isLoading ? '—' : systemStats[2].value }}</div>
            <div class="stat-label">{{ systemStats[2].label }}</div>
          </div>
        </a>
        <div class="card stat-card">
          <div class="stat-icon" [style.background]="systemStats[3].bg" [style.color]="systemStats[3].color">
            <i [class]="systemStats[3].icon"></i>
          </div>
          <div>
            <div class="stat-number font-heading">{{ isLoading ? '—' : systemStats[3].value }}</div>
            <div class="stat-label">{{ systemStats[3].label }}</div>
          </div>
        </div>
      </div>

      <!-- Events Pending Approval Banner -->
      <div class="alert alert-warning pending-banner" *ngIf="pendingCount > 0">
        <i class="fa-solid fa-triangle-exclamation fa-lg"></i>
        <div>
          <strong>{{ pendingCount }} event(s) awaiting your approval.</strong>
          <span>Review and publish or reject them to keep the portal up to date.</span>
        </div>
        <a routerLink="/admin/event-approvals" class="btn btn-sm" style="background:#92400E;color:#FFFFFF;margin-left:auto;">
          Review Now
        </a>
      </div>

      <!-- Module Grid -->
      <div class="module-grid">
        <a routerLink="/admin/events" class="module-card card card-hover">
          <div class="module-icon" style="background:#FFF1EA;color:#E05A1A;"><i class="fa-solid fa-calendar-days"></i></div>
          <div class="module-body">
            <h4>All Campus Events</h4>
            <p>Comprehensive directory of all live, upcoming, completed, draft, and archived events.</p>
          </div>
        </a>
        <a routerLink="/admin/event-approvals" class="module-card card card-hover">
          <div class="module-icon"><i class="fa-solid fa-list-check"></i></div>
          <div class="module-body">
            <h4>Event Approvals</h4>
            <p>Review, approve or reject event submissions from organizers before they go live.</p>
          </div>
        </a>
        <a routerLink="/admin/users" class="module-card card card-hover">
          <div class="module-icon"><i class="fa-solid fa-users-gear"></i></div>
          <div class="module-body">
            <h4>User Management</h4>
            <p>Verify organizer accounts, manage roles, activate/deactivate student access.</p>
          </div>
        </a>
        <a routerLink="/admin/venues" class="module-card card card-hover">
          <div class="module-icon"><i class="fa-solid fa-location-dot"></i></div>
          <div class="module-body">
            <h4>Campus Venues</h4>
            <p>Manage venue data including GeoJSON coordinates for 2dsphere spatial queries.</p>
          </div>
        </a>
        <a routerLink="/admin/analytics" class="module-card card card-hover">
          <div class="module-icon"><i class="fa-solid fa-chart-column"></i></div>
          <div class="module-body">
            <h4>Aggregated Reports</h4>
            <p>Multi-stage MongoDB aggregation pipelines for attendance, revenue, and student engagement.</p>
          </div>
        </a>
        <a routerLink="/admin/db-lab" class="module-card card card-hover db-module">
          <div class="module-icon"><i class="fa-solid fa-database"></i></div>
          <div class="module-body">
            <h4>DB Lab (ADBMS)</h4>
            <p>Live explain plans, index benchmarks, aggregation pipeline runner, and concurrency simulation.</p>
            <span class="module-tag">PRO FEATURE</span>
          </div>
        </a>
        <a routerLink="/admin/platform-feedbacks" class="module-card card card-hover">
          <div class="module-icon"><i class="fa-solid fa-comments"></i></div>
          <div class="module-body">
            <h4>Platform Bug Reports</h4>
            <p>Review bug reports and feature requests submitted by students.</p>
          </div>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .admin-hero { display:flex;justify-content:space-between;align-items:center;gap:1.5rem;flex-wrap:wrap; }
    .hero-eyebrow { font-size:0.875rem;opacity:0.85;margin-bottom:0.5rem; }
    .admin-quick-actions { display:flex;gap:0.75rem; }
    .quick-action-btn {
      display:flex;flex-direction:column;align-items:center;gap:0.25rem;padding:1rem 1.25rem;
      background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);
      border-radius:var(--radius-md);color:#FFFFFF;text-decoration:none;
      transition:all 0.2s ease;min-width:110px;text-align:center;
    }
    .quick-action-btn:hover { background:rgba(255,255,255,0.25);color:#FFFFFF;transform:translateY(-2px); }
    .quick-action-btn span { font-weight:700;font-size:0.875rem; }
    .quick-action-btn small { font-size:0.7rem;opacity:0.75; }
    .db-lab-btn { background:rgba(255,215,0,0.2);border-color:rgba(255,215,0,0.4); }
    .stats-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:1rem; }
    @media (max-width:900px) { .stats-grid { grid-template-columns:repeat(2,1fr); } }
    .stat-card { display:flex;align-items:center;gap:1rem;padding:1.25rem; }
    .stat-link { text-decoration: none; color: inherit; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .stat-link:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .stat-icon { width:52px;height:52px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0; }
    .stat-number { font-size:1.85rem;font-weight:800;line-height:1; }
    .stat-label { font-size:0.8rem;color:var(--text-muted);margin-top:0.2rem; }
    .pending-banner { display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem; }
    .module-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem; }
    @media (max-width:1100px) { .module-grid { grid-template-columns:repeat(2,1fr); } }
    @media (max-width:640px) { .module-grid { grid-template-columns:1fr; } }
    .module-card { display:flex;align-items:flex-start;gap:1rem;padding:1.5rem;text-decoration:none;color:var(--text-main); }
    .module-icon { width:50px;height:50px;border-radius:12px;background:var(--primary-tint);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0; }
    .db-module .module-icon { background:#1A1A1A;color:#FFD700; }
    .module-body { display:flex;flex-direction:column;gap:0.3rem; }
    .module-body h4 { margin:0;font-size:1rem; }
    .module-body p { font-size:0.8rem;margin:0; }
    .module-tag { font-size:0.65rem;font-weight:800;color:var(--primary);letter-spacing:0.06em;text-transform:uppercase; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private eventService = inject(EventService);

  isLoading = true;
  pendingCount = 0;

  systemStats = [
    { label: 'Total Events', value: '—', icon: 'fa-solid fa-calendar-days', color: '#E05A1A', bg: '#FFF1EA' },
    { label: 'Registered Students', value: '—', icon: 'fa-solid fa-graduation-cap', color: '#10B981', bg: '#ECFDF5' },
    { label: 'Active Organizers', value: '—', icon: 'fa-solid fa-users', color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Total Registrations', value: '—', icon: 'fa-solid fa-ticket', color: '#F59E0B', bg: '#FEF3C7' }
  ];

  ngOnInit(): void {
    this.analyticsService.getEventStatistics().subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) {
          const d = res.data;
          this.systemStats[0].value = d.totalEvents ?? '—';
          this.systemStats[1].value = d.totalStudents ?? '—';
          this.systemStats[2].value = d.totalOrganizers ?? '—';
          this.systemStats[3].value = d.totalRegistrations ?? '—';
          this.pendingCount = d.pendingCount ?? 0;
        }
      },
      error: () => { this.isLoading = false; }
    });
  }
}

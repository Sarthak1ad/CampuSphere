import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="app-sidebar" [class.open]="isOpen">
      <!-- App Brand / Logo -->
      <div class="sidebar-brand">
        <div class="brand-logo">
          <i class="fa-solid fa-shapes"></i>
        </div>
        <div class="brand-info">
          <span class="brand-name font-heading">CampuSphere</span>
          <span class="brand-portal">{{ getPortalTitle() }}</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <div class="sidebar-nav">
        <!-- Main Menu Section -->
        <div class="nav-section-title">MENU</div>

        <!-- STUDENT MENU -->
        <ng-container *ngIf="userRole === 'student'">
          <a routerLink="/student/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-house"></i></span>
            <span class="nav-text">Dashboard</span>
          </a>
          <a routerLink="/student/events" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-compass"></i></span>
            <span class="nav-text">Explore Events</span>
          </a>
          <a routerLink="/student/my-tickets" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-ticket"></i></span>
            <span class="nav-text">My Tickets & RSVP</span>
          </a>
          <a routerLink="/student/feedback" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-regular fa-star"></i></span>
            <span class="nav-text">Event Reviews</span>
          </a>
          <a routerLink="/student/platform-feedback" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-bug"></i></span>
            <span class="nav-text">Submit Feedback</span>
          </a>
        </ng-container>

        <!-- ORGANIZER MENU -->
        <ng-container *ngIf="userRole === 'organizer'">
          <a routerLink="/organizer/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-chart-pie"></i></span>
            <span class="nav-text">Overview</span>
          </a>
          <a routerLink="/organizer/events" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-calendar-days"></i></span>
            <span class="nav-text">My Events</span>
          </a>
          <a routerLink="/organizer/campus-events" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-calendar-week"></i></span>
            <span class="nav-text">Campus Schedule</span>
          </a>
          <a routerLink="/organizer/create-event" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-plus-circle"></i></span>
            <span class="nav-text">Create Event</span>
          </a>
          <a routerLink="/organizer/check-in" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-qrcode"></i></span>
            <span class="nav-text">QR Check-in</span>
          </a>
          <a routerLink="/organizer/analytics" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-chart-line"></i></span>
            <span class="nav-text">Event Analytics</span>
          </a>
        </ng-container>

        <!-- ADMIN MENU -->
        <ng-container *ngIf="userRole === 'admin'">
          <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-gauge-high"></i></span>
            <span class="nav-text">Admin Center</span>
          </a>
          <a routerLink="/admin/events" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-calendar-days"></i></span>
            <span class="nav-text">All Events</span>
          </a>
          <a routerLink="/admin/db-lab" routerLinkActive="active" class="nav-item db-lab-link">
            <span class="nav-icon"><i class="fa-solid fa-database"></i></span>
            <span class="nav-text">DB Lab (ADBMS)</span>
            <span class="badge badge-primary lab-tag">PRO</span>
          </a>
          <a routerLink="/admin/event-approvals" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-list-check"></i></span>
            <span class="nav-text">Event Approvals</span>
          </a>
          <a routerLink="/admin/users" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-users-gear"></i></span>
            <span class="nav-text">Users & Clubs</span>
          </a>
          <a routerLink="/admin/venues" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-location-dot"></i></span>
            <span class="nav-text">Campus Venues</span>
          </a>
          <a routerLink="/admin/analytics" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-chart-column"></i></span>
            <span class="nav-text">Aggregated Reports</span>
          </a>
          <a routerLink="/admin/platform-feedbacks" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="fa-solid fa-comments"></i></span>
            <span class="nav-text">Platform Bugs</span>
          </a>
        </ng-container>

        <!-- Account Section -->
        <div class="nav-section-title" style="margin-top: 1.5rem;">ACCOUNT</div>
        <button class="nav-item logout-btn" (click)="onLogout()">
          <span class="nav-icon"><i class="fa-solid fa-arrow-right-from-bracket"></i></span>
          <span class="nav-text">Sign Out</span>
        </button>
      </div>

      <!-- User Card Footer -->
      <div class="sidebar-footer" *ngIf="authService.currentUser() as user">
        <div class="user-avatar-md">{{ user.name.charAt(0).toUpperCase() }}</div>
        <div class="user-info-md">
          <span class="user-fullname">{{ user.name }}</span>
          <span class="user-email-text">{{ user.email }}</span>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar-brand {
      height: 70px;
      padding: 0 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-bottom: 1px solid var(--border-light);
    }
    .brand-logo {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: var(--primary);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }
    .brand-info {
      display: flex;
      flex-direction: column;
    }
    .brand-name {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
      line-height: 1.1;
    }
    .brand-portal {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .sidebar-nav {
      flex: 1;
      padding: 1.25rem 0.75rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .nav-section-title {
      font-size: 0.7rem;
      font-weight: 800;
      color: var(--text-light);
      letter-spacing: 0.08em;
      padding: 0.5rem 0.75rem;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s ease;
      border-left: 3px solid transparent;
      text-decoration: none;
      cursor: pointer;
    }
    .nav-item:hover {
      background: #F9FAFB;
      color: var(--text-main);
    }
    .nav-item.active {
      background: var(--primary-tint);
      color: var(--primary);
      border-left-color: var(--primary);
      font-weight: 700;
    }
    .nav-icon {
      font-size: 1.1rem;
      width: 22px;
      display: flex;
      justify-content: center;
    }
    .db-lab-link {
      background: #FFF7ED;
      color: #C2410C;
    }
    .lab-tag {
      margin-left: auto;
      font-size: 0.65rem;
      padding: 0.15rem 0.45rem;
    }
    .logout-btn {
      background: none;
      border: none;
      width: 100%;
      text-align: left;
    }
    .logout-btn:hover {
      background: var(--danger-bg);
      color: var(--danger);
    }
    .sidebar-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #FAFAFA;
    }
    .user-avatar-md {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--primary);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
    }
    .user-info-md {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .user-fullname {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-email-text {
      font-size: 0.75rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class SidebarComponent {
  @Input() isOpen = false;

  authService = inject(AuthService);
  private router = inject(Router);

  get userRole(): string {
    return this.authService.currentUser()?.role || 'student';
  }

  getPortalTitle(): string {
    const role = this.userRole;
    if (role === 'admin') return 'Admin Console';
    if (role === 'organizer') return 'Club Portal';
    return 'Student Hub';
  }

  onLogout(): void {
    this.authService.logout();
  }
}

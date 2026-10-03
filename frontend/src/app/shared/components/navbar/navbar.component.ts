import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="top-navbar">
      <div class="navbar-left">
        <button class="mobile-toggle-btn" (click)="toggleSidebar.emit()">
          <i class="fa-solid fa-bars"></i>
        </button>
        <div class="system-status-pill">
          <span class="pulse-dot"></span>
          <span class="status-text">MongoDB Atlas Cluster Connected</span>
        </div>
      </div>

      <div class="navbar-right">
        <!-- Notification Dropdown -->
        <div class="nav-item-dropdown">
          <button class="icon-btn" (click)="toggleNotifications()" title="Notifications">
            <i class="fa-regular fa-bell"></i>
            <span class="unread-badge" *ngIf="notificationService.unreadCount() > 0">
              {{ notificationService.unreadCount() }}
            </span>
          </button>

          <div class="notification-menu card" *ngIf="showNotifications">
            <div class="notif-header">
              <h4>Notifications</h4>
              <button class="btn btn-sm btn-outline" (click)="markAllRead()">Mark all read</button>
            </div>
            <div class="notif-list">
              <div *ngIf="notificationService.notifications().length === 0" class="notif-empty">
                <p>No notifications yet</p>
              </div>
              <div *ngFor="let notif of notificationService.notifications()" 
                   class="notif-item" [class.unread]="!notif.isRead">
                <div class="notif-body">
                  <strong>{{ notif.title }}</strong>
                  <p>{{ notif.message }}</p>
                  <span class="notif-time">{{ notif.createdAt | date:'short' }}</span>
                </div>
                <button *ngIf="!notif.isRead" class="btn-check" (click)="markRead(notif._id)" title="Mark read">
                  <i class="fa-solid fa-check"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- User Quick Info -->
        <div class="user-pill" *ngIf="authService.currentUser() as user">
          <div class="user-avatar-sm">{{ user.name.charAt(0).toUpperCase() }}</div>
          <div class="user-details-sm">
            <span class="user-name-sm">{{ user.name }}</span>
            <span class="badge badge-primary">{{ user.role }}</span>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .top-navbar {
      height: 70px;
      background: #FFFFFF;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
      position: sticky;
      top: 0;
      z-index: 40;
    }
    .navbar-left, .navbar-right {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .mobile-toggle-btn {
      display: none;
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: var(--text-main);
    }
    @media (max-width: 900px) {
      .mobile-toggle-btn { display: block; }
    }
    .system-status-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--success-bg);
      border: 1px solid #A7F3D0;
      padding: 0.35rem 0.85rem;
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      color: #065F46;
      font-weight: 600;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .icon-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid var(--border-light);
      background: var(--bg-card);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      color: var(--text-main);
      font-size: 1.1rem;
      transition: all 0.2s ease;
    }
    .icon-btn:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    .unread-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      background: var(--primary);
      color: #FFFFFF;
      font-size: 0.65rem;
      font-weight: 700;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nav-item-dropdown {
      position: relative;
    }
    .notification-menu {
      position: absolute;
      top: 50px;
      right: 0;
      width: 340px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 100;
      padding: 0;
      box-shadow: var(--shadow-lg);
    }
    .notif-header {
      padding: 1rem;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .notif-header h4 { margin: 0; font-size: 1rem; }
    .notif-list { display: flex; flex-direction: column; }
    .notif-empty { padding: 2rem; text-align: center; color: var(--text-muted); }
    .notif-item {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
    }
    .notif-item.unread {
      background: var(--primary-tint);
    }
    .notif-body p { margin: 0.2rem 0; font-size: 0.8rem; }
    .notif-time { font-size: 0.7rem; color: var(--text-muted); }
    .btn-check {
      background: none;
      border: none;
      color: var(--primary);
      cursor: pointer;
      font-size: 1rem;
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-light);
      background: #FAFAFA;
    }
    .user-avatar-sm {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--primary);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .user-details-sm {
      display: flex;
      flex-direction: column;
    }
    .user-name-sm {
      font-weight: 700;
      font-size: 0.85rem;
      line-height: 1.2;
    }
  `]
})
export class NavbarComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();
  
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  showNotifications = false;

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.notificationService.getNotifications().subscribe();
    }
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  markRead(id: string): void {
    this.notificationService.markAsRead(id).subscribe();
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }
}

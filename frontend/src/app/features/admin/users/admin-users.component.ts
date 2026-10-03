import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header" style="margin-bottom:1.5rem;">
        <h2 class="font-heading">User Management</h2>
        <p>Verify organizers, manage student accounts, and control platform access.</p>
      </div>

      <!-- Role Filter Tabs -->
      <div class="ticket-tabs" style="margin-bottom:1.5rem;">
        <button *ngFor="let tab of ['all','student','organizer','admin']" class="ticket-tab"
          [class.active]="activeRole === tab" (click)="filterByRole(tab)">
          {{ tab | titlecase }} ({{ getRoleCount(tab) }})
        </button>
      </div>

      <div *ngIf="isLoading" class="loading-state">
        <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i>
      </div>

      <div *ngIf="!isLoading" class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Organizer Verification</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of filteredUsers()">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar">{{ user.name.charAt(0).toUpperCase() }}</div>
                    <div class="user-cell-info">
                      <span class="user-name-cell">{{ user.name }}</span>
                      <span class="user-email-cell">{{ user.email }}</span>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-primary">{{ user.role }}</span></td>
                <td>
                  <span class="badge" [ngClass]="user.isActive ? 'badge-success' : 'badge-danger'">
                    {{ user.isActive ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td>
                  <ng-container *ngIf="user.role === 'organizer'">
                    <span class="badge" [ngClass]="getVerifyBadge(user.organizerProfile?.verificationStatus)">
                      {{ user.organizerProfile?.verificationStatus || 'pending' }}
                    </span>
                    <div class="verify-actions" *ngIf="user.organizerProfile?.verificationStatus === 'pending'">
                      <button class="btn btn-sm btn-success" (click)="verifyOrganizer(user, 'verified')">
                        <i class="fa-solid fa-check"></i> Verify
                      </button>
                      <button class="btn btn-sm btn-danger" (click)="verifyOrganizer(user, 'rejected')">
                        <i class="fa-solid fa-xmark"></i> Reject
                      </button>
                    </div>
                  </ng-container>
                  <span *ngIf="user.role !== 'organizer'" style="color:var(--text-light);font-size:0.8rem;">N/A</span>
                </td>
                <td><span style="font-size:0.875rem;">{{ user.createdAt | date:'MMM d, y' }}</span></td>
                <td>
                  <button class="btn btn-sm" [ngClass]="user.isActive ? 'btn-danger' : 'btn-success'" (click)="toggleUser(user)">
                    {{ user.isActive ? 'Disable' : 'Enable' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="filteredUsers().length === 0" class="empty-state">
            <p>No users found in this category.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loading-state, .empty-state { text-align:center;padding:2rem;color:var(--text-muted);display:flex;flex-direction:column;align-items:center; }
    .ticket-tabs { display:flex;gap:0.5rem;background:#F3F4F6;padding:0.25rem;border-radius:var(--radius-sm); }
    .ticket-tab { padding:0.5rem 1rem;border:none;background:transparent;border-radius:6px;font-weight:600;font-size:0.875rem;cursor:pointer;color:var(--text-muted);transition:all 0.2s ease; }
    .ticket-tab.active { background:#FFFFFF;color:var(--primary);box-shadow:var(--shadow-sm); }
    .user-cell { display:flex;align-items:center;gap:0.75rem; }
    .user-avatar { width:36px;height:36px;border-radius:50%;background:var(--primary);color:#FFF;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.875rem;flex-shrink:0; }
    .user-cell-info { display:flex;flex-direction:column; }
    .user-name-cell { font-weight:700;font-size:0.875rem; }
    .user-email-cell { font-size:0.75rem;color:var(--text-muted); }
    .verify-actions { display:flex;gap:0.35rem;margin-top:0.4rem; }
    .btn-success { background:var(--success);color:#FFFFFF;border:none; }
  `]
})
export class AdminUsersComponent implements OnInit {
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  users = signal<User[]>([]);
  isLoading = true;
  activeRole = 'all';

  ngOnInit(): void {
    this.userService.getUsers({ limit: 200 }).subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) this.users.set(res.data);
      },
      error: () => { this.isLoading = false; }
    });
  }

  filterByRole(role: string): void {
    this.activeRole = role;
  }

  filteredUsers(): User[] {
    if (this.activeRole === 'all') return this.users();
    return this.users().filter(u => u.role === this.activeRole);
  }

  getRoleCount(role: string): number {
    if (role === 'all') return this.users().length;
    return this.users().filter(u => u.role === role).length;
  }

  verifyOrganizer(user: User, status: 'verified' | 'rejected'): void {
    this.userService.verifyOrganizer(user._id, status, '', status === 'verified' ? 5 : undefined).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.users.update(list => list.map(u => u._id === user._id ? res.data! : u));
          this.toastService.success(`${user.name} ${status === 'verified' ? 'verified' : 'rejected'}.`);
        }
      },
      error: err => this.toastService.error(err.error?.message || 'Failed to update.')
    });
  }

  toggleUser(user: User): void {
    this.userService.toggleActive(user._id).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.users.update(list => list.map(u => u._id === user._id ? res.data! : u));
          this.toastService.success(`${user.name} ${res.data.isActive ? 'enabled' : 'disabled'}.`);
        }
      },
      error: err => this.toastService.error(err.error?.message || 'Failed to toggle user.')
    });
  }

  getVerifyBadge(status?: string): string {
    const map: Record<string, string> = { verified: 'badge-success', rejected: 'badge-danger', pending: 'badge-warning' };
    return map[status || 'pending'] || 'badge-neutral';
  }
}

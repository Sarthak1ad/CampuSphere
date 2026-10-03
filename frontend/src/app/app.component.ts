import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { AuthService } from './core/services/auth.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent, SidebarComponent, ToastComponent],
  template: `
    <app-toast></app-toast>

    <ng-container *ngIf="authService.isLoggedIn(); else publicLayout">
      <div class="app-layout">
        <app-sidebar [isOpen]="sidebarOpen()"></app-sidebar>
        <main class="app-main">
          <app-navbar (toggleSidebar)="sidebarOpen.set(!sidebarOpen())"></app-navbar>
          <div class="app-content fade-in">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
      <!-- Mobile overlay backdrop -->
      <div *ngIf="sidebarOpen()" class="mobile-backdrop" (click)="sidebarOpen.set(false)"></div>
    </ng-container>

    <ng-template #publicLayout>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styles: [`
    .mobile-backdrop {
      display: none;
    }
    @media (max-width: 900px) {
      .mobile-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 49;
      }
    }
  `]
})
export class AppComponent {
  authService = inject(AuthService);
  sidebarOpen = signal(false);
}

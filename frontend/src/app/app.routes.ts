import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  // Auth routes (public)
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
      }
    ]
  },

  // Student routes
  {
    path: 'student',
    canActivate: [authGuard, roleGuard(['student'])],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/student/dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent)
      },
      {
        path: 'events',
        loadComponent: () => import('./features/student/event-list/student-event-list.component').then(m => m.StudentEventListComponent)
      },
      {
        path: 'events/:id',
        loadComponent: () => import('./features/student/event-detail/event-detail.component').then(m => m.EventDetailComponent)
      },
      {
        path: 'my-tickets',
        loadComponent: () => import('./features/student/my-tickets/my-tickets.component').then(m => m.MyTicketsComponent)
      },
      {
        path: 'feedback',
        loadComponent: () => import('./features/student/feedback/student-feedback.component').then(m => m.StudentFeedbackComponent)
      },
      {
        path: 'platform-feedback',
        loadComponent: () => import('./features/student/platform-feedback/platform-feedback.component').then(m => m.PlatformFeedbackComponent)
      }
    ]
  },

  // Organizer routes
  {
    path: 'organizer',
    canActivate: [authGuard, roleGuard(['organizer'])],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/organizer/dashboard/organizer-dashboard.component').then(m => m.OrganizerDashboardComponent)
      },
      {
        path: 'events',
        loadComponent: () => import('./features/organizer/event-list/organizer-event-list.component').then(m => m.OrganizerEventListComponent)
      },
      {
        path: 'create-event',
        loadComponent: () => import('./features/organizer/event-form/event-form.component').then(m => m.EventFormComponent)
      },
      {
        path: 'events/:id/edit',
        loadComponent: () => import('./features/organizer/event-form/event-form.component').then(m => m.EventFormComponent)
      },
      {
        path: 'events/:id/report',
        loadComponent: () => import('./features/organizer/event-report/event-report.component').then(m => m.EventReportComponent)
      },
      {
        path: 'check-in',
        loadComponent: () => import('./features/organizer/check-in/check-in.component').then(m => m.CheckInComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/organizer/analytics/organizer-analytics.component').then(m => m.OrganizerAnalyticsComponent)
      }
    ]
  },

  // Admin routes
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['admin'])],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'db-lab',
        loadComponent: () => import('./features/admin/db-lab/db-lab.component').then(m => m.DbLabComponent)
      },
      {
        path: 'event-approvals',
        loadComponent: () => import('./features/admin/event-approvals/event-approvals.component').then(m => m.EventApprovalsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent)
      },
      {
        path: 'venues',
        loadComponent: () => import('./features/admin/venues/admin-venues.component').then(m => m.AdminVenuesComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/admin/analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent)
      },
      {
        path: 'platform-feedbacks',
        loadComponent: () => import('./features/admin/platform-feedbacks/platform-feedbacks.component').then(m => m.PlatformFeedbacksComponent)
      }
    ]
  },

  // Wildcard redirect
  { path: '**', redirectTo: '/auth/login' }
];

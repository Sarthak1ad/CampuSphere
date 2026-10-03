import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const roleGuard = (allowedRoles: Role[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
      router.navigate(['/auth/login']);
      return false;
    }

    if (authService.hasRole(allowedRoles)) {
      return true;
    }

    // Redirect to their appropriate home
    const userRole = authService.currentUser()?.role;
    if (userRole === 'admin') router.navigate(['/admin/dashboard']);
    else if (userRole === 'organizer') router.navigate(['/organizer/dashboard']);
    else router.navigate(['/student/dashboard']);

    return false;
  };
};

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    switchMap(isAuthenticated => {
      // If the user is not authenticated, redirect to the login page
      if (!isAuthenticated) {
        return of(router.createUrlTree(['/login']));
      }

      const requiredRole = route.data['role'];
      
      // If no specific role is required, allow any authenticated user
      if (!requiredRole || requiredRole === 'any') {
        return of(true);
      }

      if (requiredRole === 'guest') {
        return authService.isGuest().pipe(
          map(isGuest => isGuest ? true : router.createUrlTree(['/auth/unauthorized']))
        );
      }

      if (requiredRole === 'admin') {
        return authService.isAdmin().pipe(
          map(isAdmin => isAdmin ? true : router.createUrlTree(['/auth/unauthorized']))
        );
      }

      if (requiredRole === 'owner') {
        return authService.isOwner().pipe(
          map(isOwner => isOwner ? true : router.createUrlTree(['/auth/unauthorized']))
        );
      }

      return of(true);
    })
  );
};
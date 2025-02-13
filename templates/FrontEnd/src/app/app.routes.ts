import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./platforms/landing/pages/home/home.page').then(m => m.HomePage)
  },
  {
    path: 'signup',
    loadComponent: () => import('./auth/pages/signup/signup.page').then(m => m.SignupPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./auth/pages/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage)
  },
  {
    path: 'verify-otp',
    loadComponent: () => import('./auth/pages/verify-otp/verify-otp.page').then(m => m.VerifyOtpPage)
  },
  {
    path: 'profile',
    loadComponent: () => import('./shared/pages/profile/profile.page').then(m => m.ProfilePage),
    canActivate: [authGuard],
    data: { role: 'any' }
  },
  {
    path: 'admin',
    loadComponent: () => import('./platforms/admin/admin.component').then(m => m.AdminComponent),
    loadChildren: () => import('./platforms/admin/admin.route').then(m => m.routes),
    canActivateChild: [authGuard],
    data: { role: 'admin' }
  },
  {
    path: 'guest',
    loadComponent: () => import('./platforms/guest/guest.component').then(m => m.GuestComponent),
    loadChildren: () => import('./platforms/guest/guest.route').then(m => m.routes),
    canActivateChild: [authGuard],
    data: { role: 'guest' }
  },
  {
    path: 'owner',
    loadComponent: () => import('./platforms/owner/owner.component').then(m => m.OwnerComponent),
    loadChildren: () => import('./platforms/owner/owner.route').then(m => m.routes),
    canActivateChild: [authGuard],
    data: { role: 'owner' }
  },
  {
    path: 'landing',
    loadComponent: () => import('./platforms/landing/landing.component').then(m => m.LandingComponent),
    loadChildren: () => import('./platforms/landing/landing.route').then(m => m.routes)
  },
];

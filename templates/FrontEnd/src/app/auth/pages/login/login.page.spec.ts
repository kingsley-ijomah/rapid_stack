import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router, ActivatedRoute, UrlTree } from '@angular/router';
import { LoginPage } from './login.page';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../../services/ui/toast.service';
import { ErrorService } from '../../../services/errors/error.service';
import { NavController } from '@ionic/angular/standalone';
import { of } from 'rxjs';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let errorServiceSpy: jasmine.SpyObj<ErrorService>;
  let navControllerSpy: jasmine.SpyObj<NavController>;

  beforeEach(waitForAsync(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl']);
    routerSpy.createUrlTree.and.returnValue({} as UrlTree);
    routerSpy.serializeUrl.and.returnValue('/');
    (routerSpy as any).events = of();

    authServiceSpy = jasmine.createSpyObj('AuthService', ['signIn', 'isAdmin', 'isOwner', 'isGuest']);
    authServiceSpy.isAdmin.and.returnValue(of(false));
    authServiceSpy.isOwner.and.returnValue(of(false));
    authServiceSpy.isGuest.and.returnValue(of(false));

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['showToast']);
    errorServiceSpy = jasmine.createSpyObj('ErrorService', [], { errors: [] });
    navControllerSpy = jasmine.createSpyObj('NavController', ['navigateForward', 'navigateRoot']);

    TestBed.configureTestingModule({
      imports: [
        LoginPage,
        ReactiveFormsModule,
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: ErrorService, useValue: errorServiceSpy },
        { provide: NavController, useValue: navControllerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({}),
            snapshot: { params: {}, queryParams: {} }
          }
        }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the login page', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Fields Presence', () => {
    it('should contain all required form fields', () => {
      const formElement = fixture.debugElement.query(By.css('form'));
      expect(formElement).toBeTruthy('Form element should be present');

      // Check for email input
      const emailInput = fixture.debugElement.query(By.css('ion-input[formControlName="email"]'));
      expect(emailInput).toBeTruthy('Email input should be present');
      expect(emailInput.attributes['placeholder']).toBe('Email');
      expect(emailInput.attributes['type']).toBe('email');

      // Check for password input
      const passwordInput = fixture.debugElement.query(By.css('ion-input[formControlName="password"]'));
      expect(passwordInput).toBeTruthy('Password input should be present');
      expect(passwordInput.attributes['placeholder']).toBe('Password');
      expect(passwordInput.attributes['type']).toBe('password');
    });

    it('should contain a submit button', () => {
      const submitButton = fixture.debugElement.query(By.css('ion-button[type="submit"]'));
      expect(submitButton).toBeTruthy('Submit button should be present');
      expect(submitButton.nativeElement.textContent.trim()).toBe('Login');
    });

    it('should show error messages container when there are backend errors', () => {
      component.backendErrors = ['Test error 1', 'Test error 2'];
      fixture.detectChanges();

      const errorContainer = fixture.debugElement.query(By.css('.error-messages'));
      expect(errorContainer).toBeTruthy('Error messages container should be present when there are errors');

      const errorMessages = errorContainer.queryAll(By.css('p'));
      expect(errorMessages.length).toBe(2, 'Should display all backend errors');
      expect(errorMessages[0].nativeElement.textContent).toContain('Test error 1');
      expect(errorMessages[1].nativeElement.textContent).toContain('Test error 2');
    });
  });

  describe('Link Checks', () => {
    it('should have a signup link pointing to /signup', () => {
      const signupLink = fixture.debugElement.query(By.css('.signup-link a'));
      expect(signupLink).toBeTruthy();
      const routerLinkAttr = signupLink.attributes['ng-reflect-router-link'] || signupLink.nativeElement.getAttribute('routerLink');
      expect(routerLinkAttr).toEqual('/signup');
      expect(signupLink.nativeElement.textContent.trim()).toEqual('Sign Up');
    });

    it('should have a forgot password link pointing to /forgot-password', () => {
      const forgotPasswordLink = fixture.debugElement.query(By.css('.forgot-password a'));
      expect(forgotPasswordLink).toBeTruthy();
      const routerLinkAttr = forgotPasswordLink.attributes['ng-reflect-router-link'] || forgotPasswordLink.nativeElement.getAttribute('routerLink');
      expect(routerLinkAttr).toEqual('/forgot-password');
      expect(forgotPasswordLink.nativeElement.textContent.trim()).toEqual('Forgot Password?');
    });
  });

  describe('Form Validation', () => {
    it('should not execute signIn when the form is invalid', () => {
      authServiceSpy.signIn.and.returnValue(of({}));
      component.onSubmit();
      fixture.detectChanges();

      expect(component.loginForm.valid).toBeFalse();
      expect(authServiceSpy.signIn).not.toHaveBeenCalled();
    });

    it('should show validation errors when submitting empty form', () => {
      component.onSubmit();
      fixture.detectChanges();

      expect(component.getErrorMessage('email')).toBe('email is required');
      expect(component.getErrorMessage('password')).toBe('password is required');
    });

    it('should show email format error for invalid email', () => {
      const emailControl = component.loginForm.controls['email'];
      emailControl.setValue('invalid-email');
      component.onSubmit();
      fixture.detectChanges();

      expect(component.getErrorMessage('email')).toBe('Please enter a valid email');
    });
  });

  describe('Navigation after Login', () => {
    beforeEach(() => {
      // Set up valid form data
      component.loginForm.controls['email'].setValue('test@example.com');
      component.loginForm.controls['password'].setValue('password123');
    });

    it('should navigate to owner dashboard when user is owner', () => {
      authServiceSpy.isOwner.and.returnValue(of(true));
      authServiceSpy.signIn.and.returnValue(of({}));

      component.onSubmit();
      fixture.detectChanges();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/owner/dashboard']);
    });

    it('should navigate to admin dashboard when user is admin', () => {
      authServiceSpy.isAdmin.and.returnValue(of(true));
      authServiceSpy.signIn.and.returnValue(of({}));

      component.onSubmit();
      fixture.detectChanges();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
    });

    it('should navigate to guest dashboard when user is guest', () => {
      authServiceSpy.isGuest.and.returnValue(of(true));
      authServiceSpy.signIn.and.returnValue(of({}));

      component.onSubmit();
      fixture.detectChanges();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/guest/dashboard']);
    });

    it('should navigate to home when user role is not determined', () => {
      authServiceSpy.signIn.and.returnValue(of({}));

      component.onSubmit();
      fixture.detectChanges();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });
  });
}); 
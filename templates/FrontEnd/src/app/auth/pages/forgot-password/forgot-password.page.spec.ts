import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router, ActivatedRoute, UrlTree } from '@angular/router';
import { ForgotPasswordPage } from './forgot-password.page';
import { ToastController } from '@ionic/angular/standalone';
import { ErrorService } from '../../../services/errors/error.service';
import { GraphQLService } from '../../../services/graphql.service';
import { APOLLO_OPTIONS, Apollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/core';
import { HttpClientModule } from '@angular/common/http';
import { of } from 'rxjs';

describe('ForgotPasswordPage', () => {
  let component: ForgotPasswordPage;
  let fixture: ComponentFixture<ForgotPasswordPage>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let errorServiceSpy: jasmine.SpyObj<ErrorService>;
  let graphQLServiceSpy: jasmine.SpyObj<GraphQLService>;

  beforeEach(waitForAsync(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl']);
    routerSpy.createUrlTree.and.returnValue({} as UrlTree);
    routerSpy.serializeUrl.and.returnValue('/');
    (routerSpy as any).events = of();

    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    errorServiceSpy = jasmine.createSpyObj('ErrorService', [], { errors: [] });
    graphQLServiceSpy = jasmine.createSpyObj('GraphQLService', ['mutate']);

    TestBed.configureTestingModule({
      imports: [
        ForgotPasswordPage,
        ReactiveFormsModule,
        HttpClientModule
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: ErrorService, useValue: errorServiceSpy },
        { provide: GraphQLService, useValue: graphQLServiceSpy },
        Apollo,
        {
          provide: APOLLO_OPTIONS,
          useFactory: (httpLink: HttpLink) => ({
            cache: new InMemoryCache(),
            link: httpLink.create({ uri: 'http://localhost:3000/graphql' })
          }),
          deps: [HttpLink]
        },
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
    fixture = TestBed.createComponent(ForgotPasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the forgot password page', () => {
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
    });

    it('should contain a submit button', () => {
      const submitButton = fixture.debugElement.query(By.css('ion-button[type="submit"]'));
      expect(submitButton).toBeTruthy('Submit button should be present');
      expect(submitButton.nativeElement.textContent.trim()).toBe('Send Verification Code');
    });

    it('should show error messages container when there are backend errors', () => {
      component.backendErrors = ['Test error 1', 'Test error 2'];
      fixture.detectChanges();

      const errorContainer = fixture.debugElement.query(By.css('.status-messages.error-messages'));
      expect(errorContainer).toBeTruthy('Error messages container should be present when there are errors');

      const errorMessages = errorContainer.query(By.css('ion-text')).queryAll(By.css('p'));
      expect(errorMessages.length).toBe(2, 'Should display all backend errors');
      expect(errorMessages[0].nativeElement.textContent).toContain('Test error 1');
      expect(errorMessages[1].nativeElement.textContent).toContain('Test error 2');
    });
  });

  describe('Form Validation', () => {
    it('should not execute mutation when the form is invalid', () => {
      const executeMutationSpy = spyOn(component as any, 'executeMutation');
      component.onSubmit();
      fixture.detectChanges();

      expect(component.forgotPasswordForm.valid).toBeFalse();
      expect(executeMutationSpy).not.toHaveBeenCalled();
    });

    it('should show validation errors when submitting empty form', () => {
      component.onSubmit();
      fixture.detectChanges();

      expect(component.getErrorMessage('email')).toBe('Email is required');
    });

    it('should show email format error for invalid email', () => {
      const emailControl = component.forgotPasswordForm.controls['email'];
      emailControl.setValue('invalid-email');
      component.onSubmit();
      fixture.detectChanges();

      expect(component.getErrorMessage('email')).toBe('Please enter a valid email');
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      component.forgotPasswordForm.controls['email'].setValue('test@example.com');
    });

    it('should call executeMutation with correct parameters on valid submission', async () => {
      const executeMutationSpy = spyOn(component as any, 'executeMutation');
      
      await component.onSubmit();
      
      expect(executeMutationSpy).toHaveBeenCalledWith({
        mutation: jasmine.any(Object),
        variables: { email: 'test@example.com' },
        responsePath: 'otpRequest',
        successMessage: 'A verification code has been sent to your email!',
        errorMessage: 'Failed to send verification code. Please try again.',
        onSuccess: jasmine.any(Function),
        onError: jasmine.any(Function)
      });
    });

    it('should navigate to verify-otp page on successful submission', async () => {
      spyOn(component as any, 'executeMutation').and.callFake((options: any) => {
        options.onSuccess();
      });

      await component.onSubmit();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/verify-otp']);
    });

    it('should set backend errors on submission failure', async () => {
      const testErrors = ['Error 1', 'Error 2'];
      
      // Create a new spy for ErrorService with the test errors
      Object.defineProperty(errorServiceSpy, 'errors', {
        get: () => testErrors
      });
      
      spyOn(component as any, 'executeMutation').and.callFake((options: any) => {
        options.onError(new Error('Test error'));
      });

      await component.onSubmit();
      fixture.detectChanges();

      expect(component.backendErrors).toEqual(testErrors);
    });
  });
}); 
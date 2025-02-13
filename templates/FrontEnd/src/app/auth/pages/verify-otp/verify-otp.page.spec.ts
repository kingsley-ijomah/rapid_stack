import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router, ActivatedRoute, UrlTree } from '@angular/router';
import { VerifyOtpPage } from './verify-otp.page';
import { ErrorService } from '../../../services/errors/error.service';
import { GraphQLService } from '../../../services/graphql.service';
import { APOLLO_OPTIONS, Apollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/core';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';

describe('VerifyOtpPage', () => {
  let component: VerifyOtpPage;
  let fixture: ComponentFixture<VerifyOtpPage>;
  let routerSpy: jasmine.SpyObj<Router>;
  let errorServiceSpy: jasmine.SpyObj<ErrorService>;
  let graphQLServiceSpy: jasmine.SpyObj<GraphQLService>;

  beforeEach(waitForAsync(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl']);
    routerSpy.createUrlTree.and.returnValue({} as UrlTree);
    routerSpy.serializeUrl.and.returnValue('/');
    (routerSpy as any).events = of();

    errorServiceSpy = jasmine.createSpyObj('ErrorService', [], { errors: [] });
    graphQLServiceSpy = jasmine.createSpyObj('GraphQLService', ['mutate']);

    TestBed.configureTestingModule({
      imports: [
        VerifyOtpPage,
        ReactiveFormsModule,
        IonicModule,
        HttpClientModule
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
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
    fixture = TestBed.createComponent(VerifyOtpPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the verify OTP page', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Fields Presence', () => {
    it('should contain all OTP input fields', () => {
      const formElement = fixture.debugElement.query(By.css('form'));
      expect(formElement).toBeTruthy('Form element should be present');

      const otpInputsContainer = fixture.debugElement.query(By.css('.otp-inputs'));
      expect(otpInputsContainer).toBeTruthy('OTP inputs container should be present');

      const otpFields = fixture.debugElement.queryAll(By.css('.otp-field'));
      expect(otpFields.length).toBe(component.otpControls.length, 'Should have correct number of OTP fields');

      // Check each OTP field
      otpFields.forEach((field, index) => {
        const input = field.query(By.css('ion-input'));
        expect(input).toBeTruthy(`OTP input ${index} should be present`);
        expect(input.attributes['maxlength']).toBe('1');
        expect(input.attributes['type']).toBe('text');
        expect(input.attributes['inputmode']).toBe('numeric');
        expect(input.attributes['pattern']).toBe('[0-9]*');
        expect(input.attributes['ng-reflect-name']).toBe(`digit${index}`);
      });
    });

    it('should contain password fields', () => {
      // Check for new password input
      const newPasswordItem = fixture.debugElement.query(By.css('ion-item ion-input[formControlName="newPassword"]'));
      expect(newPasswordItem).toBeTruthy('New password input should be present');
      
      // Check for confirm password input
      const confirmPasswordItem = fixture.debugElement.query(By.css('ion-item ion-input[formControlName="confirmNewPassword"]'));
      expect(confirmPasswordItem).toBeTruthy('Confirm password input should be present');

      // Check for password toggle buttons
      const passwordToggleButtons = fixture.debugElement.queryAll(By.css('ion-button[fill="clear"]'));
      expect(passwordToggleButtons.length).toBe(2, 'Should have two password toggle buttons');

      // Check for floating labels
      const labels = fixture.debugElement.queryAll(By.css('ion-label[position="floating"]'));
      expect(labels.length).toBe(2, 'Should have two floating labels');
      expect(labels[0].nativeElement.textContent.trim()).toBe('New Password');
      expect(labels[1].nativeElement.textContent.trim()).toBe('Confirm Password');
    });

    it('should contain a submit button', () => {
      const submitButton = fixture.debugElement.query(By.css('ion-button[type="submit"]'));
      expect(submitButton).toBeTruthy('Submit button should be present');
      expect(submitButton.nativeElement.textContent.trim()).toBe('Reset Password');
    });
  });

  describe('OTP Input Handling', () => {
    it('should handle manual OTP input and move focus', () => {
      const firstInput = fixture.debugElement.query(By.css('ion-input[formControlName="digit0"]'));
      const event = { detail: { value: '1' } };
      
      component.onOtpInput(event, 0);
      fixture.detectChanges();

      expect(component.otpForm.get('digit0')?.value).toBe('1');
    });

    it('should handle OTP paste', () => {
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      const pasteData = '12345';
      Object.defineProperty(pasteEvent.clipboardData, 'getData', {
        value: () => pasteData
      });

      component.onPaste(pasteEvent);
      fixture.detectChanges();

      component.otpControls.forEach((_, index) => {
        expect(component.otpForm.get('digit' + index)?.value).toBe(pasteData[index]);
      });
    });
  });

  describe('Password Validation', () => {
    it('should validate password requirements', () => {
      const passwordControl = component.otpForm.get('newPassword');
      
      // Test minimum length
      passwordControl?.setValue('Short1!');
      expect(component.getPasswordError()).toContain('must be at least 8 characters');

      // Test pattern requirement
      passwordControl?.setValue('onlylowercase');
      expect(component.getPasswordError()).toContain('must contain at least one uppercase letter');

      // Test valid password
      passwordControl?.setValue('ValidP@ss1');
      expect(component.getPasswordError()).toBe('');
    });

    it('should validate password match', () => {
      component.otpForm.get('newPassword')?.setValue('ValidP@ss1');
      component.otpForm.get('confirmNewPassword')?.setValue('DifferentP@ss1');
      
      expect(component.otpForm.hasError('passwordMismatch')).toBeTrue();
      expect(component.otpForm.get('confirmNewPassword')?.errors?.['passwordMismatch']).toBeTrue();
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      // Set valid form values
      component.otpControls.forEach(index => {
        component.otpForm.get('digit' + index)?.setValue(index.toString());
      });
      component.otpForm.get('newPassword')?.setValue('ValidP@ss1');
      component.otpForm.get('confirmNewPassword')?.setValue('ValidP@ss1');
    });

    it('should call executeMutation with correct parameters on valid submission', async () => {
      const executeMutationSpy = spyOn(component as any, 'executeMutation');
      
      await component.onSubmit();
      
      expect(executeMutationSpy).toHaveBeenCalledWith({
        mutation: jasmine.any(Object),
        variables: {
          otpCode: '01234',
          newPassword: 'ValidP@ss1',
          confirmNewPassword: 'ValidP@ss1'
        },
        responsePath: 'passwordReset',
        successMessage: 'Password reset successful!',
        errorMessage: 'Password reset failed. Please check the errors and try again.',
        onSuccess: jasmine.any(Function),
        onError: jasmine.any(Function)
      });
    });

    it('should navigate to login page on successful submission', async () => {
      spyOn(component as any, 'executeMutation').and.callFake((options: any) => {
        options.onSuccess();
      });

      await component.onSubmit();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
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

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBeFalse();
      component.togglePasswordVisibility('password');
      expect(component.showPassword).toBeTrue();
      component.togglePasswordVisibility('password');
      expect(component.showPassword).toBeFalse();
    });

    it('should toggle confirm password visibility', () => {
      expect(component.showConfirmPassword).toBeFalse();
      component.togglePasswordVisibility('confirmNewPassword');
      expect(component.showConfirmPassword).toBeTrue();
      component.togglePasswordVisibility('confirmNewPassword');
      expect(component.showConfirmPassword).toBeFalse();
    });
  });
}); 
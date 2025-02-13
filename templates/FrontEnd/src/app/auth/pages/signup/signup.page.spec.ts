import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router, ActivatedRoute, UrlTree } from '@angular/router';
import { SignupPage } from './signup.page';
import { APOLLO_OPTIONS } from 'apollo-angular';
import { GraphQLService } from '../../../services/graphql.service';
import { ToastService } from '../../../services/ui/toast.service';
import { ErrorService } from '../../../services/errors/error.service';
import { NavController } from '@ionic/angular/standalone';
import { InMemoryCache } from '@apollo/client/core';
import { HttpLink } from 'apollo-angular/http';
import { of } from 'rxjs';

describe('SignupPage', () => {
  let component: SignupPage;
  let fixture: ComponentFixture<SignupPage>;
  let routerSpy: jasmine.SpyObj<Router>;
  let graphQLServiceSpy: jasmine.SpyObj<GraphQLService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let errorServiceSpy: jasmine.SpyObj<ErrorService>;
  let navControllerSpy: jasmine.SpyObj<NavController>;

  beforeEach(waitForAsync(() => {
    // Create a router spy with methods: navigate, createUrlTree, and serializeUrl.
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl']);
    // Stub createUrlTree to return a dummy UrlTree.
    routerSpy.createUrlTree.and.returnValue({} as UrlTree);
    // Stub serializeUrl to return a dummy URL string.
    routerSpy.serializeUrl.and.returnValue('/');
    // Add an 'events' observable so RouterLink can subscribe.
    (routerSpy as any).events = of();

    graphQLServiceSpy = jasmine.createSpyObj('GraphQLService', ['mutate']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['showToast']);
    // Stub the errors property on ErrorService as needed.
    errorServiceSpy = jasmine.createSpyObj('ErrorService', [], { errors: [] });
    navControllerSpy = jasmine.createSpyObj('NavController', ['navigateForward', 'navigateRoot']);

    TestBed.configureTestingModule({
      imports: [
        SignupPage,
        ReactiveFormsModule,
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: GraphQLService, useValue: graphQLServiceSpy },
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
        },
        {
          provide: APOLLO_OPTIONS,
          useFactory: (httpLink: HttpLink) => ({
            cache: new InMemoryCache(),
            link: httpLink.create({ uri: 'http://localhost:3000/graphql' })
          }),
          deps: [HttpLink]
        }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SignupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the signup page', () => {
    expect(component).toBeTruthy();
  });

  it('should not execute mutation when the form is invalid', () => {
    // Cast component to any to spy on the protected method executeMutation.
    const executeMutationSpy = spyOn(component as any, 'executeMutation');

    // Submit the form with empty (invalid) values.
    component.onSubmit();
    fixture.detectChanges();

    // The form should be invalid so executeMutation should not be called.
    expect(component.signupForm.valid).toBeFalse();
    expect(executeMutationSpy).not.toHaveBeenCalled();
  });

  it('should flag a password mismatch error when passwords do not match', () => {
    const form = component.signupForm;
    form.controls['fullName'].setValue('Test User');
    form.controls['email'].setValue('test@example.com');
    form.controls['password'].setValue('Password1!');
    form.controls['passwordConfirmation'].setValue('Different1!');
    form.controls['telephone'].setValue('1234567890');
    form.controls['acceptTerms'].setValue(true);

    component.onSubmit();
    fixture.detectChanges();

    const passConfirmErrors = form.controls['passwordConfirmation'].errors || {};
    expect(passConfirmErrors['passwordMismatch']).toBeTrue();

    // Check that the error message is rendered.
    const errorEl = fixture.debugElement.query(By.css('.error-message'));
    expect(errorEl.nativeElement.textContent).toContain('Passwords do not match');
  });

  it('should call executeMutation and navigate on valid submission', () => {
    const executeMutationSpy = spyOn(component as any, 'executeMutation').and.callFake((options: any) => {
      if (options.onSuccess) {
        options.onSuccess({});
      }
    });

    const form = component.signupForm;
    form.controls['fullName'].setValue('Valid User');
    form.controls['email'].setValue('valid@example.com');
    form.controls['password'].setValue('Valid1@');
    form.controls['passwordConfirmation'].setValue('Valid1@');
    form.controls['telephone'].setValue('9876543210');
    form.controls['acceptTerms'].setValue(true);

    expect(form.valid).toBeTrue();

    component.onSubmit();
    fixture.detectChanges();

    expect(executeMutationSpy).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  describe('Field Validations', () => {
    beforeEach(() => {
      // Mark the form as submitted to trigger error messages.
      component.isSubmitted = true;
    });

    it('should return error for empty fullName', () => {
      component.signupForm.controls['fullName'].setValue('');
      fixture.detectChanges();
      const errorMsg = component.getErrorMessage('fullName');
      expect(errorMsg).toEqual('fullName is required');
    });

    it('should return error for fullName shorter than 2 characters', () => {
      component.signupForm.controls['fullName'].setValue('A');
      fixture.detectChanges();
      const errorMsg = component.getErrorMessage('fullName');
      expect(errorMsg).toEqual('fullName must be at least 2 characters');
    });

    it('should return error for empty email', () => {
      component.signupForm.controls['email'].setValue('');
      fixture.detectChanges();
      const errorMsg = component.getErrorMessage('email');
      expect(errorMsg).toEqual('email is required');
    });

    it('should return error for invalid email format', () => {
      component.signupForm.controls['email'].setValue('invalidEmail');
      fixture.detectChanges();
      const errorMsg = component.getErrorMessage('email');
      expect(errorMsg).toEqual('Please enter a valid email');
    });

    it('should return error for empty password', () => {
      component.signupForm.controls['password'].setValue('');
      fixture.detectChanges();
      const errorMsg = component.getErrorMessage('password');
      expect(errorMsg).toEqual('password is required');
    });

    it('should return error for password shorter than 6 characters', () => {
      component.signupForm.controls['password'].setValue('Ab1@');
      fixture.detectChanges();
      const errorMsg = component.getErrorMessage('password');
      expect(errorMsg).toEqual('password must be at least 6 characters');
    });

    it('should return error for password that does not meet pattern requirements', () => {
      // A valid length password but lacking a digit and special character.
      component.signupForm.controls['password'].setValue('abcdef');
      fixture.detectChanges();
      const errorMsg = component.getErrorMessage('password');
      expect(errorMsg).toEqual('Please enter a valid phone number');
    });

    it('should return error for empty telephone', () => {
      component.signupForm.controls['telephone'].setValue('');
      fixture.detectChanges();
      const errorMsg = component.getErrorMessage('telephone');
      expect(errorMsg).toEqual('telephone is required');
    });

    it('should return error for telephone that does not match pattern', () => {
      component.signupForm.controls['telephone'].setValue('abc123');
      fixture.detectChanges();
      const errorMsg = component.getErrorMessage('telephone');
      expect(errorMsg).toEqual('Please enter a valid phone number');
    });

    it('should have errors when acceptTerms is false', () => {
      component.signupForm.controls['acceptTerms'].setValue(false);
      fixture.detectChanges();
      const controlErrors = component.signupForm.controls['acceptTerms'].errors;
      expect(controlErrors).toBeTruthy();
    });
  });

  describe('Link Checks', () => {
    it('should have a login link pointing to /login', () => {
      // Query the login link using the data-testid attribute.
      const loginLinkDe = fixture.debugElement.query(By.css('[data-testid="login-link"]'));
      expect(loginLinkDe).toBeTruthy();
      // Depending on the Angular version and build mode, the routerLink may appear as an attribute called 'ng-reflect-router-link'
      const routerLinkAttr = loginLinkDe.attributes['ng-reflect-router-link'] || loginLinkDe.nativeElement.getAttribute('routerLink');
      expect(routerLinkAttr).toEqual('/login');
      // Optionally, verify the link text.
      expect(loginLinkDe.nativeElement.textContent.trim()).toEqual('Login');
    });

    it('should have a terms and conditions link pointing to /terms', () => {
      const termsLinkDe = fixture.debugElement.query(By.css('[data-testid="terms-link"]'));
      expect(termsLinkDe).toBeTruthy();
      const routerLinkAttr = termsLinkDe.attributes['ng-reflect-router-link'] || termsLinkDe.nativeElement.getAttribute('routerLink');
      expect(routerLinkAttr).toEqual('/terms');
      expect(termsLinkDe.nativeElement.textContent.trim()).toEqual('Terms and Conditions');
    });
  });

  describe('Form Fields Presence', () => {
    it('should contain all required form fields', () => {
      const formElement = fixture.debugElement.query(By.css('form'));
      expect(formElement).toBeTruthy('Form element should be present');

      // Check for fullName input
      const fullNameInput = fixture.debugElement.query(By.css('ion-input[formControlName="fullName"]'));
      expect(fullNameInput).toBeTruthy('Full Name input should be present');
      expect(fullNameInput.attributes['placeholder']).toBe('Full Name');
      expect(fullNameInput.attributes['type']).toBe('text');

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

      // Check for password confirmation input
      const passwordConfirmInput = fixture.debugElement.query(By.css('ion-input[formControlName="passwordConfirmation"]'));
      expect(passwordConfirmInput).toBeTruthy('Password confirmation input should be present');
      expect(passwordConfirmInput.attributes['placeholder']).toBe('Confirm Password');
      expect(passwordConfirmInput.attributes['type']).toBe('password');

      // Check for telephone input
      const telephoneInput = fixture.debugElement.query(By.css('ion-input[formControlName="telephone"]'));
      expect(telephoneInput).toBeTruthy('Telephone input should be present');
      expect(telephoneInput.attributes['placeholder']).toBe('Phone Number');
      expect(telephoneInput.attributes['type']).toBe('tel');
    });

    it('should contain terms and conditions checkbox with correct label', () => {
      const checkbox = fixture.debugElement.query(By.css('ion-checkbox[formControlName="acceptTerms"]'));
      expect(checkbox).toBeTruthy('Terms checkbox should be present');

      const checkboxContainer = fixture.debugElement.query(By.css('.terms-checkbox'));
      expect(checkboxContainer).toBeTruthy('Terms checkbox container should be present');

      const label = checkboxContainer.query(By.css('ion-label'));
      expect(label).toBeTruthy('Checkbox should have a label');
      expect(label.nativeElement.textContent).toContain('I accept the Terms and Conditions');
    });

    it('should contain a submit button', () => {
      const submitButton = fixture.debugElement.query(By.css('ion-button[type="submit"]'));
      expect(submitButton).toBeTruthy('Submit button should be present');
      expect(submitButton.nativeElement.textContent.trim()).toBe('Sign Up');
    });

    it('should show error messages container when there are backend errors', () => {
      // Simulate backend errors
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
});

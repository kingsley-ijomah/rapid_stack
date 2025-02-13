import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SignUpMutation } from '../../../graphql/mutations/auth/signUp.mutation';
import { Router } from '@angular/router';
import { BaseGraphQLPage } from '../../../shared/base/base-graphql.page';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonInput,
  IonCheckbox,
  IonItem,
  IonLabel,
  IonText,
  IonButtons,
  IonBackButton,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonInput,
    IonCheckbox,
    IonItem,
    IonLabel,
    IonText,
    IonButtons,
    IonBackButton
  ]
})
export class SignupPage extends BaseGraphQLPage implements OnInit {
  signupForm: FormGroup;
  isSubmitted = false;
  backendErrors: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    super();
    this.signupForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,}$/)
      ]],
      passwordConfirmation: ['', [Validators.required]],
      telephone: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit() {}

  // Custom validator for password match
  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const passwordConfirmation = form.get('passwordConfirmation');

    if (password && passwordConfirmation && password.value !== passwordConfirmation.value) {
      passwordConfirmation.setErrors({ passwordMismatch: true });
    } else {
      passwordConfirmation?.setErrors(null);
    }
  }

  // Getter for easy access to form fields in the template
  get f() {
    return this.signupForm.controls;
  }

  async onSubmit() {
    this.isSubmitted = true;
    this.backendErrors = [];

    if (this.signupForm.valid) {
      const signupData = this.signupForm.value;
      
      this.executeMutation({
        mutation: SignUpMutation,
        variables: {
          fullName: signupData.fullName,
          email: signupData.email,
          password: signupData.password,
          passwordConfirmation: signupData.passwordConfirmation,
          telephone: signupData.telephone,
          acceptTerms: signupData.acceptTerms
        },
        responsePath: 'signUp',
        successMessage: 'Sign up successful!',
        errorMessage: 'Sign up failed. Please check the errors and try again.',
        onSuccess: () => this.router.navigate(['/login']),
        onError: (error) => this.backendErrors = this.errorService.errors
      });
    }
  }

  // Helper method to get error message
  getErrorMessage(control: string): string {
    if (!this.isSubmitted) return '';

    const formControl = this.f[control];
    if (!formControl || !formControl.errors) return '';

    if (formControl.errors['required']) return `${control} is required`;
    if (formControl.errors['email']) return 'Please enter a valid email';
    if (formControl.errors['minlength']) {
      const minLength = formControl.errors['minlength'].requiredLength;
      return `${control} must be at least ${minLength} characters`;
    }
    if (formControl.errors['pattern']) return 'Please enter a valid phone number';
    if (formControl.errors['passwordMismatch']) return 'Passwords do not match';

    return '';
  }
} 
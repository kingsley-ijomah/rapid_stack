import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { OtpRequestMutation } from '../../../graphql/mutations/auth/otpRequest.mutation';
import { BaseGraphQLPage } from '../../../shared/base/base-graphql.page';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonText,
  IonButtons,
  IonBackButton,
  ToastController
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
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
    IonItem,
    IonLabel,
    IonText,
    IonButtons,
    IonBackButton
  ]
})
export class ForgotPasswordPage extends BaseGraphQLPage implements OnInit {
  forgotPasswordForm: FormGroup;
  isSubmitted = false;
  backendErrors: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private toastController: ToastController,
    private router: Router
  ) {
    super();
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {}

  // Getter for easy access to form fields in the template
  get f() {
    return this.forgotPasswordForm.controls;
  }

  async onSubmit() {
    this.isSubmitted = true;
    this.backendErrors = [];

    if (this.forgotPasswordForm.invalid) {
      return;
    }

    const { email } = this.forgotPasswordForm.value;

    this.executeMutation({
      mutation: OtpRequestMutation,
      variables: { email },
      responsePath: 'otpRequest',
      successMessage: 'A verification code has been sent to your email!',
      errorMessage: 'Failed to send verification code. Please try again.',
      onSuccess: () => this.router.navigate(['/verify-otp']),
      onError: (error) => this.backendErrors = this.errorService.errors
    });
  }

  // Helper method to get error message
  getErrorMessage(control: string): string {
    if (!this.isSubmitted) return '';

    const formControl = this.f[control];
    if (!formControl || !formControl.errors) return '';

    if (formControl.errors['required']) return `Email is required`;
    if (formControl.errors['email']) return 'Please enter a valid email';

    return '';
  }
} 
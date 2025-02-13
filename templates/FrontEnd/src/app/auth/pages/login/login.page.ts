import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ErrorService } from '../../../services/errors/error.service';
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
} from '@ionic/angular/standalone';
import { forkJoin } from 'rxjs';

interface SignInResponse {
  data: {
    id: string;
    fullName: string;
    email: string;
    telephone: string;
    role: string;
  };
  token: string;
  message: string;
  errors: string[];
  httpStatus: number;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  isSubmitted = false;
  backendErrors: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private destroyRef: DestroyRef,
    private errorService: ErrorService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit() {}

  // Getter for easy access to form fields in the template
  get f() {
    return this.loginForm.controls;
  }

  async onSubmit() {
    this.isSubmitted = true;
    this.backendErrors = [];

    if (this.loginForm.valid) {
      const loginData = this.loginForm.value;

      this.authService.signIn(loginData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loginForm.reset();
          this.backendErrors = [];
          this.navigateToDashboard();
        },
        error: () => {
          this.backendErrors = this.errorService.errors;
        }
      });
    }
  }

  private navigateToDashboard(): void {
    // subscribe to forkJoin to get the results of multiple observables
    // better than using nested subscriptions
    forkJoin({
      isAdmin: this.authService.isAdmin(),
      isOwner: this.authService.isOwner(),
      isGuest: this.authService.isGuest(),
    }).subscribe(({ isAdmin, isOwner, isGuest }) => {

      if (isOwner) {
        this.router.navigate(['/owner/dashboard']);
        return;
      }

      if (isAdmin) {
        this.router.navigate(['/admin/dashboard']);
        return;
      }

      if (isGuest) {
        this.router.navigate(['/guest/dashboard']);
        return;
      }
  
      this.router.navigate(['/']);  // Fallback if neither admin, platform admin, or guest
    });
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

    return '';
  }
} 
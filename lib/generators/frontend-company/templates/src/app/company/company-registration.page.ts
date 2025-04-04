import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CreateCompanyMutation } from 'src/app/graphql/mutations/company/createCompany.mutation';
import { BaseGraphQLPage } from 'src/app/shared/base/base-graphql.page';
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
  IonSpinner,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-company-registration',
  templateUrl: './company-registration.page.html',
  styleUrls: ['./company-registration.page.scss'],
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
    IonBackButton,
    IonSpinner,
  ],
})
export class CompanyRegistrationPage extends BaseGraphQLPage implements OnInit {
  companyForm: FormGroup;
  isSubmitted = false;
  isLoading = false;
  backendErrors: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    super();
    this.companyForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit() {}

  // Getter for easy access to form fields in the template
  get f() {
    return this.companyForm.controls;
  }

  async onSubmit() {
    this.isSubmitted = true;
    this.backendErrors = [];

    if (this.companyForm.valid) {
      this.isLoading = true;
      const companyData = this.companyForm.value;

      this.executeMutation({
        mutation: CreateCompanyMutation,
        variables: {
          input: {
            name: companyData.name,
          },
        },
        responsePath: 'createCompany',
        successMessage: 'Company registered successfully!',
        errorMessage: 'Company registration failed. Please check the errors and try again.',
        onSuccess: (result: any) => {
          console.log('Company registration result:', result.data.code);
          // After successful company registration, redirect to user registration
          this.router.navigate(['/auth/signup'], { queryParams: { companyCode: result.data.code } });
        },
        onError: (error) => {
          this.backendErrors = this.errorService.errors;
          this.isLoading = false;
        },
      });
    }
  }

  // Helper method to get error message
  getErrorMessage(control: string): string {
    if (!this.isSubmitted) return '';

    const formControl = this.f[control];
    if (!formControl || !formControl.errors) return '';

    if (formControl.errors['required']) return `${control} is required`;
    if (formControl.errors['minlength']) {
      const minLength = formControl.errors['minlength'].requiredLength;
      return `${control} must be at least ${minLength} characters`;
    }

    return '';
  }
} 
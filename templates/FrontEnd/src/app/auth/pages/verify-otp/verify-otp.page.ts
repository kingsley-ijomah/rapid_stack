import { Component, OnInit, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BaseGraphQLPage } from '../../../shared/base/base-graphql.page';
import { PasswordResetMutation } from '../../../graphql/mutations/auth/passwordReset.mutation';
import { addIcons } from 'ionicons';
import { eye, eyeOff } from 'ionicons/icons';

@Component({
  selector: 'app-verify-otp',
  templateUrl: './verify-otp.page.html',
  styleUrls: ['./verify-otp.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class VerifyOtpPage extends BaseGraphQLPage implements OnInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;
  otpForm: FormGroup;
  otpControls: number[] = [0, 1, 2, 3, 4]; // 5-digit OTP
  isSubmitting = false;
  showError = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  backendErrors: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    super();
    addIcons({ eye, eyeOff });
    this.otpForm = this.createForm();
  }

  ngOnInit() {
  }

  private createForm(): FormGroup {
    const group: any = {};
    this.otpControls.forEach(i => {
      group['digit' + i] = ['', [
        Validators.required,
        Validators.pattern('[0-9]'),
        Validators.maxLength(1)
      ]];
    });
    
    group['newPassword'] = ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    ]];
    
    group['confirmNewPassword'] = ['', [Validators.required]];

    const formGroup = this.formBuilder.group(group);
    formGroup.addValidators(this.passwordMatchValidator);
    
    return formGroup;
  }

  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('newPassword');
    const confirmNewPassword = control.get('confirmNewPassword');

    if (password && confirmNewPassword && password.value !== confirmNewPassword.value) {
      confirmNewPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  togglePasswordVisibility(field: 'password' | 'confirmNewPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  getPasswordError(): string {
    const control = this.otpForm.get('newPassword');
    if (control?.errors) {
      if (control.errors['required']) return 'Password is required';
      if (control.errors['minlength']) return 'Password must be at least 8 characters';
      if (control.errors['pattern']) return 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character';
    }
    return '';
  }

  onOtpInput(event: any, index: number) {
    const value = event.detail.value?.toString() || '';
    const sanitizedValue = value.replace(/[^0-9]/g, '').substring(0, 1);
    this.otpForm.get('digit' + index)?.setValue(sanitizedValue);

    // Move focus to the next input when manually entered
    if (sanitizedValue && index < this.otpControls.length - 1) {
      const nextInput = this.otpInputs.toArray()[index + 1]?.nativeElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    if (!event.clipboardData) return;

    const pastedText = event.clipboardData.getData('text');
    const numbers = pastedText.replace(/[^0-9]/g, '').split('');

    this.otpControls.forEach((_, index) => {
      if (numbers[index]) {
        this.otpForm.get('digit' + index)?.setValue(numbers[index]);
      }
    });

    // Focus the next empty field
    for (let i = 0; i < this.otpControls.length; i++) {
      if (!this.otpForm.get('digit' + i)?.value) {
        const input = this.otpInputs.toArray()[i]?.nativeElement;
        if (input) {
          input.focus();
          break;
        }
      }
    }
  }

  async onSubmit() {
    if (this.otpForm.valid && !this.isSubmitting) {
      const otpCode = this.otpControls
        .map(i => this.otpForm.get('digit' + i)?.value)
        .join('');
      
      const otpData = this.otpForm.value;

      this.executeMutation({
        mutation: PasswordResetMutation,
        variables: {
          otpCode,
          newPassword: otpData.newPassword,
          confirmNewPassword: otpData.confirmNewPassword
        },
        responsePath: 'passwordReset',
        successMessage: 'Password reset successful!',
        errorMessage: 'Password reset failed. Please check the errors and try again.',
        onSuccess: () => this.router.navigate(['/login']),
        onError: (error) => this.backendErrors = this.errorService.errors
      });
    }
  }
}

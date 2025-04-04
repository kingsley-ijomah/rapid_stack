import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class ProfilePage implements OnInit {
  ownerProfileForm!: FormGroup;
  dogProfileForm!: FormGroup;
  passwordForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initializeForms();
  }

  private initializeForms() {
    // Owner Profile Form
    this.ownerProfileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required]
    });

    // Dog Profile Form
    this.dogProfileForm = this.fb.group({
      name: ['', Validators.required],
      breed: ['', Validators.required],
      age: ['', [Validators.required, Validators.min(0)]],
    });

    // Password Change Form
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  updateOwnerProfile() {
    if (this.ownerProfileForm.valid) {
      console.log('Owner Profile Update:', this.ownerProfileForm.value);
      // TODO: Implement API call
    }
  }

  updateDogProfile() {
    if (this.dogProfileForm.valid) {
      console.log('Dog Profile Update:', this.dogProfileForm.value);
      // TODO: Implement API call
    }
  }

  updatePassword() {
    if (this.passwordForm.valid) {
      console.log('Password Update:', this.passwordForm.value);
      // TODO: Implement API call
    }
  }
}

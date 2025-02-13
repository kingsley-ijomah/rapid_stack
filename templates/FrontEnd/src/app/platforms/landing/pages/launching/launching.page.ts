import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonItem, IonLabel, IonInput } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-launching',
  templateUrl: './launching.page.html',
  styleUrls: ['./launching.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonButton,
    IonItem,
    IonLabel,
    IonInput,
    CommonModule, 
    FormsModule
  ]
})
export class LaunchingPage implements OnInit {
  @ViewChild('waitlistForm') waitlistForm!: NgForm;
  
  fullName: string = '';
  email: string = '';

  constructor(private toastController: ToastController) {}

  ngOnInit() {}

  async onSubmit() {
    if (this.waitlistForm.valid) {
      // TODO: Implement actual API call to save the waitlist entry
      console.log('Form submitted:', { fullName: this.fullName, email: this.email });
      
      // Show success message
      const toast = await this.toastController.create({
        message: 'Thank you for joining our waiting list! We\'ll notify you when we launch.',
        duration: 3000,
        position: 'bottom',
        color: 'success'
      });
      toast.present();
      
      // Reset form
      this.waitlistForm.resetForm();
    }
  }
}

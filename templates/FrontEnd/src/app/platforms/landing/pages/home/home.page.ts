import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { NgIf } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonCard,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  peopleOutline, 
  calendarOutline, 
  chatbubblesOutline,
  logoFacebook,
  logoTwitter,
  logoInstagram
} from 'ionicons/icons';
import { AuthService } from '../../../../auth/services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    RouterLink,
    NgIf,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonCard,
    IonIcon
  ],
})
export class HomePage implements OnInit {
  isAuthenticated = false;
  appName = environment.appName;
  heroImagePath = environment.assetPaths.heroImage;
  currentYear = environment.companyInfo.year;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ 
      peopleOutline, 
      calendarOutline, 
      chatbubblesOutline,
      logoFacebook,
      logoTwitter,
      logoInstagram
    });
  }

  ngOnInit() {
    // Check authentication status when component initializes
    this.checkAuth();
  }

  private checkAuth() {
    this.authService.isAuthenticated().subscribe(
      (isAuth) => {
        this.isAuthenticated = isAuth;
      }
    );
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}

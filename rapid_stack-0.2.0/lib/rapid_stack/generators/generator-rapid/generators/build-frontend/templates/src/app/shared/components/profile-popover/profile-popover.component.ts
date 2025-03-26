import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, PopoverController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline, settingsOutline, personOutline, appsOutline } from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-profile-popover',
  templateUrl: './profile-popover.component.html',
  styleUrls: ['./profile-popover.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class ProfilePopoverComponent implements OnInit {
  menuItems = [
    {
      text: 'Profile',
      icon: 'person-outline',
      action: () => this.goToProfile()
    },
    {
      text: 'Settings',
      icon: 'settings-outline',
      action: () => this.goToSettings()
    },

    {
      text: 'Portals',
      icon: 'apps-outline',
      action: () => this.goToPortals()
    },
    {
      text: 'Logout',
      icon: 'log-out-outline',
      action: () => this.logout()
    },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private popoverController: PopoverController
  ) {
    addIcons({
      logOutOutline,
      settingsOutline,
      personOutline,
      appsOutline
    });
  }

  ngOnInit() {}

  goToProfile() {
    this.popoverController.dismiss();
    this.router.navigate(['/profile']);
  }

  goToSettings() {
    this.popoverController.dismiss();
    this.router.navigate(['/settings']);
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.popoverController.dismiss();
      this.router.navigate(['/auth/login']);
    });
  }

  goToPortals() {
    this.popoverController.dismiss();
    this.router.navigate(['/']);
  }
}
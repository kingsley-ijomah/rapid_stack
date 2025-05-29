import { Component } from '@angular/core';
import { IonicModule, PopoverController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personCircleOutline } from 'ionicons/icons';
import { ProfilePopoverComponent } from '../profile-popover/profile-popover.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-top-banner',
  templateUrl: './top-banner.component.html',
  styleUrls: ['./top-banner.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class TopBannerComponent {
  companyName = environment.appName;

  constructor(private popoverController: PopoverController) {
    addIcons({ personCircleOutline });
  }

  async showProfilePopover(event: Event) {
    const popover = await this.popoverController.create({
      component: ProfilePopoverComponent,
      event: event,
      alignment: 'end',
      size: 'auto',
      dismissOnSelect: true
    });

    await popover.present();
  }
}
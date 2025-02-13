import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, peopleOutline, walkOutline, chatbubblesOutline } from 'ionicons/icons';
import { TopBannerComponent } from '../../shared/components/top-banner/top-banner.component';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonRouterOutlet,
    TopBannerComponent
  ]
})
export class AdminComponent {
  constructor() {
    addIcons({ 
      homeOutline, 
      peopleOutline, 
      walkOutline, 
      chatbubblesOutline 
    });
  }
}

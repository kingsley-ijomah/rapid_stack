import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, peopleOutline, walkOutline, chatbubblesOutline } from 'ionicons/icons';
import { TopBannerComponent } from '../../shared/components/top-banner/top-banner.component';

@Component({
  selector: 'app-owner',
  templateUrl: './owner.component.html',
  styleUrls: ['./owner.component.scss'],
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
export class OwnerComponent {
  constructor() {
    addIcons({ 
      homeOutline, 
      peopleOutline, 
      walkOutline, 
      chatbubblesOutline 
    });
  }
}

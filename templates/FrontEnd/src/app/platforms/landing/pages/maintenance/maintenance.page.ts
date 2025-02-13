import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { constructOutline, timeOutline, mailOutline } from 'ionicons/icons';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-maintenance',
  templateUrl: './maintenance.page.html',
  styleUrls: ['./maintenance.page.scss'],
  standalone: true,
  imports: [IonContent, IonIcon, CommonModule, FormsModule]
})
export class MaintenancePage implements OnInit {
  supportEmail = environment.supportEmail;

  constructor() {
    addIcons({
      constructOutline,
      timeOutline,
      mailOutline
    });
  }

  ngOnInit() {}
}

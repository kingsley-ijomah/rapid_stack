import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BaseGraphQLPage } from 'src/app/shared/base/base-graphql.page';

@Component({
  selector: 'app-<%= pageName %>',
  templateUrl: './<%= pageName %>.page.html',
  styleUrls: ['./<%= pageName %>.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class <%= pageClassName %> extends BaseGraphQLPage implements OnInit {
  constructor() {
    super();
  }

  ngOnInit() {
    // Add initialization logic here
  }
} 
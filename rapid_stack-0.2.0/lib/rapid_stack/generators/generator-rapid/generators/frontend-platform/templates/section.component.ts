import { Component } from '@angular/core';

@Component({
  selector: 'app-<%= sectionName %>',
  templateUrl: './<%= sectionName %>.component.html',
  styleUrls: ['./<%= sectionName %>.component.scss']
})
export class <%= className %>Component {
  constructor() {}
} 
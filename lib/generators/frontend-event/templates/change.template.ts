export const selectTemplate = `
<ion-item>
  <ion-select
    [(ngModel)]="<%= elementName %>"
    (ionChange)="<%= handlerMethod %>($event)"
    placeholder="Select option"
  >
    <% options.forEach(function(opt) { %>
    <ion-select-option value="<%= opt.toLowerCase() %>"><%= capitalize(opt) %></ion-select-option>
    <% }); %>
  </ion-select>
</ion-item>
<ion-text *ngIf="<%= elementName %>" class="selection-value">
  Selected: {{ <%= elementName %> }}
</ion-text>
`;

export const checkboxTemplate = `
<ion-item>
  <ion-checkbox
    [(ngModel)]="<%= elementName %>"
    (ionChange)="<%= handlerMethod %>($event)"
  >
    Toggle option
  </ion-checkbox>
</ion-item>
<ion-text *ngIf="<%= elementName %>" class="checkbox-value">
  Checked: {{ <%= elementName %> }}
</ion-text>
`;

export const radioTemplate = `
<ion-radio-group
  [(ngModel)]="<%= elementName %>"
  (ionChange)="<%= handlerMethod %>($event)"
>
  <% options.forEach(function(opt) { %>
  <ion-item>
    <ion-radio value="<%= opt.toLowerCase() %>"><%= capitalize(opt) %></ion-radio>
  </ion-item>
  <% }); %>
</ion-radio-group>
<ion-text *ngIf="<%= elementName %>" class="radio-value">
  Selected: {{ <%= elementName %> }}
</ion-text>
`; 
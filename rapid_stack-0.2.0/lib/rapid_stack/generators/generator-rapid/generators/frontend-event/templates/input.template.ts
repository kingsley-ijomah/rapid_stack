export const inputTemplate = `
<ion-item class="<%= inputName %>-container">
  <ion-input
    #<%= inputName %>
    type="<%= inputType %>"
    placeholder="<%= placeholder %>"
    (ionInput)="<%= handlerMethod %>($event)"
    [debounce]="300"
  ></ion-input>
  <ion-note *ngIf="<%= inputName %>?.value" slot="helper">
    Current value: {{ <%= inputName %>.value }}
  </ion-note>
</ion-item>
`; 
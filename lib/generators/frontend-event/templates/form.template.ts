export const formTemplate = `
<div class="<%= formName %>-container">
  <form [formGroup]="<%= formName %>Form" (ngSubmit)="on<%= capitalizedFormName %>Submit()" class="<%= formName %>-form">
    <% fields.forEach(function(field) { %>
    <ion-item class="form-field">
      <ion-input
        type="text"
        formControlName="<%= field %>"
        placeholder="<%= capitalize(field) %>"
        [class.ion-invalid]="<%= formName %>IsSubmitted && <%= formName %>Controls['<%= field %>'].errors"
        [class.ion-touched]="<%= formName %>IsSubmitted && <%= formName %>Controls['<%= field %>'].errors"
      ></ion-input>
    </ion-item>
    <ion-text color="danger" class="error-message" *ngIf="<%= formName %>IsSubmitted && <%= formName %>Controls['<%= field %>'].errors">
      {{ get<%= capitalizedFormName %>ErrorMessage('<%= field %>') }}
    </ion-text>
    <% }); %>

    <!-- Backend Errors -->
    <ion-item lines="none" *ngIf="<%= formName %>BackendErrors?.length" class="status-messages error-messages">
      <ion-text color="danger">
        <ng-container *ngFor="let error of <%= formName %>BackendErrors">
          <p>{{ error }}</p>
        </ng-container>
      </ion-text>
    </ion-item>

    <ion-button 
      type="submit" 
      expand="block" 
      class="submit-button"
      [disabled]="<%= formName %>Form.invalid && <%= formName %>IsSubmitted"
    >
      Submit
    </ion-button>
  </form>
</div>
`; 
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../interfaces/list-config.interface';

@Component({
  selector: 'app-generic-form-modal',
  templateUrl: './generic-form-modal.component.html',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class GenericFormModalComponent implements OnInit {
  @Input() title: string = '';
  @Input() fields: FormField[] = [];
  @Input() data: any; // For edit mode
  form!: FormGroup; // Using definite assignment assertion

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    const group: { [key: string]: any } = {};
    
    this.fields.forEach(field => {
      const validators = field.required ? [Validators.required] : [];
      if (field.type === 'email') {
        validators.push(Validators.email);
      }
      if (field.validators) {
        validators.push(...field.validators);
      }
      
      group[field.name] = ['', validators];
    });

    this.form = this.formBuilder.group(group);

    if (this.data) {
      this.form.patchValue(this.data);
    }
  }

  isFieldRequired(field: FormField): boolean {
    return field.required === true;
  }

  async dismiss(data?: any) {
    await this.modalController.dismiss(data);
  }

  async onSubmit() {
    if (this.form.valid) {
      await this.dismiss(this.form.value);
    }
  }
} 
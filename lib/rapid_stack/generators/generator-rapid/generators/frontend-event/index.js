const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');

module.exports = class extends Generator {
  // Add this helper method to parse GraphQL operations from Ruby files
  _parseGraphQLOperations(type) {
    const filePath = path.join(process.cwd(), 'backend/app/graphql/types', `${type}_type.rb`);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Parse field definitions using regex
      const fieldRegex = /field\s+:(\w+)/g;
      const operations = [];
      let match;
      
      while ((match = fieldRegex.exec(content)) !== null) {
        operations.push(match[1]);
      }
      
      return operations;
    } catch (error) {
      this.log.error(`Error reading ${type} type file:`, error.message);
      return [];
    }
  }

  // Add this helper method to find and parse mutation/query files
  _findGraphQLOperation(operationType, operationName) {
    const baseDir = path.join(process.cwd(), 'backend/app/graphql', `${operationType}s`);
    const snakeCaseName = operationName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');

    let operationFile = null;

    // Recursive function to find the file
    const findFile = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          const found = findFile(filePath);
          if (found) return found;
        } else if (file === `${snakeCaseName}.rb`) {
          return filePath;
        }
      }
      return null;
    };

    operationFile = findFile(baseDir);

    if (!operationFile) {
      this.log.error(`Could not find ${operationType} file for ${operationName}`);
      return null;
    }

    // Parse the Ruby file to extract arguments
    const content = fs.readFileSync(operationFile, 'utf8');
    const fields = [];
    
    // Updated regex to better match Ruby argument definitions
    const lines = content.split('\n');
    for (const line of lines) {
      // Log the line being processed
      console.log('Processing line:', line);

      const argumentMatch = line.match(/argument\s+:(\w+),\s*(\w+)(?:,\s*required:\s*(true|false))?/);
      if (argumentMatch) {
        console.log('Argument match:', argumentMatch); // Debug log
        
        const field = {
          name: argumentMatch[1],
          type: argumentMatch[2] || 'String', // Default to String if type is not specified
          required: argumentMatch[3] !== 'false' // Default to true if not specified
        };
        
        console.log('Created field:', field); // Debug log
        fields.push(field);
      }
    }

    console.log('All fields found:', fields); // Debug log

    if (fields.length === 0) {
      this.log.error('No fields found in GraphQL operation file');
      return null;
    }

    return fields;
  }

  async prompting() {
    try {
      // Fix the path by using the correct base directory
      const platformsPath = path.join(process.cwd(), '/frontend/src/app/platforms');
      
      // Check if directory exists first
      if (!fs.existsSync(platformsPath)) {
        this.log.error('Platforms directory not found at:', platformsPath);
        return;
      }

      const platforms = fs.readdirSync(platformsPath)
        .filter(file => fs.statSync(path.join(platformsPath, file)).isDirectory());

      if (platforms.length === 0) {
        this.log.error('No platforms found in directory:', platformsPath);
        return;
      }

      // First prompts for event type and platform
      this.answers = await this.prompt([
        {
          type: 'list',
          name: 'eventType',
          message: 'What type of event do you want to add?',
          choices: ['click', 'ngSubmit', 'input', 'change'],
          default: 'click'
        },
        {
          type: 'list',
          name: 'platform',
          message: 'Select the platform:',
          choices: platforms
        }
      ]);

      // Get pages for selected platform
      const pagesPath = path.join(platformsPath, this.answers.platform, 'pages');
      
      if (!fs.existsSync(pagesPath)) {
        this.log.error('Pages directory not found at:', pagesPath);
        return;
      }

      const pages = fs.readdirSync(pagesPath)
        .filter(file => fs.statSync(path.join(pagesPath, file)).isDirectory());

      if (pages.length === 0) {
        this.log.error('No pages found in directory:', pagesPath);
        return;
      }

      // Always prompt for page selection first
      const pageAnswer = await this.prompt([
        {
          type: 'list',
          name: 'page',
          message: 'Select the page:',
          choices: pages
        }
      ]);

      this.answers = { ...this.answers, ...pageAnswer };

      // Then handle event-specific prompts
      if (this.answers.eventType === 'input') {
        const inputAnswers = await this.prompt([
          {
            type: 'input',
            name: 'inputName',
            message: 'Enter the name for your input:',
            default: 'searchInput'
          },
          {
            type: 'list',
            name: 'inputType',
            message: 'What type of input?',
            choices: ['text', 'number', 'email', 'password', 'search'],
            default: 'text'
          },
          {
            type: 'input',
            name: 'placeholder',
            message: 'Enter placeholder text:',
            default: 'Enter text...'
          },
          {
            type: 'input',
            name: 'handlerMethod',
            message: 'Enter the name of the input handler method:',
            default: 'onInputChange'
          }
        ]);
        this.answers = { ...this.answers, ...inputAnswers };
      } else if (this.answers.eventType === 'change') {
        const changeAnswers = await this.prompt([
          {
            type: 'list',
            name: 'elementType',
            message: 'What type of element do you want to add?',
            choices: ['select', 'checkbox', 'radio'],
            default: 'select'
          },
          {
            type: 'input',
            name: 'elementName',
            message: 'Enter the name for your element:',
            default: 'optionSelect'
          },
          {
            type: 'input',
            name: 'handlerMethod',
            message: 'Enter the name of the change handler method:',
            default: 'onSelectionChange'
          }
        ]);

        // If select or radio, ask for options
        if (changeAnswers.elementType === 'select') {
          const optionsAnswer = await this.prompt([
            {
              type: 'input',
              name: 'options',
              message: 'Enter options (comma separated, e.g.: option1,option2):',
              default: 'option1,option2,option3',
              filter: (input) => input.split(',').map(opt => opt.trim()).filter(opt => opt)
            }
          ]);
          this.answers = { ...this.answers, ...changeAnswers, ...optionsAnswer };
        } else if (changeAnswers.elementType === 'radio') {
          const radioAnswer = await this.prompt([
            {
              type: 'input',
              name: 'options',
              message: 'Enter radio options (comma separated, e.g.: option1,option2):',
              default: 'yes,no',
              filter: (input) => input.split(',').map(opt => opt.trim()).filter(opt => opt)
            }
          ]);
          this.answers = { ...this.answers, ...changeAnswers, ...radioAnswer };
        } else {
          this.answers = { ...this.answers, ...changeAnswers };
        }
      } else if (this.answers.eventType === 'ngSubmit') {
        // First get operation type
        const operationTypeAnswer = await this.prompt([
          {
            type: 'list',
            name: 'operationType',
            message: 'What type of GraphQL operation?',
            choices: ['mutation', 'query'],
            default: 'mutation'
          }
        ]);

        this.answers = { ...this.answers, ...operationTypeAnswer };

        // Get available operations based on type
        const operations = this._parseGraphQLOperations(this.answers.operationType);
        
        if (operations.length === 0) {
          this.log.error(`No ${this.answers.operationType}s found in backend GraphQL types`);
          return;
        }

        // Add operation name selection BEFORE trying to find fields
        const operationAnswer = await this.prompt([
          {
            type: 'list',
            name: 'operationName',
            message: `Select the GraphQL ${this.answers.operationType}:`,
            choices: operations,
            default: operations[0]
          }
        ]);

        this.answers = { ...this.answers, ...operationAnswer };

        // Now we can get fields from the GraphQL operation file
        const fields = this._findGraphQLOperation(
          this.answers.operationType, 
          this.answers.operationName
        );

        if (!fields || fields.length === 0) {
          this.log.error('No fields found in GraphQL operation file');
          return;
        }

        // Add console.log to debug the fields
        console.log('Fields from GraphQL:', fields);

        const formAnswers = await this.prompt([
          {
            type: 'input',
            name: 'formName',
            message: 'Enter the name for your form (e.g., login, signup):',
            default: 'myForm'
          }
        ]);

        // Automatically set fields and their types based on the GraphQL operation
        formAnswers.fields = fields.map(f => f.name);
        const fieldTypes = {};
        
        fields.forEach(field => {
          console.log('Processing field:', field); // Debug log

          // Ensure field.type exists and convert to lowercase, default to 'string' if undefined
          const fieldType = (field.type || 'String').toLowerCase();
          
          // Map GraphQL types to form field types
          switch (fieldType) {
            case 'string':
              if (field.name.includes('password')) {
                fieldTypes[field.name] = 'password';
              } else if (field.name.includes('email')) {
                fieldTypes[field.name] = 'email';
              } else if (field.name.includes('phone') || field.name.includes('telephone')) {
                fieldTypes[field.name] = 'tel';
              } else {
                fieldTypes[field.name] = 'text';
              }
              break;
            case 'boolean':
              fieldTypes[field.name] = 'checkbox';
              break;
            case 'integer':
            case 'float':
              fieldTypes[field.name] = 'number';
              break;
            default:
              fieldTypes[field.name] = 'text';
          }
        });

        console.log('Field types:', fieldTypes); // Debug log

        formAnswers.fieldTypes = fieldTypes;

        // Set derived values
        formAnswers.responsePath = formAnswers.operationName;
        formAnswers.successMessage = `${this._capitalize(formAnswers.operationName)} successful!`;
        formAnswers.errorMessage = `${this._capitalize(formAnswers.operationName)} failed. Please check the errors and try again.`;

        this.answers = { ...this.answers, ...formAnswers };

        // Add validations based on required fields
        const fieldValidations = {};
        fields.forEach(field => {
          fieldValidations[field.name] = field.required ? ['required'] : [];
          
          // Add specific validations based on field type
          if (fieldTypes[field.name] === 'email') {
            fieldValidations[field.name].push('email');
          }
          if (field.name === 'password') {
            fieldValidations[field.name].push('minLength');
            fieldValidations[`${field.name}_minLength`] = '6';
          }
        });

        this.answers.fieldValidations = fieldValidations;
      } else {
        // For click events
        const clickAnswer = await this.prompt([
          {
            type: 'input',
            name: 'actionMethod',
            message: 'Enter the name of the click handler method:',
            default: 'handleClick'
          }
        ]);
        this.answers = { ...this.answers, ...clickAnswer };
      }
    } catch (error) {
      this.log.error('Error during prompting:', error.message);
    }
  }

  writing() {
    if (!this.answers) return;

    // Check for duplicates in TS file before making any changes
    const tsPath = path.join(
      process.cwd(),
      'frontend/src/app/platforms',
      this.answers.platform,
      'pages',
      this.answers.page,
      `${this.answers.page}.page.ts`
    );

    if (fs.existsSync(tsPath)) {
      const tsContent = fs.readFileSync(tsPath, 'utf8');
      
      // Check for duplicates based on event type
      if (this.answers.eventType === 'ngSubmit') {
        const formRegex = new RegExp(`\\b${this.answers.formName}Form\\s*:\\s*FormGroup\\b`);
        const submitRegex = new RegExp(`\\bon${this._capitalize(this.answers.formName)}Submit\\s*\\(`);
        if (formRegex.test(tsContent) || submitRegex.test(tsContent)) {
          this.log.error(`Form or submit handler for '${this.answers.formName}' already exists in ${tsPath}`);
          return; // Exit early without making any changes to either file
        }
      } else if (this.answers.eventType === 'input') {
        const handlerRegex = new RegExp(`\\b${this.answers.handlerMethod}\\s*\\(`);
        if (handlerRegex.test(tsContent)) {
          this.log.error(`Input handler '${this.answers.handlerMethod}' already exists in ${tsPath}`);
          return; // Exit early without making any changes to either file
        }
      } else if (this.answers.eventType === 'change') {
        const handlerRegex = new RegExp(`\\b${this.answers.handlerMethod}\\s*\\(`);
        if (handlerRegex.test(tsContent)) {
          this.log.error(`Change handler '${this.answers.handlerMethod}' already exists in ${tsPath}`);
          return; // Exit early without making any changes to either file
        }
      }
    }

    // Only proceed with file modifications if no duplicates were found
    const pagePath = path.join(
      process.cwd(),
      'frontend/src/app/platforms',
      this.answers.platform,
      'pages',
      this.answers.page,
      `${this.answers.page}.page.html`
    );

    if (fs.existsSync(pagePath)) {
      let content = fs.readFileSync(pagePath, 'utf8');
      
      if (this.answers.eventType === 'input') {
        // Create the input template
        const inputTemplate = this._generateInputTemplate();
        
        // Add the input before the closing ion-content tag
        const closingTagIndex = content.lastIndexOf('</ion-content>');
        if (closingTagIndex !== -1) {
          content = 
            content.slice(0, closingTagIndex) + 
            inputTemplate +
            content.slice(closingTagIndex);
          
          fs.writeFileSync(pagePath, content);
          this.log.ok(`Added input to ${pagePath}`);
        }

        // Update the TypeScript file
        this._updateTypeScriptForInput();
      } else if (this.answers.eventType === 'change') {
        // Create the change element template
        const changeTemplate = this._generateChangeTemplate();
        
        // Add the element before the closing ion-content tag
        const closingTagIndex = content.lastIndexOf('</ion-content>');
        if (closingTagIndex !== -1) {
          content = 
            content.slice(0, closingTagIndex) + 
            changeTemplate +
            content.slice(closingTagIndex);
          
          fs.writeFileSync(pagePath, content);
          this.log.ok(`Added ${this.answers.elementType} element to ${pagePath}`);
        }

        // Update the TypeScript file
        this._updateTypeScriptForChange();
      } else if (this.answers.eventType === 'ngSubmit') {
        // Create the form template
        const formTemplate = this._generateFormTemplate();
        
        // Add the form before the closing ion-content tag
        const closingTagIndex = content.lastIndexOf('</ion-content>');
        if (closingTagIndex !== -1) {
          content = 
            content.slice(0, closingTagIndex) + 
            formTemplate +
            content.slice(closingTagIndex);
          
          fs.writeFileSync(pagePath, content);
          this.log.ok(`Added form to ${pagePath}`);
        }

        // Update the TypeScript file
        this._updateTypeScriptForForm();
      } else {
        // Create the event button
        const eventButton = `\n  <button (${this.answers.eventType})="${this.answers.actionMethod}()">Submit</button>\n`;
        
        // Add the button before the closing ion-content tag
        const closingTagIndex = content.lastIndexOf('</ion-content>');
        if (closingTagIndex !== -1) {
          content = 
            content.slice(0, closingTagIndex) + 
            eventButton +
            content.slice(closingTagIndex);
          
          fs.writeFileSync(pagePath, content);
          this.log.ok(`Added event button to ${pagePath}`);
        }

        // Update the TypeScript file to include the method
        const tsPath = pagePath.replace('.html', '.ts');
        if (fs.existsSync(tsPath)) {
          let tsContent = fs.readFileSync(tsPath, 'utf8');
          
          // Add the method before the last closing brace
          const lastBraceIndex = tsContent.lastIndexOf('}');
          if (lastBraceIndex !== -1) {
            const methodCode = `\n  ${this.answers.actionMethod}() {\n    // Add your action logic here\n    console.log('${this.answers.actionMethod} called');\n  }\n`;
            
            tsContent = 
              tsContent.slice(0, lastBraceIndex) +
              methodCode +
              tsContent.slice(lastBraceIndex);
            
            fs.writeFileSync(tsPath, tsContent);
            this.log.ok(`Added event handler to ${tsPath}`);
          }
        }
      }
    } else {
      this.log.error('Page file not found at:', pagePath);
    }
  }

  // ---------------------------
  // FORM-SPECIFIC HELPER METHODS
  // ---------------------------
  _generateFormTemplate() {
    const formName = this.answers.formName;
    const capitalizedFormName = this._capitalize(formName);
    
    const formFields = this.answers.fields.map(field => {
      const fieldType = this.answers.fieldTypes[field];
      let inputElement = '';

      switch (fieldType) {
        case 'password':
          inputElement = `
            <ion-input
              type="password"
              formControlName="${field}"
              placeholder="${this._capitalize(field)}"
              [class.ion-invalid]="${formName}IsSubmitted && ${formName}Controls['${field}'].errors"
              [class.ion-touched]="${formName}IsSubmitted && ${formName}Controls['${field}'].errors"
            ></ion-input>`;
          break;
        case 'select':
          const options = this.answers.fieldTypes[`${field}_options`] || [];
          inputElement = `
          <ion-select formControlName="${field}">
            ${options.map(opt => `<ion-select-option value="${opt}">${this._capitalize(opt)}</ion-select-option>`).join('\n            ')}
          </ion-select>`;
          break;
        case 'radio':
          const radioOptions = this.answers.fieldTypes[`${field}_options`] || [];
          inputElement = `
          <ion-radio-group formControlName="${field}">
            ${radioOptions.map(opt => `
            <ion-item>
              <ion-radio value="${opt}">${this._capitalize(opt)}</ion-radio>
            </ion-item>`).join('')}
          </ion-radio-group>`;
          break;
        case 'checkbox':
          inputElement = `
          <ion-checkbox formControlName="${field}"></ion-checkbox>`;
          break;
        case 'textarea':
          inputElement = `
          <ion-textarea
            formControlName="${field}"
            placeholder="${this._capitalize(field)}"
            [class.ion-invalid]="${formName}IsSubmitted && ${formName}Controls['${field}'].errors"
            [class.ion-touched]="${formName}IsSubmitted && ${formName}Controls['${field}'].errors"
          ></ion-textarea>`;
          break;
        default:
          inputElement = `
          <ion-input
            type="${fieldType}"
            formControlName="${field}"
            placeholder="${this._capitalize(field)}"
            [class.ion-invalid]="${formName}IsSubmitted && ${formName}Controls['${field}'].errors"
            [class.ion-touched]="${formName}IsSubmitted && ${formName}Controls['${field}'].errors"
          ></ion-input>`;
      }

      return `
      <ion-item class="form-field">
        <ion-label position="floating">${this._capitalize(field)}</ion-label>
        ${inputElement}
      </ion-item>
      <ion-text color="danger" class="error-message" *ngIf="${formName}IsSubmitted && ${formName}Controls['${field}'].errors">
        {{ get${capitalizedFormName}ErrorMessage('${field}') }}
      </ion-text>`;
    }).join('\n');

    return `
    <div class="${formName}-container">
      <form [formGroup]="${formName}Form" (ngSubmit)="on${capitalizedFormName}Submit()" class="${formName}-form">
        ${formFields}

        <!-- Backend Errors -->
        <ion-item lines="none" *ngIf="${formName}BackendErrors?.length" class="status-messages error-messages">
          <ion-text color="danger">
            <ng-container *ngFor="let error of ${formName}BackendErrors">
              <p>{{ error }}</p>
            </ng-container>
          </ion-text>
        </ion-item>

        <ion-button 
          type="submit" 
          expand="block" 
          class="submit-button"
          [disabled]="${formName}Form.invalid && ${formName}IsSubmitted"
        >
          Submit
        </ion-button>
      </form>
    </div>`;
  }

  _processTemplate(template, context) {
    // First, handle forEach loops
    template = template.replace(
      /<% fields\.forEach\(function\(field\) { %>([\s\S]*?)<% }\); %>/g,
      (match, fieldTemplate) => {
        return context.fields.map(field => {
          const fieldType = context.fieldTypes[field] || 'text';
          return fieldTemplate
            .replace(/<%= field %>/g, field)
            .replace(/<%= capitalize\(field\) %>/g, this._capitalize(field))
            .replace(/type="text"/g, fieldType === 'password' ? 'type="password"' : `type="${fieldType}"`);
        }).join('\n');
      }
    );

    // Then handle simple variable replacements
    return template.replace(/<%= ([^%>]+) %>/g, (match, variable) => {
      const value = variable.split('.').reduce((obj, key) => obj?.[key], context);
      return value !== undefined ? value : '';
    });
  }

  _generateInlineFormTemplate() {
    const formName = this.answers.formName;
    const capitalizedFormName = this._capitalize(formName);
    
    const formFields = this.answers.fields.map(field => {
      const fieldType = this.answers.fieldTypes[field];
      let inputElement = '';

      switch (fieldType) {
        case 'select':
          const options = this.answers.fieldTypes[`${field}_options`] || [];
          inputElement = `
          <ion-select formControlName="${field}">
            ${options.map(opt => `<ion-select-option value="${opt}">${this._capitalize(opt)}</ion-select-option>`).join('\n            ')}
          </ion-select>`;
          break;
        case 'radio':
          const radioOptions = this.answers.fieldTypes[`${field}_options`] || [];
          inputElement = `
          <ion-radio-group formControlName="${field}">
            ${radioOptions.map(opt => `
            <ion-item>
              <ion-radio value="${opt}">${this._capitalize(opt)}</ion-radio>
            </ion-item>`).join('')}
          </ion-radio-group>`;
          break;
        case 'checkbox':
          inputElement = `
          <ion-checkbox formControlName="${field}"></ion-checkbox>`;
          break;
        case 'textarea':
          inputElement = `
          <ion-textarea
            formControlName="${field}"
            placeholder="${this._capitalize(field)}"
            [class.ion-invalid]="${formName}IsSubmitted && ${formName}Controls['${field}'].errors"
            [class.ion-touched]="${formName}IsSubmitted && ${formName}Controls['${field}'].errors"
          ></ion-textarea>`;
          break;
        default:
          inputElement = `
          <ion-input
            type="${fieldType}"
            formControlName="${field}"
            placeholder="${this._capitalize(field)}"
            [class.ion-invalid]="${formName}IsSubmitted && ${formName}Controls['${field}'].errors"
            [class.ion-touched]="${formName}IsSubmitted && ${formName}Controls['${field}'].errors"
          ></ion-input>`;
      }

      return `
      <ion-item class="form-field">
        <ion-label position="floating">${this._capitalize(field)}</ion-label>
        ${inputElement}
      </ion-item>
      <ion-text color="danger" class="error-message" *ngIf="${formName}IsSubmitted && ${formName}Controls['${field}'].errors">
        {{ get${capitalizedFormName}ErrorMessage('${field}') }}
      </ion-text>`;
    }).join('\n');

    return `
    <div class="${formName}-container">
      <form [formGroup]="${formName}Form" (ngSubmit)="on${capitalizedFormName}Submit()" class="${formName}-form">
        ${formFields}

        <!-- Backend Errors -->
        <ion-item lines="none" *ngIf="${formName}BackendErrors?.length" class="status-messages error-messages">
          <ion-text color="danger">
            <ng-container *ngFor="let error of ${formName}BackendErrors">
              <p>{{ error }}</p>
            </ng-container>
          </ion-text>
        </ion-item>

        <ion-button 
          type="submit" 
          expand="block" 
          class="submit-button"
          [disabled]="${formName}Form.invalid && ${formName}IsSubmitted"
        >
          Submit
        </ion-button>
      </form>
    </div>`;
  }

  _updateTypeScriptForForm() {
    const tsPath = path.join(
      process.cwd(),
      'frontend/src/app/platforms',
      this.answers.platform,
      'pages',
      this.answers.page,
      `${this.answers.page}.page.ts`
    );

    if (fs.existsSync(tsPath)) {
      let tsContent = fs.readFileSync(tsPath, 'utf8');
      const formName = this.answers.formName;
      const capitalizedFormName = this._capitalize(formName);

      // 1. Add required imports if they don't exist
      const requiredImports = [
        `import { FormBuilder, FormGroup, Validators } from '@angular/forms';`,
        `import { ReactiveFormsModule } from '@angular/forms';`
      ];
      let importSection = '';
      requiredImports.forEach(imp => {
        if (!tsContent.includes(imp)) {
          importSection += imp + '\n';
        }
      });

      if (importSection) {
        // Add imports after the last existing import
        const lastImportIndex = tsContent.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
          // Insert after the semicolon of the last import
          const semicolonIndex = tsContent.indexOf(';', lastImportIndex);
          if (semicolonIndex !== -1) {
            tsContent = 
              tsContent.slice(0, semicolonIndex + 1) +
              '\n' + importSection +
              tsContent.slice(semicolonIndex + 1);
          }
        } else {
          // No import statements found; just prepend them
          tsContent = importSection + '\n' + tsContent;
        }
      }

      // 2. Ensure ReactiveFormsModule is in the @Component imports array
      const componentMatch = tsContent.match(/@Component\(\{\s*([\s\S]*?)\}\)/);
      if (componentMatch) {
        const existingComponentBlock = componentMatch[1];
        const importsArrayMatch = existingComponentBlock.match(/imports\s*:\s*\[([\s\S]*?)\]/);

        if (importsArrayMatch) {
          const existingImports = importsArrayMatch[1].trim();
          if (!existingImports.includes('ReactiveFormsModule')) {
            const newImports = existingImports ? existingImports + ', ReactiveFormsModule' : 'ReactiveFormsModule';
            const updatedImportsBlock = `imports: [${newImports}]`;
            const updatedComponentBlock = existingComponentBlock.replace(importsArrayMatch[0], updatedImportsBlock);
            tsContent = tsContent.replace(componentMatch[0], `@Component({${updatedComponentBlock}})`);
          }
        } else {
          // No 'imports' array in the @Component, so add one
          const updatedComponent = componentMatch[0].replace(
            /@Component\(\{\s*/,
            `@Component({\n  imports: [ReactiveFormsModule],\n  `
          );
          tsContent = tsContent.replace(componentMatch[0], updatedComponent);
        }
      }

      // 3. Modify (or add) the constructor so it initializes the new form
      tsContent = this._modifyConstructorForForm(tsContent, formName);

      // 4. Add the form properties and methods (below the constructor, above the last brace)
      const lastBraceIndex = tsContent.lastIndexOf('}');
      if (lastBraceIndex !== -1) {
        // We only add these if they don't already exist
        const formCodeSignature = `// ${capitalizedFormName} form properties and methods`;
        if (!tsContent.includes(formCodeSignature)) {
          const formCode = `
  // Common properties
  backendErrors: string[] = [];

  ${formCodeSignature}
  ${formName}Form!: FormGroup;
  ${formName}IsSubmitted = false;
  ${formName}BackendErrors: string[] = [];

  get ${formName}Controls() {
    return this.${formName}Form.controls;
  }

  get${capitalizedFormName}ErrorMessage(control: string): string {
    if (!this.${formName}IsSubmitted) return '';

    const formControl = this.${formName}Controls[control];
    if (!formControl || !formControl.errors) return '';

    ${this._generateErrorMessages()}

    return '';
  }

  async on${capitalizedFormName}Submit() {
    this.${formName}IsSubmitted = true;
    this.${formName}BackendErrors = [];

    if (this.${formName}Form.valid) {
      const formData = this.${formName}Form.value;
      
      this.execute${this.answers.operationType === 'mutation' ? 'Mutation' : 'Query'}({
        ${this.answers.operationType}: ${this._capitalize(this.answers.operationName)}${this._capitalize(this.answers.operationType)},
        variables: {
          ${this.answers.fields.map(field => `${field}: formData.${field}`).join(',\n          ')}
        },
        responsePath: '${this.answers.operationName}',
        successMessage: '${this.answers.successMessage}',
        errorMessage: '${this.answers.errorMessage}',
        onSuccess: () => {
          // Add success navigation logic here
          console.log('Operation successful');
        },
        onError: (error) => this.backendErrors = this.errorService.errors
      });
    }
  }
`;
          tsContent = 
            tsContent.slice(0, lastBraceIndex) +
            formCode +
            '\n' +
            tsContent.slice(lastBraceIndex);
        }
      }

      // Before generating the GraphQL operation file, create the proper field objects
      const fieldObjects = this.answers.fields.map(fieldName => ({
        name: fieldName,
        type: this.answers.fieldTypes[fieldName],
        required: this.answers.fieldValidations[fieldName]?.includes('required') || false
      }));

      // Generate the GraphQL operation file and get import info
      const operationInfo = this._generateGraphQLOperationFile(
        this.answers.operationType,
        this.answers.operationName,
        fieldObjects  // Pass the field objects instead of just field names
      );

      // Add the import statement at the top of the file
      const importStatement = `import { ${operationInfo.operationName} } from '${operationInfo.importPath}';\n`;
      
      // Add import after the last existing import
      const lastImportIndex = tsContent.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const semicolonIndex = tsContent.indexOf(';', lastImportIndex);
        if (semicolonIndex !== -1) {
          tsContent = 
            tsContent.slice(0, semicolonIndex + 1) +
            '\n' + importStatement +
            tsContent.slice(semicolonIndex + 1);
        }
      } else {
        // No imports found, add at the beginning
        tsContent = importStatement + tsContent;
      }

      fs.writeFileSync(tsPath, tsContent);
      this.log.ok(`Updated TypeScript file at ${tsPath}`);
    }
  }

  /**
   * Safely modifies the existing constructor to include the new form initialization,
   * without breaking other forms or parameters.
   */
  _modifyConstructorForForm(tsContent, formName) {
    const formInitSignature = `this.${formName}Form = this.formBuilder.group({`;
    // If we already have this form init in the constructor, do nothing
    if (tsContent.includes(formInitSignature)) {
      return tsContent;
    }

    // Create the new form initialization snippet
    const formInit = `
    this.${formName}Form = this.formBuilder.group({
      ${this._generateFormControls()}
    });`;

    // Find constructor with a more robust regex that handles malformed constructors
    const constructorRegex = /constructor\s*\([^)]*\)\s*{[^}]*}/;
    let match = constructorRegex.exec(tsContent);

    if (!match) {
      // No constructor found, create new one
      const classMatch = tsContent.match(/export class\s+[A-Za-z0-9_]+\s*\{/);
      if (classMatch) {
        const constructorCode = `
  constructor(private formBuilder: FormBuilder) {
    ${formInit.trim()}
  }
`;
        const insertIndex = tsContent.indexOf('{', classMatch.index) + 1;
        return (
          tsContent.slice(0, insertIndex) +
          constructorCode +
          tsContent.slice(insertIndex)
        );
      }
      return tsContent;
    }

    // Fix malformed constructor by removing extra closing braces
    let constructorContent = match[0];
    constructorContent = constructorContent.replace(/}(\s*})+$/, '}');

    // Extract parameters and body
    const paramsMatch = constructorContent.match(/constructor\s*\(([^)]*)\)/);
    let constructorParams = paramsMatch ? paramsMatch[1] : '';
    
    // Add formBuilder if not present
    if (!constructorParams.includes('formBuilder: FormBuilder')) {
      constructorParams = constructorParams.trim();
      constructorParams = constructorParams.length > 0 
        ? `${constructorParams}, private formBuilder: FormBuilder`
        : 'private formBuilder: FormBuilder';
    }

    // Extract and clean up constructor body
    const bodyMatch = constructorContent.match(/{([^}]*)}/);
    let bodyContent = bodyMatch ? bodyMatch[1] : '';

    // Clean up body and add new form init
    let bodyLines = bodyContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (!bodyLines.some(line => line.includes(formInitSignature))) {
      bodyLines.push(formInit.trim());
    }

    // Reconstruct constructor with proper formatting
    const newConstructor = `constructor(${constructorParams}) {
    ${bodyLines.join('\n    ')}
  }`;

    // Replace the old constructor with the new one
    return tsContent.replace(match[0], newConstructor);
  }
  

  _generateFormControls() {
    return this.answers.fields.map(field => {
      const validations = this.answers.fieldValidations[field];
      
      if (!validations || validations.length === 0) {
        return `${field}: ['']`;
      }

      const validators = [];
      
      // Add all selected validators
      validations.forEach(validation => {
        switch (validation) {
          case 'required':
            validators.push('Validators.required');
            break;
          case 'email':
            validators.push('Validators.email');
            break;
          case 'minLength':
            validators.push(`Validators.minLength(${this.answers.fieldValidations[field + '_minLength']})`);
            break;
          case 'pattern':
            validators.push('Validators.pattern(/^[0-9]{10}$/)');
            break;
          case 'passwordMatch':
            // Handle password match validation separately if needed
            break;
        }
      });

      return validators.length > 0 
        ? `${field}: ['', [${validators.join(', ')}]]`
        : `${field}: ['']`;
    }).join(',\n      ');
  }

  _generateErrorMessages() {
    const messages = [];
    this.answers.fields.forEach(field => {
      const validations = this.answers.fieldValidations[field];
      if (!validations || validations.length === 0) {
        return;
      }

      validations.forEach(validation => {
        switch (validation) {
          case 'required':
            messages.push(`if (formControl.errors['required']) return \`\${control} is required\`;`);
            break;
          case 'email':
            messages.push(`if (formControl.errors['email']) return 'Please enter a valid email';`);
            break;
          case 'minLength':
            messages.push(`if (formControl.errors['minlength']) {
      const minLength = formControl.errors['minlength'].requiredLength;
      return \`\${control} must be at least \${minLength} characters\`;
    }`);
            break;
          case 'pattern':
            messages.push(`if (formControl.errors['pattern']) return 'Please enter a valid phone number';`);
            break;
          case 'passwordMatch':
            messages.push(`if (formControl.errors['passwordMismatch']) return 'Passwords do not match';`);
            break;
        }
      });
    });
    return messages.length > 0 ? messages.join('\n    ') : '// No validations required';
  }

  // ---------------------------
  // INPUT-SPECIFIC HELPER METHOD
  // ---------------------------
  _updateTypeScriptForInput() {
    const tsPath = path.join(
      process.cwd(),
      'frontend/src/app/platforms',
      this.answers.platform,
      'pages',
      this.answers.page,
      `${this.answers.page}.page.ts`
    );

    if (fs.existsSync(tsPath)) {
      let tsContent = fs.readFileSync(tsPath, 'utf8');

      // Add the handler method (if not present)
      const handlerCode = `
  ${this.answers.handlerMethod}(event: any) {
    // Add your input change logic here
    console.log('${this.answers.handlerMethod} called', event.target.value);
  }
`;
      // Insert before the last closing brace
      const lastBraceIndex = tsContent.lastIndexOf('}');
      if (lastBraceIndex !== -1) {
        tsContent = 
          tsContent.slice(0, lastBraceIndex) +
          handlerCode +
          '\n' +
          tsContent.slice(lastBraceIndex);
      }

      fs.writeFileSync(tsPath, tsContent);
      this.log.ok(`Updated TypeScript file at ${tsPath} with input handler.`);
    }
  }

  _generateInputTemplate() {
    return `
  <ion-item>
    <ion-label position="floating">${this._capitalize(this.answers.inputName)}</ion-label>
    <ion-input
      type="${this.answers.inputType}"
      placeholder="${this.answers.placeholder}"
      (${this.answers.eventType})="${this.answers.handlerMethod}($event)">
    </ion-input>
  </ion-item>\n`;
  }

  // ----------------------------
  // CHANGE-SPECIFIC HELPER METHOD
  // ----------------------------
  _updateTypeScriptForChange() {
    const tsPath = path.join(
      process.cwd(),
      'frontend/src/app/platforms',
      this.answers.platform,
      'pages',
      this.answers.page,
      `${this.answers.page}.page.ts`
    );

    if (fs.existsSync(tsPath)) {
      let tsContent = fs.readFileSync(tsPath, 'utf8');

      // Add the handler method (if not present)
      const handlerCode = `
  ${this.answers.handlerMethod}(event: any) {
    // Add your change logic here
    console.log('${this.answers.handlerMethod} called', event.target.value);
  }
`;
      // Insert before the last closing brace
      const lastBraceIndex = tsContent.lastIndexOf('}');
      if (lastBraceIndex !== -1) {
        tsContent = 
          tsContent.slice(0, lastBraceIndex) +
          handlerCode +
          '\n' +
          tsContent.slice(lastBraceIndex);
      }

      fs.writeFileSync(tsPath, tsContent);
      this.log.ok(`Updated TypeScript file at ${tsPath} with change handler.`);
    }
  }

  _generateChangeTemplate() {
    if (this.answers.elementType === 'select') {
      return `
  <ion-item>
    <ion-label>${this._capitalize(this.answers.elementName)}</ion-label>
    <ion-select (ionChange)="${this.answers.handlerMethod}($event)">
      ${this.answers.options.map(opt => `<ion-select-option value="${opt}">${this._capitalize(opt)}</ion-select-option>`).join('\n      ')}
    </ion-select>
  </ion-item>\n`;
    } else if (this.answers.elementType === 'radio') {
      return `
  <ion-radio-group (ionChange)="${this.answers.handlerMethod}($event)">
    <ion-list-header>
      <ion-label>${this._capitalize(this.answers.elementName)}</ion-label>
    </ion-list-header>
    ${this.answers.options.map(opt => `
    <ion-item>
      <ion-label>${this._capitalize(opt)}</ion-label>
      <ion-radio slot="start" value="${opt}"></ion-radio>
    </ion-item>`).join('')}
  </ion-radio-group>\n`;
    } else if (this.answers.elementType === 'checkbox') {
      return `
  <ion-item>
    <ion-label>${this._capitalize(this.answers.elementName)}</ion-label>
    <ion-checkbox (ionChange)="${this.answers.handlerMethod}($event)"></ion-checkbox>
  </ion-item>\n`;
    }
    return '';
  }

  // Utility method
  _capitalize(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Add this helper method to generate the GraphQL mutation/query file
  _generateGraphQLOperationFile(operationType, operationName, fields) {
    const platformName = this.answers.platform;
    const operationDir = path.join(
      process.cwd(),
      'frontend/src/app/graphql',
      `${operationType}s`,
      platformName
    );

    // Create directories if they don't exist
    if (!fs.existsSync(operationDir)) {
      fs.mkdirSync(operationDir, { recursive: true });
    }

    const operationFileName = `${operationName.charAt(0).toLowerCase() + operationName.slice(1)}.${operationType}.ts`;
    const operationFilePath = path.join(operationDir, operationFileName);

    // Generate the GraphQL operation content
    const variables = fields.map(f => `$${f.name}: ${this._getGraphQLType(f)}`).join(', ');
    const inputFields = fields.map(f => `      ${f.name}: $${f.name}`).join(',\n');
    const returnFields = fields
      .filter(f => !f.name.includes('password')) // Exclude password fields from return
      .map(f => `        ${f.name}`).join('\n');

    const operationContent = `import gql from 'graphql-tag';

export const ${this._capitalize(operationName)}${this._capitalize(operationType)} = gql\`
  ${operationType} ${operationName}(${variables}) {
    ${operationName}(input: {
${inputFields}
    }) {
      data {
        id
${returnFields}
      }
      errors
      message
      httpStatus
    }
  }
\`;
`;

    // Write the operation file
    fs.writeFileSync(operationFilePath, operationContent);
    this.log.ok(`Created GraphQL ${operationType} file at ${operationFilePath}`);

    return {
      importPath: `src/app/graphql/${operationType}s/${platformName}/${operationFileName.replace('.ts', '')}`,
      operationName: `${this._capitalize(operationName)}${this._capitalize(operationType)}`
    };
  }

  // Helper to convert form field types to GraphQL types
  _getGraphQLType(field) {
    let type = 'String';
    switch (field.type) {
      case 'number':
        type = 'Int';
        break;
      case 'checkbox':
        type = 'Boolean';
        break;
      case 'float':
        type = 'Float';
        break;
      case 'email':
      case 'password':
      case 'tel':
      case 'text':
      default:
        type = 'String';
    }
    return field.required ? `${type}!` : type;
  }
}
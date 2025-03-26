const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.models = [];
    this.reservedModels = ['User', 'Company'];
    this.modelFields = {};
    this.modelFieldTypes = {};
    this.modelFieldEnums = {};
    this.modelFieldBooleans = {}; // Store boolean default values
    this.modelFieldPolymorphics = {};
    this.modelFieldValidations = {}; // Store field validations
    this.userRoleConfig = null;
    this._done = false; // Flag to indicate generator is done
    this._promptingCompleted = false; // Flag to track prompting completion
    this._writingCompleted = false; // Flag to track writing completion
    
    this.standardTypes = [
      'String',
      'Integer',
      'Float',
      'Boolean',
      'Time',
      'Date',
      'DateTime',
      'Array',
      'Hash',
      'Object',
      'Enum',
      'Polymorphic'
    ];

    this.relationshipTypes = [
      'has_many',
      'has_one',
      'has_and_belongs_to_many',
      'embeds_one',
      'embeds_many'
    ];

    this.validationTypes = {
      String: ['presence', 'uniqueness', 'email', 'strongPassword'],
      Integer: ['presence', 'uniqueness', 'numericality', 'range'],
      Float: ['presence', 'uniqueness', 'numericality', 'range'],
      Boolean: ['presence'],
      Time: ['presence'],
      Date: ['presence'],
      DateTime: ['presence'],
      Array: ['presence'],
      Hash: ['presence'],
      Object: ['presence'],
      Enum: ['presence'],
      Polymorphic: ['presence']
    };

    this.defaultMessages = {
      presence: "field_name can't be blank",
      uniqueness: 'field_name has already been taken',
      email: 'field_name must be a valid email address',
      strongPassword: 'field_name must include at least one uppercase letter, one lowercase letter, one digit, and one special character',
      numericality: 'field_name must be a number',
      range: 'field_name must be within the specified range'
    };
  }

  // Format model name to proper capitalization
  formatModelName(name) {
    if (!name) return '';
    
    // Remove any leading/trailing spaces
    name = name.trim();
    
    // Split by spaces, hyphens, or underscores
    const words = name.split(/[\s\-_]+/);
    
    // Capitalize each word and join them
    return words.map(word => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join('');
  }

  // Convert to snake_case
  toSnakeCase(str) {
    if (!str) return '';
    
    return str
      // Handle camelCase
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      // Replace spaces and hyphens with underscores
      .replace(/[\s-]+/g, '_')
      // Convert to lowercase
      .toLowerCase()
      // Remove any leading/trailing underscores
      .replace(/^_+|_+$/g, '');
  }

  // Handle enum type fields
  async handleEnumField(fieldName) {
    // Safety check - skip if already done
    if (this._done) {
      return { values: ['default'], default: 'default' };
    }
    
    // Safety check - ensure fieldName is valid
    if (!fieldName || typeof fieldName !== 'string') {
      return { values: ['default'], default: 'default' };
    }
    
    const enumPrompt = await this.prompt([
      {
        type: 'input',
        name: 'enumValues',
        message: `Enter comma-separated enum values for ${fieldName}:`,
        validate: (input) => {
          if (!input || input.trim() === '') {
            return 'At least one enum value is required';
          }
          return true;
        }
      }
    ]);

    // Convert enum values to snake_case
    const enumValues = enumPrompt.enumValues
      .split(',')
      .map(v => v.trim())
      .filter(v => v) // Remove empty values
      .map(v => this.toSnakeCase(v));
    
    if (enumValues.length === 0) {
      this.log('No valid enum values were provided. Using "default" as fallback.');
      enumValues.push('default');
    }
    
    const defaultPrompt = await this.prompt([
      {
        type: 'list',
        name: 'defaultValue',
        message: 'Select default value:',
        choices: enumValues
      }
    ]);

    return {
      values: enumValues,
      default: defaultPrompt.defaultValue
    };
  }

  // Handle boolean type fields
  async handleBooleanField(fieldName) {
    // Safety check - skip if already done
    if (this._done) {
      return { default: false };
    }
    
    // Safety check - ensure fieldName is valid
    if (!fieldName || typeof fieldName !== 'string') {
      return { default: false };
    }
    
    const booleanPrompt = await this.prompt([
      {
        type: 'list',
        name: 'defaultValue',
        message: `Select default value for ${fieldName}:`,
        choices: ['true', 'false'],
        default: 'false'
      }
    ]);

    return {
      default: booleanPrompt.defaultValue === 'true'
    };
  }

  async promptForUserRoles() {
    // Skip if we're already done
    if (this._promptingCompleted) {
      return;
    }
    
    this.log('First, configure the User roles:');
    this.userRoleConfig = await this.handleEnumField('User roles');
  }

  async promptForSchemaName() {
    // Skip if we're already done
    if (this._promptingCompleted) {
      return this.answers.schemaName;
    }
    
    const schemaPrompt = await this.prompt([
      {
        type: 'input',
        name: 'schemaName',
        message: 'What would you like to name your schema file?',
        default: 'RapidSchema.yml'
      }
    ]);

    // Add .yml extension if not present
    let schemaName = schemaPrompt.schemaName;
    if (!schemaName.toLowerCase().endsWith('.yml')) {
      schemaName += '.yml';
    }
    return schemaName;
  }

  async handleValidations(fieldName, fieldType) {
    // Safety check - skip if already done
    if (this._done || !fieldName || !fieldType) {
      return [];
    }

    const validations = [];
    let addMore = true;

    while (addMore) {
      // Get available validation types for this field type
      const availableValidations = this.validationTypes[fieldType] || ['presence'];
      
      // Filter out validations already added
      const remainingValidations = availableValidations.filter(
        v => !validations.some(existing => existing.type === v)
      );

      if (remainingValidations.length === 0) {
        this.log('All available validations have been added for this field.');
        break;
      }

      const validationPrompt = await this.prompt([
        {
          type: 'list',
          name: 'type',
          message: `Select validation type for ${fieldName}:`,
          choices: remainingValidations
        }
      ]);

      const validation = { type: validationPrompt.type };

      // Handle specific validation types
      if (validation.type === 'range') {
        const rangePrompt = await this.prompt([
          {
            type: 'input',
            name: 'min',
            message: 'Enter minimum value:',
            default: '0'
          },
          {
            type: 'input',
            name: 'max',
            message: 'Enter maximum value:',
            default: '100'
          }
        ]);
        validation.min = parseInt(rangePrompt.min);
        validation.max = parseInt(rangePrompt.max);
      }

      // Ask for custom message with field name included in default
      const defaultMessage = this.defaultMessages[validation.type].replace('field_name', fieldName);
      const messagePrompt = await this.prompt([
        {
          type: 'input',
          name: 'message',
          message: 'Enter custom validation message (press enter to use default):',
          default: defaultMessage
        }
      ]);

      validation.message = messagePrompt.message;
      validations.push(validation);

      if (remainingValidations.length <= 1) {
        break; // No more validations available
      }

      // Ask if user wants to add another validation
      const addMorePrompt = await this.prompt([
        {
          type: 'confirm',
          name: 'addMore',
          message: 'Would you like to add another validation for this field?',
          default: false
        }
      ]);

      addMore = addMorePrompt.addMore;
    }

    return validations;
  }

  async promptForField(modelName) {
    // Skip if we're already done
    if (this._promptingCompleted || this._done) {
      return null;
    }
    
    const fieldPrompt = await this.prompt([
      {
        type: 'input',
        name: 'fieldName',
        message: `Enter a field name for ${modelName}:`,
        validate: (input) => {
          if (!input || input.trim() === '') {
            return 'Field name is required';
          }
          return true;
        }
      }
    ]);

    const fieldName = fieldPrompt.fieldName.trim();
    
    // Determine if this is a foreign key field
    const isForeignKey = fieldName.endsWith('_id');
    
    // Determine available types based on field name
    let types = isForeignKey ? this.relationshipTypes : this.standardTypes;
    
    // If this is a relationship field, format the choices to be more readable
    if (isForeignKey) {
      // Extract the base entity name (e.g., "company" from "company_id")
      const baseEntity = fieldName.slice(0, -3); // Remove "_id"
      
      // Format the choices to include the relationship context
      types = this.relationshipTypes.map(relationType => {
        // Display as "company has_many branch" but store as "has_many"
        return {
          name: `${baseEntity} ${relationType} ${modelName.toLowerCase()}`,
          value: relationType
        };
      });
    }
    
    const typePrompt = await this.prompt([
      {
        type: 'list',
        name: 'fieldType',
        message: `Select type for ${fieldName}:`,
        choices: types
      }
    ]);

    const fieldType = typePrompt.fieldType;
    
    // Handle enum, boolean, and polymorphic configs as before
    let enumConfig = null;
    let booleanConfig = null;
    let polymorphicConfig = null;
    let validations = [];
    
    try {
      if (fieldType === 'Enum') {
        enumConfig = await this.handleEnumField(fieldName);
      } else if (fieldType === 'Boolean') {
        booleanConfig = await this.handleBooleanField(fieldName);
      } else if (fieldType === 'Polymorphic') {
        polymorphicConfig = await this.handlePolymorphicField(fieldName);
      }

      // Ask if user wants to add validations
      const addValidationsPrompt = await this.prompt([
        {
          type: 'confirm',
          name: 'addValidations',
          message: 'Would you like to add validations for this field?',
          default: true
        }
      ]);

      if (addValidationsPrompt.addValidations) {
        validations = await this.handleValidations(fieldName, fieldType);
      }

    } catch (error) {
      this.log(`Error handling field type or validations: ${error.message}`);
      // Provide default values as before
    }
    
    return {
      name: fieldName,
      type: fieldType,
      enumConfig,
      booleanConfig,
      polymorphicConfig,
      validations
    };
  }

  // Handle polymorphic field configuration
  async handlePolymorphicField(fieldName) {
    // Safety check - skip if already done
    if (this._done) {
      return { models: [] };
    }
    
    // Safety check - ensure fieldName is valid
    if (!fieldName || typeof fieldName !== 'string') {
      return { models: [] };
    }
    
    // Prompt for the models that can be referenced by this polymorphic relationship
    const polymorphicPrompt = await this.prompt([
      {
        type: 'input',
        name: 'models',
        message: `Enter comma-separated model names that can be referenced by ${fieldName} (e.g., Post,Comment,User):`,
        validate: (input) => {
          if (!input || input.trim() === '') {
            return 'At least one model is required for a polymorphic relationship';
          }
          return true;
        }
      }
    ]);
    
    // Parse and clean the input
    const models = polymorphicPrompt.models
      .split(',')
      .map(model => model.trim())
      .filter(model => model !== '');
    
    return { models };
  }

  async promptForModel() {
    // Skip if we're already done
    if (this._promptingCompleted) {
      return null;
    }
    
    const addModelPrompt = await this.prompt([
      {
        type: 'confirm',
        name: 'addModel',
        message: 'Would you like to add a model?',
        default: true
      }
    ]);
    
    if (!addModelPrompt.addModel) {
      return null;
    }
    
    const modelPrompt = await this.prompt([
      {
        type: 'input',
        name: 'modelName',
        message: 'Enter a model name (in singular form):',
        validate: (input) => {
          if (!input || input.trim() === '') {
            return 'Model name is required';
          }
          
          const formattedInput = this.formatModelName(input);
          
          // Check if model name is reserved
          if (this.reservedModels.includes(formattedInput)) {
            return `${formattedInput} is a reserved model name and cannot be used`;
          }
          
          // Check if model is already added
          if (this.models.includes(formattedInput)) {
            return `${formattedInput} has already been added`;
          }
          
          return true;
        }
      }
    ]);

    return this.formatModelName(modelPrompt.modelName);
  }

  async prompting() {
    // Prevent multiple executions
    if (this._promptingCompleted) {
      return;
    }
    
    this.log('Welcome to the Rapid Schema generator');
    this.log('\nNote: User and Company models will be automatically created with default fields');

    try {
      // Step 1: Prompt for User roles
      await this.promptForUserRoles();
      
      // Step 2: Prompt for schema name
      this.answers = {
        schemaName: await this.promptForSchemaName()
      };
      
      // Step 3: Start model collection
      while (true) {
        const modelName = await this.promptForModel();
        
        // Exit the loop if no model is requested
        if (modelName === null) {
          break;
        }
        
        this.models.push(modelName);
        this.modelFields[modelName] = [];
        this.modelFieldTypes[modelName] = {};
        this.modelFieldEnums[modelName] = {};
        this.modelFieldBooleans[modelName] = {}; // Initialize boolean configs
        this.modelFieldPolymorphics[modelName] = {}; // Initialize polymorphic configs
        this.modelFieldValidations[modelName] = {}; // Initialize validation storage
        
        // Collect fields for this model
        while (true) {
          const field = await this.promptForField(modelName);
          
          if (!field) {
            break;
          }
          
          this.modelFields[modelName].push(field.name);
          this.modelFieldTypes[modelName][field.name] = field.type;
          
          if (field.type === 'Enum') {
            this.modelFieldEnums[modelName][field.name] = field.enumConfig;
          } else if (field.type === 'Boolean') {
            this.modelFieldBooleans[modelName][field.name] = field.booleanConfig;
          } else if (field.type === 'Polymorphic') {
            this.modelFieldPolymorphics[modelName][field.name] = field.polymorphicConfig;
          }
          
          // Add validations if they exist
          if (field.validations && field.validations.length > 0) {
            this.modelFieldValidations[modelName][field.name] = field.validations;
          }
          
          // Ask if user wants to add another field
          const addFieldPrompt = await this.prompt([
            {
              type: 'confirm',
              name: 'addField',
              message: `Would you like to add another field to ${modelName}?`,
              default: true
            }
          ]);
          
          if (!addFieldPrompt.addField) {
            break;
          }
        }
      }
      
      // Mark prompting as completed to prevent re-execution
      this._promptingCompleted = true;
      this._done = true;
    } catch (error) {
      console.error(`An error occurred: ${error.message}`);
      console.error(error.stack);
      
      // Even on error, mark as completed to prevent infinite loops
      this._promptingCompleted = true;
      this._done = true;
    }
  }

  writing() {
    // Prevent multiple executions
    if (this._writingCompleted) {
      return;
    }
    
    try {
      // Create _schema directory if it doesn't exist
      const schemaDir = path.join(process.cwd(), './backend/_schema');
      if (!fs.existsSync(schemaDir)) {
        fs.mkdirSync(schemaDir, { recursive: true });
      }
  
      // Make sure we have valid user role config
      if (!this.userRoleConfig || !this.userRoleConfig.values || !this.userRoleConfig.default) {
        this.userRoleConfig = {
          values: ['admin', 'user', 'guest'],
          default: 'user'
        };
      }
  
      // Create schema file with reserved models and user-defined models
      const schemaContent = `# This schema was generated using rapid-generator
# Reserved models are automatically included
  
models:
  # Reserved Models
  Company:
    attributes:
      name:
        type: String
        validates:
          presence:
            message: "name can't be blank"
          uniqueness:
            message: "name has already been taken"
      code:
        type: String
        validates:
          presence:
            message: "code can't be blank"
          uniqueness:
            message: "code has already been taken"
      active:
        type: Boolean
        default: true
        validates:
          presence:
            message: "active can't be blank"
      
  User:
    attributes:
      email:
        type: String
        validates:
          presence:
            message: "email can't be blank"
          uniqueness:
            message: "email has already been taken"
          email:
            message: "email must be a valid email address"
      encrypted_password:
        type: String
        validates:
          presence:
            message: "password can't be blank"
          strongPassword:
            message: "password must include at least one uppercase letter, one lowercase letter, one digit, and one special character"
      reset_password_token:
        type: String
      reset_password_sent_at:
        type: Time
      remember_created_at:
        type: Time
      first_name:
        type: String
        validates:
          presence:
            message: "first_name can't be blank"
      last_name:
        type: String
        validates:
          presence:
            message: "last_name can't be blank"
      telephone:
        type: String
        validates:
          presence:
            message: "telephone can't be blank"
      accept_terms:
        type: Boolean
        validates:
          presence:
            message: "accept_terms can't be blank"
      role:
        type: Enum
        values: [${this.userRoleConfig.values.join(', ')}]
        default: ${this.userRoleConfig.default}
      company_id:
        type: has_many
        validates:
          presence:
            message: "company_id can't be blank"
      
  # User-defined Models
${this.models.map(model => `  ${model}:
    attributes:
${this.modelFields[model].map(field => {
  const fieldType = this.modelFieldTypes[model][field];
  let fieldDefinition = '';
  
  if (fieldType === 'Enum') {
    const enumConfig = this.modelFieldEnums[model][field];
    fieldDefinition = `${field}:\n        type: ${fieldType}\n        values: [${enumConfig.values.join(', ')}]\n        default: ${enumConfig.default}`;
  } else if (fieldType === 'Boolean') {
    const booleanConfig = this.modelFieldBooleans[model][field];
    if (booleanConfig) {
      fieldDefinition = `${field}:\n        type: ${fieldType}\n        default: ${booleanConfig.default}`;
    } else {
      fieldDefinition = `${field}:\n        type: ${fieldType}`;
    }
  } else if (fieldType === 'Polymorphic') {
    const polymorphicConfig = this.modelFieldPolymorphics[model][field];
    if (polymorphicConfig && polymorphicConfig.models && polymorphicConfig.models.length > 0) {
      fieldDefinition = `${field}:\n        type: ${fieldType}\n        models: [${polymorphicConfig.models.join(', ')}]`;
    } else {
      fieldDefinition = `${field}:\n        type: ${fieldType}`;
    }
  } else {
    fieldDefinition = `${field}:\n        type: ${fieldType}`;
  }

  // Add validations if they exist with proper nesting
  const validations = this.modelFieldValidations[model]?.[field];
  if (validations && validations.length > 0) {
    const validationStr = validations.map(v => {
      if (v.type === 'range') {
        return `          ${v.type}:\n            minimum: ${v.min}\n            maximum: ${v.max}\n            message: "${v.message}"`;
      }
      return `          ${v.type}:\n            message: "${v.message}"`;
    }).join('\n');
    fieldDefinition += '\n        validates:\n' + validationStr;
  }
  
  return `      ${fieldDefinition}`;
}).join('\n')}`).join('\n\n')}
`;
  
      this.fs.write(
        path.join(schemaDir, this.answers.schemaName || 'RapidSchema.yml'),
        schemaContent
      );
      
      // Mark writing as completed
      this._writingCompleted = true;
    } catch (error) {
      console.error(`An error occurred during writing: ${error.message}`);
      console.error(error.stack);
      
      // Mark as completed even on error
      this._writingCompleted = true;
    }
  }

  end() {
    // Already handled by done flag
    if (this._done) {
      return;
    }
    
    // Set flag to prevent further enum handling and re-execution
    this._done = true;
    
    try {
      this.log('\nSchema generator completed successfully!');
      this.log(`Created schema file: ${this.answers?.schemaName || 'RapidSchema.yml'}`);
      this.log(`Added reserved models: ${this.reservedModels.join(', ')}`);
      
      if (this.userRoleConfig) {
        this.log(`User roles: ${this.userRoleConfig.values.join(', ')} (default: ${this.userRoleConfig.default})`);
      }
      
      if (this.models && this.models.length > 0) {
        this.log(`Added user-defined models: ${this.models.join(', ')}`);
        this.log('\nModel fields:');
        this.models.forEach(model => {
          this.log(`\n  ${model}:`);
          if (this.modelFields[model]) {
            this.modelFields[model].forEach(field => {
              const fieldType = this.modelFieldTypes[model][field];
              let fieldInfo = '';
              
              if (fieldType === 'Enum' && this.modelFieldEnums[model][field]) {
                const enumConfig = this.modelFieldEnums[model][field];
                fieldInfo = `${field}: ${fieldType}[${enumConfig.values.join(', ')}](default: ${enumConfig.default})`;
              } else if (fieldType === 'Boolean' && this.modelFieldBooleans[model][field]) {
                const booleanConfig = this.modelFieldBooleans[model][field];
                fieldInfo = `${field}: ${fieldType}(default: ${booleanConfig.default})`;
              } else {
                fieldInfo = `${field}: ${fieldType}`;
              }
              
              this.log(`    ${fieldInfo}`);
            });
          }
        });
      }
    } catch (error) {
      console.error(`An error occurred at the end: ${error.message}`);
    }
  }
};

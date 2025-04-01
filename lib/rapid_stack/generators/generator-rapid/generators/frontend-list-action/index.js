'use strict';
const Generator = require('yeoman-generator');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const _ = require('lodash');
const { handlePrompt } = require('../../lib/utils');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.platformsPath = './frontend/src/app/platforms';
    this.backendPath = './backend';
    this.graphqlTypesPath = './backend/app/graphql/types';
    this.systemModels = ['jwt_denylist', 'otp']; // Models to exclude
    this.updatedFiles = []; // Track updated files
  }

  // Get list of platforms
  _getPlatforms() {
    const platformsPath = path.join(this.destinationPath(), this.platformsPath);
    try {
      return fs.readdirSync(platformsPath)
        .filter(file => fs.statSync(path.join(platformsPath, file)).isDirectory());
    } catch (error) {
      this.log.error('Error reading platforms directory:', error);
      return [];
    }
  }

  // Get list of pages for a specific platform
  _getPages(platform) {
    const pagesPath = path.join(this.destinationPath(), this.platformsPath, platform, 'pages');
    try {
      return fs.readdirSync(pagesPath)
        .filter(file => fs.statSync(path.join(pagesPath, file)).isDirectory());
    } catch (error) {
      this.log.error(`Error reading pages directory for platform ${platform}:`, error);
      return [];
    }
  }

  // Get list of available models from backend, excluding system models
  _getModels() {
    const modelsPath = path.join(this.destinationPath(), this.backendPath, 'app/models');
    try {
      return fs.readdirSync(modelsPath)
        .filter(file => file.endsWith('.rb'))
        .map(file => file.replace('.rb', ''))
        .filter(model => !this.systemModels.includes(model)); // Exclude system models
    } catch (error) {
      this.log.error('Error reading models directory:', error);
      return [];
    }
  }

  // Get fields from GraphQL type file for a model
  _getModelFields(modelName) {
    const typeFileName = `${this._toSnakeCase(modelName)}_type.rb`;
    const typePath = path.join(this.destinationPath(), this.graphqlTypesPath, typeFileName);
    
    try {
      if (!fs.existsSync(typePath)) {
        this.log.error(`GraphQL type file not found for model: ${modelName}`);
        return [];
      }
      
      const content = fs.readFileSync(typePath, 'utf8');
      const fields = [];
      
      // Match field definitions in the GraphQL type file
      // Look for lines like: field :name, String, null: false
      const fieldRegex = /^\s*field :(\w+),.*(?<!#)/gm;
      let match;
      
      // Process each line
      const lines = content.split('\n');
      for (const line of lines) {
        // Skip relationship fields (lines with comments containing belongs_to or has_many)
        if (line.includes('# belongs_to') || line.includes('# has_many')) {
          continue;
        }
        
        // Extract field name
        const fieldMatch = line.match(/^\s*field :(\w+),/);
        if (fieldMatch) {
          fields.push(fieldMatch[1]);
        }
      }
      
      return fields;
    } catch (error) {
      this.log.error(`Error reading GraphQL type file for model ${modelName}:`, error);
      return [];
    }
  }

  _getGraphQLTypeFields(modelName) {
    const snakeCaseModelName = _.snakeCase(modelName);
    const typeFilePath = path.join(this.destinationPath(), this.graphqlTypesPath, `${snakeCaseModelName}_type.rb`);
    
    if (!fs.existsSync(typeFilePath)) {
      return { fields: [], relationshipFields: [] };
    }

    // First, let's get the model file to identify actual relationships
    const modelPath = path.join(this.destinationPath(), this.backendPath, 'app/models', `${modelName}.rb`);
    let modelContent = '';
    if (fs.existsSync(modelPath)) {
      modelContent = fs.readFileSync(modelPath, 'utf8').toString();
    }
    
    // Extract relationship definitions from the model
    const relationships = {
      belongsTo: [],
      hasMany: [],
      hasOne: []
    };
    
    // Extract belongs_to relationships
    const belongsToRegex = /belongs_to\s+:(\w+)/g;
    let belongsToMatch;
    while ((belongsToMatch = belongsToRegex.exec(modelContent)) !== null) {
      relationships.belongsTo.push(belongsToMatch[1]);
    }
    
    // Extract has_many relationships
    const hasManyRegex = /has_many\s+:(\w+)/g;
    let hasManyMatch;
    while ((hasManyMatch = hasManyRegex.exec(modelContent)) !== null) {
      relationships.hasMany.push(hasManyMatch[1]);
    }
    
    // Extract has_one relationships
    const hasOneRegex = /has_one\s+:(\w+)/g;
    let hasOneMatch;
    while ((hasOneMatch = hasOneRegex.exec(modelContent)) !== null) {
      relationships.hasOne.push(hasOneMatch[1]);
    }

    // Now process the GraphQL type file
    const content = fs.readFileSync(typeFilePath, 'utf8');
    const fields = [];
    const relationshipFields = [];
    
    const fieldRegex = /field\s+:(\w+),\s+([^,\n]+)(?:,\s+null:\s+(\w+))?/g;
    let match;
    
    while ((match = fieldRegex.exec(content)) !== null) {
      const [, fieldName, fieldType] = match;
      if (!['id', 'created_at', 'updated_at'].includes(fieldName)) {
        if (fieldType.trim().startsWith('GraphQL::Types')) {
          fields.push({
            name: fieldName,
            type: fieldType.trim(),
            isRelationship: false
          });
        } else if (fieldType.includes('Types::')) {
          // Process as a relationship field
          const isBelongsTo = relationships.belongsTo.includes(fieldName);
          const isHasMany = relationships.hasMany.includes(fieldName);
          const isHasOne = relationships.hasOne.includes(fieldName);
          
          relationshipFields.push({
            name: fieldName,
            type: fieldType.trim(),
            isRelationship: true,
            relationshipType: isBelongsTo ? 'belongsTo' : (isHasMany ? 'hasMany' : (isHasOne ? 'hasOne' : 'scalar'))
          });
        } else {
          fields.push({
            name: fieldName,
            type: fieldType.trim(),
            isRelationship: false
          });
        }        
      }
    }

    return { fields, relationshipFields };
  }

  // Check if GraphQL query exists for the model
  _checkGraphQLQuery(modelName) {
    const queryDirPath = path.join(
      this.destinationPath(),
      'frontend/src/app/graphql/queries',
      modelName.toLowerCase()
    );
    
    const listQueryName = `list${this._capitalize(modelName)}${this._pluralize(modelName).slice(modelName.length)}.query.ts`;
    const listQueryPath = path.join(queryDirPath, listQueryName);
    
    return fs.existsSync(listQueryPath);
  }

  // Helper method to process template content
  _processTemplate(templatePath, data) {
    try {
      const templateContent = fs.readFileSync(this.templatePath(templatePath), 'utf8');
      return ejs.render(templateContent, data);
    } catch (error) {
      this.log.error(`Error processing template ${templatePath}:`, error);
      return '';
    }
  }

  // Helper method to write or update file
  _writeFile(filePath, content) {
    try {
      // Create directory if it doesn't exist
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      this.log(`Created/Updated file: ${filePath}`);
      
      // Track updated files
      this.updatedFiles.push(filePath);
    } catch (error) {
      this.log.error(`Error writing file ${filePath}:`, error);
    }
  }

  // Helper function to capitalize first letter
  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Helper function to convert to camel case
  _toCamelCase(str) {
    return str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
  }

  // Helper function to convert to snake case
  _toSnakeCase(str) {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  // Helper function to convert to kebab case
  _toKebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  // Helper function to pluralize a string
  _pluralize(str) {
    const irregulars = {
      'company': 'companies',
      'person': 'people',
      'child': 'children',
      'man': 'men',
      'woman': 'women',
      'tooth': 'teeth',
      'foot': 'feet',
      'mouse': 'mice',
      'goose': 'geese'
    };

    if (irregulars[str]) {
      return irregulars[str];
    }

    if (str.endsWith('y') && !['ay', 'ey', 'iy', 'oy', 'uy'].some(ending => str.endsWith(ending))) {
      return str.slice(0, -1) + 'ies';
    } else if (str.endsWith('s') || str.endsWith('x') || str.endsWith('z') || 
               str.endsWith('ch') || str.endsWith('sh')) {
      return str + 'es';
    } else {
      return str + 's';
    }
  }

  async prompting() {
    const prompts = [
      {
        type: 'list',
        name: 'platform',
        message: 'Select platform:',
        choices: this._getPlatforms(),
        default: 0
      },
      {
        type: 'list',
        name: 'page',
        message: 'Select page:',
        choices: (answers) => this._getPages(answers.platform),
        default: 0
      },
      {
        type: 'list',
        name: 'modelName',
        message: 'Select model:',
        choices: this._getModels(),
        default: 0
      },
      {
        type: 'checkbox',
        name: 'selectedFields',
        message: 'Select fields to display:',
        choices: (answers) => this._getModelFields(answers.modelName),
        validate: (input) => input.length > 0 || 'Please select at least one field'
      },
      {
        type: 'input',
        name: 'buttonName',
        message: 'Enter the name for the action button:',
        default: 'Action',
        validate: (input) => input.length > 0 || 'Button name is required'
      },
      {
        type: 'list',
        name: 'actionTargetModel',
        message: 'What is action target model?',
        choices: this._getModels(),
        default: 0
      }
    ];

    const answers = await handlePrompt(this, prompts);
    this.platform = answers.platform;
    this.page = answers.page;
    this.modelName = answers.modelName;
    this.selectedFields = answers.selectedFields;
    this.buttonName = answers.buttonName;
    this.actionTargetModel = answers.actionTargetModel;

    // Get all available fields from the target model's type file
    const targetModelFields = this._getGraphQLTypeFields(this.actionTargetModel);
    
    // Create choices for field selection, filtering out the selected model and company
    const fieldChoices = [
      ...targetModelFields.fields.map(field => ({
        name: field.name,
        value: { ...field, isRelationship: false }
      })),
      ...targetModelFields.relationshipFields
        .filter(field => {
          // Filter out the selected model and company relationships
          const isSelectedModel = field.name === this.modelName.toLowerCase();
          const isCompany = field.name === 'company';
          return !isSelectedModel && !isCompany;
        })
        .map(field => ({
          name: field.name,
          value: { ...field, isRelationship: true }
        }))
    ];

    // Prompt for selecting form fields
    const formFieldsAnswer = await handlePrompt(this, [
      {
        type: 'checkbox',
        name: 'selectedFormFields',
        message: 'Select fields to show in the form:',
        choices: fieldChoices,
        validate: (input) => input.length > 0 || 'Please select at least one field'
      }
    ]);

    // Store the selected form fields
    this.selectedFormFields = formFieldsAnswer.selectedFormFields;

    // For each relationship field, ask which fields to display in the dropdown
    this.relationshipDisplayFields = {};
    this.useCurrentUserFor = {}; // Add this to track which relationships use current user

    for (const field of this.selectedFormFields.filter(f => f.isRelationship)) {
      // Get the relationship model type name from the field type
      const relationshipTypeName = field.type.replace('Types::', '').replace('Type', '');
      
      // If this is a User relationship, ask if we should use the current user
      if (relationshipTypeName === 'User') {
        const useCurrentUserAnswer = await handlePrompt(this, [
          {
            type: 'confirm',
            name: 'useCurrentUser',
            message: `For the ${field.name} field, should this be the currently logged-in user?`,
            default: false
          }
        ]);

        this.useCurrentUserFor[field.name] = useCurrentUserAnswer.useCurrentUser;

        // If using current user, skip the display field selection
        if (useCurrentUserAnswer.useCurrentUser) {
          continue;
        }
      }

      const relationshipFields = this._getGraphQLTypeFields(this._toSnakeCase(relationshipTypeName));

      // Define sensitive user fields to exclude
      const sensitiveUserFields = [
        'encrypted_password',
        'reset_password_token',
        'reset_password_sent_at',
        'remember_created_at'
      ];

      // Filter out relationship fields and sensitive fields for User model
      const scalarFieldChoices = relationshipFields.fields
        .filter(f => {
          // First filter out relationship fields
          if (f.isRelationship) return false;
          
          // Then filter out sensitive fields if this is the User model
          if (relationshipTypeName === 'User') {
            return !sensitiveUserFields.includes(f.name);
          }
          
          return true;
        })
        .map(f => ({
          name: f.name,
          value: f.name
        }));

      const displayFieldsAnswer = await handlePrompt(this, [
        {
          type: 'list',
          name: `${field.name}DisplayFields`,
          message: `Select field to display in the ${field.name} dropdown:`,
          choices: scalarFieldChoices,
          validate: (input) => input.length > 0 || 'Please select a display field'
        }
      ]);

      // Store the selected field in camelCase format
      this.relationshipDisplayFields[field.name] = [_.camelCase(displayFieldsAnswer[`${field.name}DisplayFields`])];
    }
  }

  writing() {
    if (!this.platform || !this.page || !this.modelName || !this.selectedFields) {
      this.log.error('Missing required configuration');
      return;
    }
    
    // Define paths to the page files
    const pagePath = path.join(
      this.platformsPath,
      this.platform,
      'pages',
      this.page
    );
    
    const htmlFilePath = path.join(pagePath, `${this.page}.page.html`);
    const tsFilePath = path.join(pagePath, `${this.page}.page.ts`);
    const scssFilePath = path.join(pagePath, `${this.page}.page.scss`);
    
    // Get target model fields
    const targetModelFields = this._getGraphQLTypeFields(this.actionTargetModel);
    
    // Filter fields based on user selection
    const selectedRegularFields = this.selectedFormFields.filter(field => !field.isRelationship);
    const selectedRelationshipFields = this.selectedFormFields.filter(field => field.isRelationship).map(field => ({
      ...field,
      displayFields: this.relationshipDisplayFields[field.name]
    }));
    
    // Prepare template data
    const templateData = {
      modelName: this.modelName,
      selectedFields: this.selectedFields,
      platform: this.platform,
      page: this.page,
      h: {
        capitalize: this._capitalize.bind(this),
        toCamelCase: this._toCamelCase.bind(this),
        toSnakeCase: this._toSnakeCase.bind(this),
        toKebabCase: this._toKebabCase.bind(this),
        pluralize: this._pluralize.bind(this)
      },
      buttonName: this.buttonName,
      actionTargetModel: this.actionTargetModel,
      targetModelFields: selectedRegularFields,
      targetModelRelationships: selectedRelationshipFields.map(field => ({
        ...field,
        useCurrentUser: this.useCurrentUserFor[field.name] || false
      }))
    };
    
    // Process and write HTML file
    const htmlContent = this._processTemplate('list-action/list.component.html.ejs', templateData);
    this._writeFile(path.join(this.destinationPath(), htmlFilePath), htmlContent);
    
    // Process and write SCSS file
    const scssContent = this._processTemplate('list-action/list.component.scss.ejs', templateData);
    this._writeFile(path.join(this.destinationPath(), scssFilePath), scssContent);
    
    // Process and write TS file
    const tsContent = this._processTemplate('list-action/list.component.ts.ejs', templateData);
    this._writeFile(path.join(this.destinationPath(), tsFilePath), tsContent);
    
    this.log(`Successfully updated page files for ${this.modelName} list in ${pagePath}`);
  }

  end() {
    // Display a summary of what was created/updated
    this.log('\n==================================================');
    this.log('🎉 FRONTEND LIST ACTION GENERATOR - SUMMARY 🎉');
    this.log('==================================================\n');
    
    this.log(`Model: ${this._capitalize(this.modelName)}`);
    this.log(`Selected Fields: ${this.selectedFields.join(', ')}`);
    this.log(`Platform: ${this.platform}`);
    this.log(`Page: ${this.page}`);
    this.log(`Action Button: ${this.buttonName}`);
    this.log(`Action Target Model: ${this._capitalize(this.actionTargetModel)}`);
    
    this.log('\nFiles Updated:');
    this.updatedFiles.forEach(file => {
      const relativePath = file.replace(this.destinationPath() + '/', '');
      this.log(`- ${relativePath}`);
    });
    
    this.log('\nGraphQL Query Used:');
    this.log(`- List${this._capitalize(this.modelName)}${this._pluralize(this.modelName).slice(this.modelName.length)}Query`);
    
    this.log('\nFeatures Implemented:');
    this.log('- Responsive data table with the selected fields');
    this.log('- Sorting functionality (click column headers to sort)');
    this.log('- Search filtering');
    this.log('- Pagination with next/previous navigation');
    this.log('- Pull-to-refresh functionality');
    this.log('- Loading indicators');
    this.log('- Proper TypeScript interfaces for type safety');
    this.log('- BaseGraphQLPage integration for standardized data fetching');
    
    this.log('\n✅ The list view has been successfully implemented!');
    this.log('You can now navigate to the page to see your list in action.');
    this.log('==================================================\n');
  }
}; 
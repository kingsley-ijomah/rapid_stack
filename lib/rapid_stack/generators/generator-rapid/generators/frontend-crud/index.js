'use strict';
const Generator = require('yeoman-generator');
const fs = require('fs');
const path = require('path');
const { handlePrompt } = require('../../lib/utils');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.platformsPath = './frontend/src/app/platforms';
    this.backendPath = './backend';
    this.graphqlPath = 'frontend/src/app/graphql';
    
    // Define available CRUD types
    this.crudTypes = ['Table', 'Profile', 'Accordion', 'Grid'];
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

  // Get list of available models from backend
  _getModels() {
    const modelsPath = path.join(this.destinationPath(), this.backendPath, 'app/models');
    try {
      return fs.readdirSync(modelsPath)
        .filter(file => file.endsWith('.rb'))
        .map(file => file.replace('.rb', ''));
    } catch (error) {
      this.log.error('Error reading models directory:', error);
      return [];
    }
  }

  // Read model file and extract fields and relationships
  _getModelFields(modelName) {
    const modelPath = path.join(
      this.destinationPath(),
      this.backendPath,
      'app/models',
      `${modelName}.rb`
    );

    try {
      const content = fs.readFileSync(modelPath, 'utf8');
      const fields = [];
      const relationships = [];
      
      // Match field definitions in the model
      const fieldRegex = /field :(\w+)(?:,\s*type:\s*\w+)?/g;
      let match;
      while ((match = fieldRegex.exec(content)) !== null) {
        fields.push(match[1]);
      }

      // Match relationships
      const belongsToRegex = /belongs_to :(\w+)(?:,\s*(?:class_name:|foreign_key:)\s*['"]([^'"]+)['"])?/g;
      while ((match = belongsToRegex.exec(content)) !== null) {
        const [, name, options] = match;
        // Skip company relationship as it's handled internally
        if (name !== 'company') {
          relationships.push({ name, type: 'belongs_to', options });
        }
      }

      // Add default fields if not already included
      const defaultFields = ['id', 'created_at', 'updated_at'];
      defaultFields.forEach(field => {
        if (!fields.includes(field)) {
          fields.push(field);
        }
      });

      return { fields, relationships };
    } catch (error) {
      return { 
        fields: ['id', 'name', 'created_at', 'updated_at'],
        relationships: []
      };
    }
  }

  // New method to get fields with their types
  _getModelFieldsWithTypes(modelName) {
    const modelPath = path.join(
      this.destinationPath(),
      this.backendPath,
      'app/models',
      `${modelName}.rb`
    );

    try {
      const content = fs.readFileSync(modelPath, 'utf8');
      const fields = [];
      
      // First extract ENUMS constant if it exists
      const enumsMatch = content.match(/ENUMS\s*=\s*{([^}]*)}/s);

      const enumFields = {};
      
      if (enumsMatch) {
        const enumsContent = enumsMatch[1];
        const enumRegex = /(\w+):\s*{[^}]*values:\s*%w\[([\w\s]+)\]/g;
        let enumMatch;
        
        while ((enumMatch = enumRegex.exec(enumsContent)) !== null) {
          const [_, fieldName, valuesStr] = enumMatch;
          enumFields[fieldName] = valuesStr.split(/\s+/);
        }
      }
      
      // Match field definitions with their types
      const fieldRegex = /field :(\w+)(?:,\s*type:\s*(\w+))?/g;
      let match;
      
      while ((match = fieldRegex.exec(content)) !== null) {
        const [_, fieldName, fieldType = 'String'] = match;
        const field = {
          name: fieldName,
          type: fieldType,
          required: content.includes(`validates :${fieldName}, presence: true`)
        };

        // If this field is an enum, add its values
        if (enumFields[fieldName]) {
          field.enumValues = enumFields[fieldName];
        }

        fields.push(field);
      }

      // Add default fields with their types
      const defaultFields = [
        { name: 'id', type: 'String', required: true },
        { name: 'created_at', type: 'DateTime', required: true },
        { name: 'updated_at', type: 'DateTime', required: true }
      ];

      defaultFields.forEach(field => {
        if (!fields.some(f => f.name === field.name)) {
          fields.push(field);
        }
      });

      return fields;
    } catch (error) {
      // Return default fields with types if there's an error
      return [
        { name: 'id', type: 'String', required: true },
        { name: 'created_at', type: 'DateTime', required: true },
        { name: 'updated_at', type: 'DateTime', required: true }
      ];
    }
  }

  // Helper method to capitalize first letter
  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Helper method to convert to camel case
  _toCamelCase(str) {
    return str.replace(/[-_]([a-z])/g, g => g[1].toUpperCase());
  }

  // Helper method to convert to snake case
  _toSnakeCase(str) {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  // Helper method for proper pluralization
  _pluralize(str) {
    // Common irregular plurals
    const irregulars = {
      'person': 'people',
      'man': 'men',
      'child': 'children',
      'foot': 'feet',
      'tooth': 'teeth',
      'goose': 'geese',
      'mouse': 'mice'
    };

    if (irregulars[str.toLowerCase()]) {
      return irregulars[str.toLowerCase()];
    }

    // Rules for regular plurals
    if (str.match(/[sxz]$/)) {
      return str + 'es';
    }
    if (str.match(/[^aeiou]y$/)) {
      return str.replace(/y$/, 'ies');
    }
    if (str.match(/(ch|sh|ss)$/)) {
      return str + 'es';
    }
    return str + 's';
  }

  // Helper method to process template content
  _processTemplate(templatePath, data) {
    try {
      const templateContent = fs.readFileSync(this.templatePath(templatePath), 'utf8');
      
      // Add helper functions to template data
      const templateData = {
        ...data,
        h: {
          capitalize: this._capitalize.bind(this),
          toCamelCase: this._toCamelCase.bind(this),
          pluralize: this._pluralize.bind(this),
          toSnakeCase: this._toSnakeCase.bind(this)
        }
      };

      // Use EJS to render the template
      const ejs = require('ejs');
      return ejs.render(templateContent, templateData);
    } catch (error) {
      this.log.error(`Error processing template ${templatePath}:`, error);
      return '';
    }
  }

  // Helper method to write or update file
  _writeFile(filePath, content) {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (error) {
      this.log.error(`Error writing file ${filePath}:`, error);
    }
  }

  async prompting() {
    // Get available platforms
    const platforms = this._getPlatforms();
    
    if (platforms.length === 0) {
      this.log.error('No platforms found in frontend/src/app/platforms');
      return;
    }

    // First prompt: Choose platform
    const platformAnswers = await handlePrompt(this, [
      {
        type: 'list',
        name: 'platform',
        message: 'Choose a platform:',
        choices: platforms
      }
    ]);

    this.selectedPlatform = platformAnswers.platform;

    // Get pages for selected platform
    const pages = this._getPages(this.selectedPlatform);

    if (pages.length === 0) {
      this.log.error(`No pages found in ${this.selectedPlatform}/pages`);
      return;
    }

    // Second prompt: Choose page
    const pageAnswers = await handlePrompt(this, [
      {
        type: 'list',
        name: 'page',
        message: 'Choose a page:',
        choices: pages
      }
    ]);

    this.selectedPage = pageAnswers.page;

    // Third prompt: Choose CRUD type
    const crudAnswers = await handlePrompt(this, [
      {
        type: 'list',
        name: 'crudType',
        message: 'Which CRUD type would you like to create?',
        choices: this.crudTypes
      }
    ]);

    this.selectedCrudType = crudAnswers.crudType;

    // Fourth prompt: Choose backend model
    const models = this._getModels();
    if (models.length === 0) {
      this.log.error('No models found in backend');
      return;
    }

    const modelAnswers = await handlePrompt(this, [
      {
        type: 'list',
        name: 'model',
        message: 'Choose a backend model:',
        choices: models
      }
    ]);

    this.selectedModel = modelAnswers.model;

    // Get available fields from the model
    const { fields, relationships } = this._getModelFields(this.selectedModel);

    if (fields.length === 0) {
      this.log.error('No fields found in the model');
      return;
    }

    // Fifth prompt: Choose display fields
    const fieldAnswers = await handlePrompt(this, [
      {
        type: 'checkbox',
        name: 'displayFields',
        message: 'Select fields to display in the table:',
        choices: fields,
        validate: input => {
          if (input.length < 1) {
            return 'Please select at least 1 field';
          }
          return true;
        }
      }
    ]);

    this.selectedFields = fieldAnswers.displayFields;

    // Sixth prompt: Choose sort field
    const sortFieldAnswer = await handlePrompt(this, [
      {
        type: 'list',
        name: 'sortField',
        message: 'Choose the default sort field:',
        choices: this.selectedFields
      }
    ]);

    this.defaultSortField = sortFieldAnswer.sortField;
  }

  writing() {
    if (!this.selectedPlatform || !this.selectedPage || !this.selectedModel || !this.selectedFields) {
      this.log.error('Missing required configuration');
      return;
    }

    const { fields, relationships } = this._getModelFields(this.selectedModel);
    const fieldsWithTypes = this._getModelFieldsWithTypes(this.selectedModel);

    const templateData = {
      platform: this.selectedPlatform,
      selectedPage: this.selectedPage,
      modelName: this.selectedModel,
      fields: this.selectedFields,
      formFields: fields.filter(field => !['id', 'created_at', 'updated_at'].includes(field)),
      defaultSortField: this.defaultSortField,
      allModelFields: fields,
      relationships,
      fieldsWithTypes: fieldsWithTypes,
      h: {
        capitalize: this._capitalize.bind(this),
        toCamelCase: this._toCamelCase.bind(this),
        pluralize: this._pluralize.bind(this),
        toSnakeCase: this._toSnakeCase.bind(this)
      }
    };

    // Process and write TypeScript file
    const tsContent = this._processTemplate('table-crud/page.ts.ejs', templateData);
    this._writeFile(path.join(this.destinationPath(), this.platformsPath, this.selectedPlatform, 'pages', this.selectedPage, `${this.selectedPage}.page.ts`), tsContent);

    // Process and write HTML file
    const htmlContent = this._processTemplate('table-crud/page.html.ejs', templateData);
    this._writeFile(path.join(this.destinationPath(), this.platformsPath, this.selectedPlatform, 'pages', this.selectedPage, `${this.selectedPage}.page.html`), htmlContent);

    // Process and write SCSS file
    const scssContent = this._processTemplate('table-crud/page.scss.ejs', templateData);
    this._writeFile(path.join(this.destinationPath(), this.platformsPath, this.selectedPlatform, 'pages', this.selectedPage, `${this.selectedPage}.page.scss`), scssContent);

    this.log(`Generated Table CRUD files in ${this.destinationPath()}${this.platformsPath}${this.selectedPlatform}pages${this.selectedPage}`);
  }
}; 
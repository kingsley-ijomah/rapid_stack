const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const utils = require('../../lib/utils');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.backendPath = './backend';
    this.schemaPath = path.join(this.backendPath, '_schema');
    this.modelsPath = path.join(this.backendPath, 'app', 'models');
    this.graphqlTypesPath = path.join(this.backendPath, 'app', 'graphql', 'types');
    
    // Add debug option
    this.option('debug', {
      desc: 'Enable debug mode',
      type: Boolean,
      default: false
    });
  }

  async prompting() {
    // Get list of available schema files
    const schemaFiles = this._getSchemaFiles();
    
    if (schemaFiles.length === 0) {
      this.log('No schema files found in the _schema directory.');
      return;
    }
    
    // Ask which schema file to undo
    this.answers = await this.prompt([
      {
        type: 'list',
        name: 'schemaFile',
        message: 'Which schema would you like to remove?',
        choices: schemaFiles
      },
      {
        type: 'confirm',
        name: 'confirmRemove',
        message: 'This will delete model files created by this schema. Continue?',
        default: false
      }
    ]);
    
    if (!this.answers.confirmRemove) {
      this.log('Schema removal cancelled.');
      return;
    }
    
    // Load and parse the selected schema file
    this.schemaData = this._loadSchemaFile(this.answers.schemaFile);
  }

  writing() {
    if (!this.schemaData || !this.schemaData.models) {
      return;
    }
    
    this.log(`Removing models from schema: ${this.answers.schemaFile}`);
    
    // Process each model in the schema
    Object.keys(this.schemaData.models).forEach(modelName => {
      const modelData = this.schemaData.models[modelName];
      if (!modelData || !modelData.attributes) {
        return;
      }
      
      this.log(`Removing model: ${modelName}`);
      
      // Process attributes to find enum fields
      const enumFields = this._findEnumFields(modelData.attributes);
      
      // Remove the model file
      this._removeModelFile(modelName);
      
      // Remove the GraphQL type file
      this._removeGraphQLTypeFile(modelName);
      
      // Remove any enum type files
      this._removeEnumTypeFiles(modelName, enumFields);
    });
    
    this.log('Schema removal completed successfully!');
  }
  
  // Helper method to get list of schema files
  _getSchemaFiles() {
    if (!fs.existsSync(this.schemaPath)) {
      return [];
    }
    
    return fs.readdirSync(this.schemaPath)
      .filter(file => file.endsWith('.yml'))
      .sort((a, b) => b.localeCompare(a)); // Sort in reverse order (newest first)
  }
  
  // Helper method to load and parse a schema file
  _loadSchemaFile(filename) {
    const filePath = path.join(this.schemaPath, filename);
    
    try {
      // Try the manual parsing approach first
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      if (this.options.debug) {
        this.log('Original file content:');
        this.log(fileContent);
      }
      
      // Parse the schema manually
      const models = {};
      let currentModel = null;
      let inAttributes = false;
      
      fileContent.split('\n').forEach(line => {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) {
          return;
        }
        
        // Check for model definition
        const modelMatch = line.match(/^\s{2}([A-Za-z0-9]+):/);
        if (modelMatch) {
          currentModel = modelMatch[1];
          models[currentModel] = { attributes: {} };
          inAttributes = false;
          return;
        }
        
        // Check for attributes section
        if (line.match(/^\s{4}attributes:/) && currentModel) {
          inAttributes = true;
          return;
        }
        
        // Parse attribute
        if (inAttributes && currentModel) {
          const attrMatch = line.match(/^\s{6}([a-zA-Z0-9_]+):\s+(.*)/);
          if (attrMatch) {
            const [, fieldName, fieldValue] = attrMatch;
            models[currentModel].attributes[fieldName] = fieldValue;
            
            if (this.options.debug) {
              this.log(`Parsed attribute: ${currentModel}.${fieldName} = ${fieldValue}`);
            }
          }
        }
      });
      
      if (Object.keys(models).length > 0) {
        if (this.options.debug) {
          this.log('Parsed models:');
          this.log(JSON.stringify(models, null, 2));
        }
        return { models };
      }
      
      // If manual parsing didn't work, try the YAML parser
      this.log('Manual parsing did not find any models, trying YAML parser...');
      
      // Preprocess the YAML content to handle the special format
      // First, handle Enum fields with values and default
      fileContent = fileContent.replace(/^(\s+)([a-zA-Z0-9_]+):\s+Enum\[(.*?)\](?:\(default:\s+(.*?)\))?(\s+required:\s+[a-zA-Z]+)?/gm,
        (match, indent, fieldName, enumValues, defaultValue, required) => {
          const requiredPart = required || '';
          return `${indent}${fieldName}: "Enum[${enumValues}]${defaultValue ? `(default: ${defaultValue})` : ''}${requiredPart}"`;
        }
      );
      
      // Then, handle "Type(default: value) required: true" format
      fileContent = fileContent.replace(/^(\s+)([a-zA-Z0-9_]+):\s+([a-zA-Z]+)\(default:\s+([^)]+)\)(\s+required:\s+[a-zA-Z]+)/gm,
        (match, indent, fieldName, fieldType, defaultValue, required) => {
          return `${indent}${fieldName}: "${fieldType}(default: ${defaultValue})${required}"`;
        }
      );
      
      // Finally, handle simple "Type required: true" format
      fileContent = fileContent.replace(/^(\s+)([a-zA-Z0-9_]+):\s+([^:\n]+)(\s+required:\s+[a-zA-Z]+)/gm, 
        (match, indent, fieldName, fieldType, required) => {
          // Skip if already processed (contains quotes)
          if (fieldType.includes('"')) return match;
          return `${indent}${fieldName}: "${fieldType.trim()}${required}"`;
        }
      );
      
      if (this.options.debug) {
        this.log('Preprocessed YAML:');
        this.log(fileContent);
      }
      
      return yaml.load(fileContent);
    } catch (error) {
      this.log(`Error loading schema file: ${error.message}`);
      return null;
    }
  }
  
  // Helper method to find enum fields in attributes
  _findEnumFields(attributes) {
    const enumFields = [];
    
    Object.keys(attributes).forEach(attrName => {
      const attrValue = attributes[attrName];
      
      if (typeof attrValue === 'string') {
        // Check for various enum patterns
        const isEnum = 
          attrValue.startsWith('Enum[') || 
          attrValue.includes('Enum[') || 
          attrValue.includes('enum_values') ||
          // Check for specific enum field names that are commonly used
          attrName === 'role' || 
          attrName === 'status' || 
          attrName.endsWith('_type') || 
          attrName.endsWith('_status') || 
          attrName.endsWith('_role');
        
        if (isEnum) {
          enumFields.push({
            name: attrName
          });
          
          if (this.options.debug) {
            this.log(`Detected enum field: ${attrName} with value: ${attrValue}`);
          }
        }
      }
    });
    
    return enumFields;
  }
  
  // Helper method to remove a model file
  _removeModelFile(modelName) {
    const fileName = utils.camelToSnake(modelName);
    const filePath = path.join(this.modelsPath, `${fileName}.rb`);
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        this.log(`Removed model file: ${filePath}`);
      } catch (error) {
        this.log(`Error removing model file ${filePath}: ${error.message}`);
      }
    } else {
      this.log(`Model file not found: ${filePath}`);
    }
  }
  
  // Helper method to remove a GraphQL type file
  _removeGraphQLTypeFile(modelName) {
    const fileName = utils.camelToSnake(modelName);
    const filePath = path.join(this.graphqlTypesPath, `${fileName}_type.rb`);
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        this.log(`Removed GraphQL type file: ${filePath}`);
      } catch (error) {
        this.log(`Error removing GraphQL type file ${filePath}: ${error.message}`);
      }
    } else {
      this.log(`GraphQL type file not found: ${filePath}`);
    }
  }
  
  // Helper method to remove enum type files
  _removeEnumTypeFiles(modelName, enumFields) {
    if (!Array.isArray(enumFields) || enumFields.length === 0) {
      return;
    }
    
    this.log(`Found ${enumFields.length} enum fields for ${modelName}`);
    
    // Remove each enum type file
    enumFields.forEach(field => {
      const fileName = utils.camelToSnake(modelName);
      const fieldName = utils.camelToSnake(field.name);
      
      // Try both naming conventions
      const filePaths = [
        path.join(this.graphqlTypesPath, `${fileName}_${fieldName}_enum_type.rb`),
        path.join(this.graphqlTypesPath, `${fileName}_${fieldName}_enum.rb`)
      ];
      
      let fileRemoved = false;
      
      filePaths.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            this.log(`Removed enum type file: ${filePath}`);
            fileRemoved = true;
          } catch (error) {
            this.log(`Error removing enum type file ${filePath}: ${error.message}`);
          }
        }
      });
      
      if (!fileRemoved) {
        this.log(`Enum type file not found for ${modelName}.${field.name}`);
      }
    });
  }
}; 
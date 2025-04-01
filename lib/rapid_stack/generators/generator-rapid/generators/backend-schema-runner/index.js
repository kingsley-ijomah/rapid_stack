const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const utils = require('../../lib/utils');
const { handlePrompt } = require('../../lib/utils');

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
    
    // Map of YAML types to Ruby types
    this.typeMapping = {
      'String': 'String',
      'Integer': 'Integer',
      'Float': 'Float',
      'Boolean': 'Boolean',
      'Time': 'Time',
      'Date': 'Date',
      'DateTime': 'DateTime',
      'Array': 'Array',
      'Hash': 'Hash',
      'Object': 'Object',
      'Enum': 'String', // Changed to String for better compatibility with enum values
      'Polymorphic': 'String' // For polymorphic relationships
    };
  }

  async prompting() {
    // Get list of available schema files
    const schemaFiles = this._getSchemaFiles();
    
    if (schemaFiles.length === 0) {
      this.log('No schema files found in the _schema directory.');
      return;
    }
    
    // Ask which schema file to run
    this.answers = await handlePrompt(this, [
      {
        type: 'list',
        name: 'schemaFile',
        message: 'Which schema file would you like to use?',
        choices: schemaFiles
      },
      {
        type: 'confirm',
        name: 'confirmRun',
        message: 'This will generate model files based on the schema. Continue?',
        default: true
      }
    ]);
    
    if (!this.answers.confirmRun) {
      this.log('Schema generation cancelled.');
      return;
    }
    
    // Load and parse the selected schema file
    this.schemaData = this._loadSchemaFile(this.answers.schemaFile);
    
    // Debug the schema data
    if (this.schemaData) {
      this._debugSchema();
    } else {
      this.log('Failed to parse schema file. Please check the format.');
    }
  }

  writing() {
    if (!this.schemaData || !this.schemaData.models) {
      return;
    }
    
    this.log(`Running schema: ${this.answers.schemaFile}`);
    
    // Process each model in the schema
    Object.keys(this.schemaData.models).forEach(modelName => {
      const modelData = this.schemaData.models[modelName];
      if (!modelData || !modelData.attributes) {
        return;
      }
      
      this.log(`Generating model: ${modelName}`);
      
      // Process attributes into fields
      const fields = this._processAttributes(modelData.attributes, modelName);
      
      // Process relationships
      const relationships = this._extractRelationships(modelData.attributes, modelName);
      
      // Generate the model file
      this._generateModelFile(modelName, fields, relationships);
      
      // Generate the GraphQL type file
      this._generateGraphQLTypeFile(modelName, fields, relationships);
    });
    
    this.log('Schema generation completed successfully!');
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
      // Read the file content
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      if (this.options.debug) {
        this.log('Original file content:');
        this.log(fileContent);
      }
      
      // Try to parse as YAML directly first
      try {
        const parsedYaml = yaml.load(fileContent);
        if (parsedYaml && parsedYaml.models) {
          return parsedYaml;
        }
      } catch (yamlError) {
        this.log('YAML parsing failed, trying manual parsing...');
      }
      
      // Parse the schema manually if YAML parsing fails
      const models = {};
      let currentModel = null;
      let inAttributes = false;
      let currentAttribute = null;
      let indentLevel = 0;
      
      fileContent.split('\n').forEach(line => {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) {
          return;
        }
        
        // Calculate indent level
        indentLevel = line.search(/\S/);
        
        // Check for model definition (2 spaces)
        const modelMatch = line.match(/^\s{2}([A-Za-z0-9]+):/);
        if (modelMatch) {
          currentModel = modelMatch[1];
          models[currentModel] = { attributes: {} };
          inAttributes = false;
          currentAttribute = null;
          return;
        }
        
        // Check for attributes section (4 spaces)
        if (line.match(/^\s{4}attributes:/) && currentModel) {
          inAttributes = true;
          return;
        }
        
        // Parse attribute (6 spaces)
        if (inAttributes && currentModel) {
          const attrMatch = line.match(/^\s{6}([a-zA-Z0-9_]+):/);
          if (attrMatch) {
            currentAttribute = attrMatch[1];
            models[currentModel].attributes[currentAttribute] = {};
            return;
          }
          
          // Parse attribute properties (8 spaces)
          const propMatch = line.match(/^\s{8}([a-zA-Z0-9_]+):\s*(.*)/);
          if (propMatch && currentAttribute) {
            const [, propName, propValue] = propMatch;
            if (propValue.trim() === '') {
              // This is a nested property
              models[currentModel].attributes[currentAttribute][propName] = {};
            } else {
              // This is a value property
              models[currentModel].attributes[currentAttribute][propName] = propValue.trim();
            }
            return;
          }
          
          // Parse nested validation properties (10 spaces)
          const validationMatch = line.match(/^\s{10}([a-zA-Z0-9_]+):\s*(.*)/);
          if (validationMatch && currentAttribute) {
            const [, validationType, validationValue] = validationMatch;
            if (!models[currentModel].attributes[currentAttribute].validates) {
              models[currentModel].attributes[currentAttribute].validates = {};
            }
            models[currentModel].attributes[currentAttribute].validates[validationType] = validationValue ? 
              { message: validationValue.replace(/^"(.*)"$/, '$1') } : 
              true;
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
      
      this.log('Failed to parse schema file');
      return null;
    } catch (error) {
      this.log(`Error loading schema file: ${error.message}`);
      return null;
    }
  }
  
  // Helper method to process attributes from schema format to fields format
  _processAttributes(attributes, modelName) {
    const fields = [];
    
    Object.keys(attributes).forEach(attrName => {
      let attrValue = attributes[attrName];
      
      // Skip polymorphic fields - they're handled in relationships
      if (typeof attrValue === 'string' && attrValue.includes('Polymorphic')) {
        fields.push({
          name: `${attrName}_id`,
          type: 'BSON::ObjectId',
          required: false,
          is_polymorphic_id: true
        });
        return;
      }
      
      let field = { name: attrName };
      
      // Handle different attribute formats
      if (typeof attrValue === 'object') {
        // New format with nested type and validations
        field.type = attrValue.type || 'String';
        
        // Handle enum type with values
        if (attrValue.values) {
          field.type = 'Enum';
          field.enum_values = attrValue.values;
          field.default = attrValue.default || field.enum_values[0];
        }
        
        // Handle default value
        if (attrValue.default !== undefined) {
          field.default = attrValue.default;
          if (field.type === 'Boolean') {
            field.default = field.default === true || field.default === 'true';
          }
        }
        
        // Handle validations
        if (attrValue.validates) {
          field.validations = attrValue.validates;
          // Check for presence validation to set required flag
          if (attrValue.validates.presence) {
            field.required = true;
          }
        }
        
        // Handle relationship fields
        if (field.type.includes('has_many') || field.type.includes('belongs_to')) {
          // Skip relationship fields as they're handled by _extractRelationships
          return;
        }
      } else if (typeof attrValue === 'string') {
        // Legacy format support
        field.required = attrValue.includes('required: true');
        
        // Parse the attribute value - get the type part
        let type = attrValue.split(' ')[0];
        
        // Check if it's an enum type with values
        if (type.startsWith('Enum[')) {
          field.type = 'Enum';
          
          // Extract enum values and default
          const enumMatch = attrValue.match(/Enum\[(.*?)\](?:\(default: (.*?)\))?/);
          if (enumMatch) {
            field.enum_values = enumMatch[1].split(',').map(v => v.trim());
            field.default = enumMatch[2] || field.enum_values[0];
          }
        } else if (attrValue.includes('(default:')) {
          // Handle type with default value
          const defaultMatch = attrValue.match(/(.*?)\(default: (.*?)\)/);
          if (defaultMatch) {
            field.type = defaultMatch[1];
            field.default = defaultMatch[2];
            
            // Handle boolean defaults
            if (field.type === 'Boolean') {
              field.default = field.default === 'true';
            }
          } else {
            field.type = type;
          }
        } else {
          field.type = type;
        }
        
        // Skip relationship fields
        if (field.type.includes('has_many') || field.type.includes('belongs_to')) {
          return;
        }
      } else {
        // Default handling if not a string or object
        field.type = 'String';
      }
      
      // Map to Ruby type
      field.type = this.typeMapping[field.type] || 'String';
      
      fields.push(field);
    });
    
    return fields;
  }
  
  // Helper method to extract relationships from attributes
  _extractRelationships(attributes, modelName) {
    const relationships = [];
    const bidirectionalRelationships = {};
    
    Object.keys(attributes).forEach(attrName => {
      let attrValue = attributes[attrName];
      
      // Check if this is a relationship field
      if (typeof attrValue === 'object') {
        // Handle polymorphic relationships
        if (attrValue.type && attrValue.type.includes('Polymorphic')) {
          // Extract referenced models if specified
          let referencedModels = [];
          const polymorphicMatch = attrValue.type.match(/Polymorphic\[(.*?)\]/);
          if (polymorphicMatch && polymorphicMatch[1]) {
            referencedModels = polymorphicMatch[1].split(',').map(model => model.trim());
          }
          
          relationships.push({
            type: 'belongs_to',
            model: attrName,
            polymorphic: true,
            modelSnakeCase: utils.camelToSnake(attrName),
            referencedModels: referencedModels
          });
          return;
        }
        
        // Handle fields ending with _id that define relationships
        if (attrName.endsWith('_id')) {
          // Extract the base model name (e.g., company_id -> Company)
          const relatedModel = utils.toPascalCase(attrName.slice(0, -3));
          
          // Check if there's a relationship type defined
          const relType = this._getRelationshipType(attrValue.type);
          
          if (relType) {
            // This is a bidirectional relationship
            // Current model belongs_to the related model
            relationships.push({
              type: 'belongs_to',
              model: relatedModel,
              foreign_key: attrName,
              // Add snake_case model name for proper naming
              modelSnakeCase: utils.camelToSnake(relatedModel)
            });
            
            // Store the inverse relationship to be added to the related model
            if (!bidirectionalRelationships[relatedModel]) {
              bidirectionalRelationships[relatedModel] = [];
            }
            
            // Add the inverse relationship
            bidirectionalRelationships[relatedModel].push({
              type: relType,
              model: modelName,
              foreign_key: attrName,
              // Add snake_case model name for proper naming
              modelSnakeCase: utils.camelToSnake(modelName),
              // Add pluralized model name for has_many relationships
              pluralizedModel: relType === 'has_many' ? utils.pluralize(utils.camelToSnake(modelName)) : utils.camelToSnake(modelName)
            });
          } else {
            // Default to belongs_to if no relationship type is specified
            relationships.push({
              type: 'belongs_to',
              model: relatedModel,
              foreign_key: attrName,
              // Add snake_case model name for proper naming
              modelSnakeCase: utils.camelToSnake(relatedModel)
            });
          }
        }
      } else if (typeof attrValue === 'string') {
        // Legacy format support
        // Handle polymorphic relationships
        if (attrValue.includes('Polymorphic')) {
          // Extract referenced models if specified
          let referencedModels = [];
          const polymorphicMatch = attrValue.match(/Polymorphic\[(.*?)\]/);
          if (polymorphicMatch && polymorphicMatch[1]) {
            referencedModels = polymorphicMatch[1].split(',').map(model => model.trim());
          }
          
          relationships.push({
            type: 'belongs_to',
            model: attrName,
            polymorphic: true,
            modelSnakeCase: utils.camelToSnake(attrName),
            referencedModels: referencedModels
          });
          return;
        }
        
        // Handle fields ending with _id that define relationships
        if (attrName.endsWith('_id')) {
          // Extract the base model name (e.g., company_id -> Company)
          const relatedModel = utils.toPascalCase(attrName.slice(0, -3));
          
          // Check if there's a relationship type defined
          const relType = this._getRelationshipType(attrValue);
          
          if (relType) {
            // This is a bidirectional relationship
            // Current model belongs_to the related model
            relationships.push({
              type: 'belongs_to',
              model: relatedModel,
              foreign_key: attrName,
              // Add snake_case model name for proper naming
              modelSnakeCase: utils.camelToSnake(relatedModel)
            });
            
            // Store the inverse relationship to be added to the related model
            if (!bidirectionalRelationships[relatedModel]) {
              bidirectionalRelationships[relatedModel] = [];
            }
            
            // Add the inverse relationship
            bidirectionalRelationships[relatedModel].push({
              type: relType,
              model: modelName,
              foreign_key: attrName,
              // Add snake_case model name for proper naming
              modelSnakeCase: utils.camelToSnake(modelName),
              // Add pluralized model name for has_many relationships
              pluralizedModel: relType === 'has_many' ? utils.pluralize(utils.camelToSnake(modelName)) : utils.camelToSnake(modelName)
            });
          } else {
            // Default to belongs_to if no relationship type is specified
            relationships.push({
              type: 'belongs_to',
              model: relatedModel,
              foreign_key: attrName,
              // Add snake_case model name for proper naming
              modelSnakeCase: utils.camelToSnake(relatedModel)
            });
          }
        }
      }
    });
    
    // Store the bidirectional relationships for later use when generating the related models
    if (!this.bidirectionalRelationships) {
      this.bidirectionalRelationships = {};
    }
    
    Object.keys(bidirectionalRelationships).forEach(relatedModel => {
      if (!this.bidirectionalRelationships[relatedModel]) {
        this.bidirectionalRelationships[relatedModel] = [];
      }
      
      this.bidirectionalRelationships[relatedModel] = [
        ...this.bidirectionalRelationships[relatedModel],
        ...bidirectionalRelationships[relatedModel]
      ];
    });
    
    return relationships;
  }
  
  // Helper method to extract relationship type from attribute value
  _getRelationshipType(value) {
    const relationshipTypes = [
      'has_many',
      'has_one',
      'has_and_belongs_to_many',
      'embeds_one',
      'embeds_many'
    ];
    
    // Check if the value starts with any of the relationship types
    for (const type of relationshipTypes) {
      if (value.startsWith(type)) {
        return type;
      }
    }
    
    return null;
  }
  
  // Helper method to generate a model file
  _generateModelFile(model, fields, relationships) {
    this.log(`Generating model file for ${model}...`);
    
    // Process validations for each field
    fields.forEach(field => {
      if (field.validations) {
        field.validationStatements = [];
        Object.entries(field.validations).forEach(([validationType, validationConfig]) => {
          let validationStatement = `validates :${field.name}, ${validationType}: true`;
          
          // Handle validation options
          if (typeof validationConfig === 'object') {
            const options = [];
            
            // Handle message option
            if (validationConfig.message) {
              options.push(`message: "${validationConfig.message}"`);
            }
            
            // Handle other validation-specific options
            if (validationType === 'numericality') {
              if (validationConfig.greater_than !== undefined) {
                options.push(`greater_than: ${validationConfig.greater_than}`);
              }
              if (validationConfig.less_than !== undefined) {
                options.push(`less_than: ${validationConfig.less_than}`);
              }
              if (validationConfig.only_integer !== undefined) {
                options.push(`only_integer: ${validationConfig.only_integer}`);
              }
            } else if (validationType === 'length') {
              if (validationConfig.minimum !== undefined) {
                options.push(`minimum: ${validationConfig.minimum}`);
              }
              if (validationConfig.maximum !== undefined) {
                options.push(`maximum: ${validationConfig.maximum}`);
              }
            } else if (validationType === 'format') {
              if (validationConfig.with) {
                options.push(`with: ${validationConfig.with}`);
              }
            }
            
            if (options.length > 0) {
              validationStatement = `validates :${field.name}, ${validationType}: { ${options.join(', ')} }`;
            }
          }
          
          field.validationStatements.push(validationStatement);
        });
      }
    });

    // Check for enum fields
    const enumFields = fields.filter(field => field.type === 'Enum' || (field.enum_values && field.enum_values.length > 0));
    if (enumFields.length > 0) {
      this.log(`Found ${enumFields.length} enum fields for ${model}: ${enumFields.map(f => f.name).join(', ')}`);
    }

    // Add bidirectional relationships if they exist
    if (this.bidirectionalRelationships && this.bidirectionalRelationships[model]) {
      this.log(`Adding ${this.bidirectionalRelationships[model].length} bidirectional relationships to ${model}`);
      relationships = [...relationships, ...this.bidirectionalRelationships[model]];
    }

    // Add inverse polymorphic relationships if this model is referenced by polymorphic fields
    if (this.polymorphicRelationships && this.polymorphicRelationships[model]) {
      this.log(`Adding ${this.polymorphicRelationships[model].length} polymorphic inverse relationships to ${model}`);
      relationships = [...relationships, ...this.polymorphicRelationships[model]];
    }

    let outputPath = '';
    
    // Special handling for User and Company models
    if (model === 'User') {
      // Find role field and prepare role enum
      const roleField = fields.find(f => f.name === 'role');
      let roleEnum = "admin: 'admin', manager: 'manager', user: 'user'"; // Default roles
      
      if (roleField && roleField.enum_values && roleField.enum_values.length > 0) {
        // Format role enum values as key-value pairs
        roleEnum = roleField.enum_values
          .map(value => {
            const key = this._snakeToCamel(value);
            return `${key}: '${value}'`;
          })
          .join(', ');
      }
      
      // Generate User model with special template
      outputPath = `${this.backendPath}/app/models/user.rb`;
      this.fs.copyTpl(
        this.templatePath('user.rb.template'),
        this.destinationPath(outputPath),
        { 
          fields,
          relationships,
          roleEnum,
          utils
        }
      );
    } else if (model === 'Company') {
      // Add code field if not present for Company model
      if (!fields.some(f => f.name === 'code')) {
        fields.push({
          name: 'code',
          type: 'String',
          required: false
        });
      }
      
      // Generate Company model with special template
      outputPath = `${this.backendPath}/app/models/company.rb`;
      this.fs.copyTpl(
        this.templatePath('company.rb.template'),
        this.destinationPath(outputPath),
        { 
          fields, 
          relationships,
          utils
        }
      );
    } else {
      // Generate generic model
      // Use utils.camelToSnake to ensure proper snake_case conversion
      const fileName = utils.camelToSnake(model);
      this.log(`Model file name: ${fileName}.rb`);
      outputPath = `${this.backendPath}/app/models/${fileName}.rb`;
      this.fs.copyTpl(
        this.templatePath('generic_model.rb.template'),
        this.destinationPath(outputPath),
        { 
          modelName: model,
          fields,
          relationships,
          utils
        }
      );
    }
    
    // Post-process the file to remove multiple consecutive blank lines
    this.on('end', () => {
      try {
        if (fs.existsSync(outputPath)) {
          let content = fs.readFileSync(outputPath, 'utf8');
          // Replace multiple consecutive blank lines with a single blank line
          content = content.replace(/\n{3,}/g, '\n\n');
          fs.writeFileSync(outputPath, content);
          this.log(`Post-processed ${outputPath} to remove extra blank lines`);
        }
      } catch (error) {
        this.log(`Error post-processing file: ${error.message}`);
      }
    });
  }
  
  // Helper method to generate a GraphQL type file
  _generateGraphQLTypeFile(modelName, fields, relationships) {
    this.log(`Generating GraphQL type file for ${modelName}...`);
    
    // Create GraphQL types directory if it doesn't exist
    if (!fs.existsSync(this.graphqlTypesPath)) {
      fs.mkdirSync(this.graphqlTypesPath, { recursive: true });
    }
    
    // Add bidirectional relationships if they exist
    if (this.bidirectionalRelationships && this.bidirectionalRelationships[modelName]) {
      this.log(`Adding ${this.bidirectionalRelationships[modelName].length} bidirectional relationships to ${modelName} GraphQL type`);
      relationships = [...relationships, ...this.bidirectionalRelationships[modelName]];
    }

    // Add inverse polymorphic relationships if this model is referenced by polymorphic fields
    if (this.polymorphicRelationships && this.polymorphicRelationships[modelName]) {
      this.log(`Adding ${this.polymorphicRelationships[modelName].length} polymorphic inverse relationships to ${modelName} GraphQL type`);
      relationships = [...relationships, ...this.polymorphicRelationships[modelName]];
    }
    
    // Generate the main type file
    // Use utils.camelToSnake to ensure proper snake_case conversion
    const fileName = utils.camelToSnake(modelName);
    this.log(`GraphQL type file name: ${fileName}_type.rb`);
    const typeFilePath = path.join(this.graphqlTypesPath, `${fileName}_type.rb`);
    this.fs.copyTpl(
      this.templatePath('generic_type.rb.template'),
      this.destinationPath(typeFilePath),
      {
        modelName,
        fields,
        relationships,
        utils
      }
    );
    this.log(`Created GraphQL type file at ${typeFilePath}`);
    
    // Generate enum type files if needed
    this._generateEnumTypeFiles(modelName, fields);
  }
  
  // Helper method to generate GraphQL enum type files
  _generateEnumTypeFiles(modelName, fields) {
    // Find enum fields
    const enumFields = fields.filter(field => 
      field.type === 'Enum' && field.enum_values && field.enum_values.length > 0
    );
    
    if (enumFields.length === 0) {
      return;
    }
    
    this.log(`Found ${enumFields.length} enum fields for ${modelName}`);
    
    // Generate an enum type file for each enum field
    enumFields.forEach(enumField => {
      // Use utils.camelToSnake to ensure proper snake_case conversion
      const modelFileName = utils.camelToSnake(modelName);
      const enumTypeFilePath = path.join(
        this.graphqlTypesPath, 
        `${modelFileName}_${enumField.name}_enum_type.rb`
      );
      
      this.fs.copyTpl(
        this.templatePath('enum_type.rb.template'),
        this.destinationPath(enumTypeFilePath),
        {
          modelName,
          enumField
        }
      );
      
      this.log(`Created GraphQL enum type file at ${enumTypeFilePath}`);
    });
  }
  
  // Helper method to convert snake_case to PascalCase for class names
  _toClassName(str) {
    return utils.toPascalCase(str);
  }

  // Helper method to convert snake_case to camelCase for class names
  _snakeToCamel(str) {
    return utils.toCamelCase(str);
  }

  // Helper method to convert camelCase to snake_case for filenames
  _camelToSnake(str) {
    return utils.camelToSnake(str);
  }

  // Helper method to debug the schema data
  _debugSchema() {
    this.log('\nSchema parsed successfully. Structure:');
    
    if (!this.schemaData.models) {
      this.log('No models found in schema.');
      return;
    }
    
    Object.keys(this.schemaData.models).forEach(modelName => {
      this.log(`\nModel: ${modelName}`);
      
      const modelData = this.schemaData.models[modelName];
      if (!modelData.attributes) {
        this.log('  No attributes found.');
        return;
      }
      
      this.log('  Attributes:');
      Object.keys(modelData.attributes).forEach(attrName => {
        this.log(`    ${attrName}: ${modelData.attributes[attrName]}`);
      });
      
      // Process and show fields
      const fields = this._processAttributes(modelData.attributes, modelName);
      this.log('  Processed Fields:');
      fields.forEach(field => {
        let fieldInfo = `    ${field.name}: ${field.type}`;
        if (field.required) fieldInfo += ' (required)';
        if (field.default !== undefined) fieldInfo += ` (default: ${field.default})`;
        if (field.enum_values) fieldInfo += ` (enum values: ${field.enum_values.join(', ')})`;
        this.log(fieldInfo);
      });
      
      // Process and show relationships
      const relationships = this._extractRelationships(modelData.attributes, modelName);
      if (relationships.length > 0) {
        this.log('  Relationships:');
        relationships.forEach(rel => {
          this.log(`    ${rel.type} ${rel.model} (${rel.foreign_key})`);
        });
      }
    });
  }
}; 
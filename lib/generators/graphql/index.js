const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const utils = require('../../lib/utils');
const { handlePrompt } = require('../../lib/utils');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.option('fields', { type: String });
    this.option('timestamps', { type: Boolean, default: true });
    
    // Add frontend paths
    this.frontendPath = './frontend';
    this.graphqlPath = 'frontend/src/app/graphql';
  }

  // Helper method for proper pluralization
  _pluralize(str) {
    return utils.pluralize(str);
  }

  _getAvailableModels() {
    const modelsPath = path.join(process.cwd(), 'backend/app/models');
    if (!fs.existsSync(modelsPath)) {
      return [];
    }

    // Define system models that should be excluded
    const systemModels = ['jwt_denylist', 'otp', 'two_factor'];

    // Get all models and filter out system models
    const models = fs.readdirSync(modelsPath)
      .filter(file => file.endsWith('.rb'))
      .map(file => file.replace('.rb', ''))
      .filter(model => !systemModels.includes(model));

    // If 'user' exists in the models, move it to the top
    if (models.includes('user')) {
      const userIndex = models.indexOf('user');
      models.splice(userIndex, 1); // Remove 'user' from its current position
      models.unshift('user'); // Add 'user' to the beginning of the array
    }

    return models;
  }

  _getModelFields(modelName) {
    const modelPath = path.join(process.cwd(), 'backend/app/models', `${modelName}.rb`);
    if (!fs.existsSync(modelPath)) {
      return [];
    }

    const content = fs.readFileSync(modelPath, 'utf8');
    const fields = [];
    
    // Extract all field definitions with a more flexible approach
    const modelContent = content.toString();
    const fieldRegex = /field\s+:(\w+)/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(modelContent)) !== null) {
      const fieldName = fieldMatch[1];
      // Skip internal Mongoid fields and timestamps
      if (!['_id', 'created_at', 'updated_at'].includes(fieldName)) {
        const lineRegex = new RegExp(`field\\s+:${fieldName}.*$`, 'm');
        const lineMatch = modelContent.match(lineRegex);
        let fieldType = 'String'; // Default to String
        
        if (lineMatch) {
          const typeMatch = lineMatch[0].match(/type:\s+(\w+)/);
          if (typeMatch) {
            fieldType = typeMatch[1];
          }
        }
        
        fields.push({
          name: fieldName,
          type: this._convertMongoTypeToGraphQL(fieldType)
        });
      }
    }

    // Extract enum fields
    const enumsMatch = modelContent.match(/ENUMS\s*=\s*\{([^}]+)\}/s);
    if (enumsMatch) {
      const enumsContent = enumsMatch[1];
      const enumFieldRegex = /(\w+):/g;
      let enumFieldMatch;
      
      while ((enumFieldMatch = enumFieldRegex.exec(enumsContent)) !== null) {
        const enumFieldName = enumFieldMatch[1];
        if (!fields.some(f => f.name === enumFieldName)) {
          fields.push({
            name: enumFieldName,
            type: 'String'
          });
        }
      }
    }

    // Extract belongs_to relationships
    const belongsToRegex = /belongs_to\s+:(\w+)/g;
    let relationMatch;
    
    while ((relationMatch = belongsToRegex.exec(modelContent)) !== null) {
      const relationName = relationMatch[1];
      if (relationName === 'company') {
        continue;
      }
      
      const relationIdField = `${relationName}_id`;
      if (!fields.some(f => f.name === relationIdField)) {
        fields.push({
          name: relationIdField,
          type: 'ID',
          isRelationship: true
        });
      }
    }

    return fields;
  }

  async prompting() {
    const availableModels = this._getAvailableModels();
    const permissionLevels = [
      'ensure_all_groups',
      'admin_or_platform_admin',
      'admin',
      'platform_admin'
    ];

    this.answers = await handlePrompt(this, [
      {
        type: 'list',
        name: 'mutationType',
        message: 'What type of operation would you like to generate?',
        choices: ['crud', 'single']
      },
      {
        type: 'list',
        name: 'operationType',
        message: 'What type of operation would you like to generate?',
        choices: ['mutation', 'query'],
        when: (answers) => answers.mutationType === 'single'
      },
      {
        type: 'checkbox',
        name: 'models',
        message: 'Select the model(s):',
        choices: availableModels,
        validate: input => input.length < 1 ? 'Select at least one model.' : true,
        default: this.options.askAnswered ? availableModels : [availableModels[0]]
      }
    ]);

    // Build an array of selected model objects with extra details.
    this.selectedModels = [];
    for (const model of this.answers.models) {
      // Use the original model name (in snake_case) for file paths
      const baseName = model;
      const capitalizedName = _.upperFirst(_.camelCase(model));
      this.log(`\n=== Creating permissions for ${capitalizedName} ===\n`);
      const modelFields = this._getModelFields(model);
      let operations = {};
      let crudPermissions = {};
      if (this.answers.mutationType === 'crud') {
        const crudOperations = ['create', 'update', 'delete', 'list', 'show'];
        for (const operation of crudOperations) {
          const { permission } = await handlePrompt(this, [
            {
              type: 'list',
              name: 'permission',
              message: `Select permission level for ${operation} ${baseName}:`,
              choices: permissionLevels
            }
          ]);
          crudPermissions[operation] = permission;
        }
        operations = {
          create: `create${capitalizedName}`,
          update: `update${capitalizedName}`,
          delete: `delete${capitalizedName}`,
          list: `list${capitalizedName}s`,
          show: `show${capitalizedName}`
        };
      } else {
        const { permission, name } = await handlePrompt(this, [
          {
            type: 'list',
            name: 'permission',
            message: 'Select the permission level:',
            choices: permissionLevels
          },
          {
            type: 'input',
            name: 'name',
            message: this.answers.operationType === 'mutation' ?
              `Enter the mutation name for ${baseName} using camelCase:` :
              `Enter the query name for ${baseName} using camelCase:`
          }
        ]);
        crudPermissions = { single: permission };
        operations = { single: name };
      }
      this.selectedModels.push({ model, baseName, capitalizedName, modelFields, operations, crudPermissions });
    }
  }

  writing() {
    if (this.answers.mutationType === 'crud') {
      for (const modelObj of this.selectedModels) {
        // Generate backend files
        this._generateCrudMutations(modelObj);
        
        // Generate frontend files
        this._generateFrontendGraphQLFiles(modelObj.model, modelObj.modelFields.map(f => f.name));
      }
    } else {
      if (this.answers.operationType === 'mutation') {
        for (const modelObj of this.selectedModels) {
          this._generateSingleMutation(modelObj);
        }
      } else {
        for (const modelObj of this.selectedModels) {
          this._generateSingleQuery(modelObj);
        }
      }
    }

    this.log('Created GraphQL files successfully!');
  }

  _generateFrontendGraphQLFiles(modelName, fields) {
    const snakeCaseModelName = _.snakeCase(modelName);
    const camelCaseModelName = _.camelCase(modelName);
    
    const queriesPath = path.join(this.graphqlPath, 'queries', snakeCaseModelName);
    const mutationsPath = path.join(this.graphqlPath, 'mutations', snakeCaseModelName);

    fs.mkdirSync(queriesPath, { recursive: true });
    fs.mkdirSync(mutationsPath, { recursive: true });

    const { fields: regularFields, relationshipFields } = this._getGraphQLTypeFields(modelName);
    
    // Define sensitive fields to exclude for User model
    const sensitiveUserFields = [
      'encrypted_password',
      'reset_password_token',
      'reset_password_sent_at',
      'remember_created_at',
      'reset_password_token_expires_at',
      'role'
    ];

    // Filter out sensitive fields if this is the User model
    const filteredRegularFields = modelName === 'user' 
      ? regularFields.filter(field => {
          const fieldSnakeCase = _.snakeCase(field.name);
          return !sensitiveUserFields.includes(fieldSnakeCase);
        })
      : regularFields;

    // Only use regular fields, exclude relationship fields completely
    const regularFieldsString = filteredRegularFields
      .map(field => _.camelCase(field.name))
      .join('\n        ');

    // Filter only belongs_to relationships and format them with just the ID
    const belongsToRelationships = relationshipFields
      .filter(field => field.relationshipType === 'belongsTo')
      .map(field => `${_.camelCase(field.name)} { id }`)
      .join('\n        ');
    
    // Combine regular fields and belongsTo relationships
    const allFieldsString = `${regularFieldsString}${belongsToRelationships ? '\n        ' + belongsToRelationships : ''}`;

    // Use plural form for the list query
    const pluralCamelCaseModelName = this._pluralize(camelCaseModelName);
    
    const listQueryContent = `import { gql } from 'apollo-angular';

export const List${this._capitalize(pluralCamelCaseModelName)}Query = gql\`
  query list${this._capitalize(pluralCamelCaseModelName)}($page: Int, $perPage: Int, $orderDirection: String, $filters: JSON) {
    list${this._capitalize(pluralCamelCaseModelName)}(page: $page, perPage: $perPage, orderDirection: $orderDirection, filters: $filters) {
      data {
        id
        ${allFieldsString}
        createdAt
        updatedAt
      }
      errors
      message
      httpStatus
      options {
        totalPages
        totalCount
        currentPage
        perPage
        prevPage
        nextPage
      }
    }
  }
\`;`;
    // Use plural form for the list query file name
    const listQueryFile = path.join(queriesPath, `list${this._capitalize(pluralCamelCaseModelName)}.query.ts`);
    this._writeFile(listQueryFile, listQueryContent);
    this.log(`    create ${listQueryFile}`);

    const showQueryContent = `import { gql } from 'apollo-angular';

export const Show${this._capitalize(camelCaseModelName)}Query = gql\`
  query show${this._capitalize(camelCaseModelName)}($id: ID!) {
    show${this._capitalize(camelCaseModelName)}(id: $id) {
      data {
        id
        ${allFieldsString}
        createdAt
        updatedAt
      }
      errors
      message
      httpStatus
    }
  }
\`;`;
    const showQueryFile = path.join(queriesPath, `show${this._capitalize(camelCaseModelName)}.query.ts`);
    this._writeFile(showQueryFile, showQueryContent);
    this.log(`    create ${showQueryFile}`);

    ['create', 'update', 'delete'].forEach(operation => {
      const mutationContent = this._processTemplate(`graphql/${operation}.mutation.ts.ejs`, {
        modelName: camelCaseModelName,
        fields: regularFields,
        allFields: regularFields,
        regularFields: regularFields,
        relationshipFields: relationshipFields.filter(field => field.relationshipType === 'belongsTo'),
        h: {
          toPascalCase: this._toPascalCaseWithCompoundWords.bind(this),
          capitalize: this._capitalize.bind(this),
          toCamelCase: this._camelCase.bind(this)
        }
      });
      const mutationFile = path.join(mutationsPath, `${operation}${this._capitalize(camelCaseModelName)}.mutation.ts`);
      this._writeFile(mutationFile, mutationContent);
      this.log(`    create ${mutationFile}`);
    });
  }

  _ensureBaseQueryExists() {
    const baseQueryDir = 'backend/app/graphql/queries';
    const baseQueryPath = path.join(baseQueryDir, 'base_query.rb');

    if (!fs.existsSync(baseQueryDir)) {
      fs.mkdirSync(baseQueryDir, { recursive: true });
    }

    if (!fs.existsSync(baseQueryPath)) {
      const content = `# frozen_string_literal: true

module Queries
  # Base query class
  class BaseQuery < GraphQL::Schema::Resolver
    include SharedGraphqlMethods
    include ServiceResponse
    include Paginatable

    # Get the current user
    def current_user
      context[:current_user]
    end

    # Get the current user's company
    def company
      current_user.company
    end
  end
end`;
      fs.writeFileSync(baseQueryPath, content);
    }
  }

  _generateSingleMutation(modelObj) {
    const { baseName, capitalizedName, modelFields, operations, crudPermissions } = modelObj;
    const opName = _.camelCase(operations.single);
    const snakeCaseName = _.snakeCase(modelObj.model);
    const snakeCaseOpName = this._toSnakeCase(opName);
    const modelName = capitalizedName;
    
    const mutationDir = `backend/app/graphql/mutations/${snakeCaseName}_mutations`;
    
    const isCreate = opName.toLowerCase().startsWith('create');
    const isUpdate = opName.toLowerCase().startsWith('update');
    const isDelete = opName.toLowerCase().startsWith('delete');
  
    let fields = [...modelFields];
    if (isUpdate || isDelete) {
      fields.unshift({ name: 'id', type: 'ID' });
    }
  
    if (isUpdate) {
      fields = fields.map(field => ({ ...field, required: false }));
    }
  
    if (isDelete) {
      fields = fields.slice(0, 1);
    }
    
    this.fs.copyTpl(
      this.templatePath('single/mutation.rb'),
      this.destinationPath(`${mutationDir}/${snakeCaseOpName}.rb`),
      {
        name: _.upperFirst(opName),
        modelName,
        operationName: opName,
        fields,
        permission: crudPermissions.single,
        isCreate,
        isUpdate,
        isDelete
      }
    );
  
    this._updateMutationType(modelObj);
  }  

  _generateSingleQuery(modelObj) {
    this.log(`Generating single query for ${modelObj.baseName} is not yet implemented.`);
  }

  _convertMongoTypeToGraphQL(mongoType) {
    const typeMap = {
      'String': 'String',
      'Integer': 'Int',
      'Float': 'Float',
      'Boolean': 'Boolean',
      'Time': 'String',
      'Date': 'String',
      'DateTime': 'String',
      'Array': 'String',
      'Hash': 'String',
      'Object': 'String'
    };

    return typeMap[mongoType] || 'String';
  }

  _generateMutationContent(mutationName, modelName) {
    const capitalizedMutationName = this._capitalize(mutationName);
    const capitalizedModelName = this._capitalize(modelName);
    const fields = this._getModelFields(modelName);

    const argumentDefinitions = fields
      .map(field => `      argument :${field.name}, ${field.type}, required: true`)
      .join('\n');

    const resolveParams = fields
      .map(field => `${field.name}:`)
      .join(', ');

    const permissionCode = this.answers.permission !== 'none' 
      ? `\n      require_permission :${this.answers.permission}\n\n      before_action :check_permission\n`
      : '';

    return `# frozen_string_literal: true

module Mutations
  module ${capitalizedModelName}Mutations
    # ${capitalizedMutationName} mutation
    class ${capitalizedMutationName} < Mutations::BaseMutation
      # Define the input arguments for the mutation
${argumentDefinitions}

      return_type Types::${capitalizedModelName}Type${permissionCode}

      def resolve(${resolveParams})
        super
        # Add your mutation logic here
      end
    end
  end
end
`;
  }

  _toSnakeCase(str) {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  _updateMutationType(modelObj) {
    const mutationTypePath = path.join(process.cwd(), 'backend/app/graphql/types/mutation_type.rb');

    if (fs.existsSync(mutationTypePath)) {
      let content = fs.readFileSync(mutationTypePath, 'utf8');
      content = content.replace(/(\S+.*?)\s+end(\s*)$/gm, '$1\n  end$2');
      
      let lines = content.split('\n');
      const classLineIndex = lines.findIndex(line => line.includes('class MutationType'));
      
      if (classLineIndex === -1) {
        this.log.error('Could not find class definition');
        return;
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().includes(' end') && !line.trim().startsWith('end')) {
          const parts = line.split(/\s+end\s*/);
          if (parts.length > 1) {
            lines[i] = parts[0];
            lines.splice(i + 1, 0, '  end');
          }
        }
      }

      const lastFieldIndex = lines.findLastIndex((line, index) => 
        line.trim().startsWith('field :')
      );

      const insertIndex = lastFieldIndex !== -1 ? lastFieldIndex + 1 : classLineIndex + 1;

      let newFields = [];
      if (this.answers.mutationType === 'crud') {
        const { baseName, capitalizedName, operations, crudPermissions } = modelObj;
        const mutationsToAdd = ['create', 'update', 'delete'];
        
        mutationsToAdd.forEach(operation => {
          const mutationName = operations[operation];
          if (!lines.some(line => line.includes(`field :${mutationName},`))) {
            newFields.push(
              `    field :${mutationName}, mutation: Mutations::${capitalizedName}Mutations::${_.upperFirst(mutationName)}`
            );
          }
        });
      } else if (this.answers.operationType === 'mutation') {
        const mutationName = modelObj.operations.single;
        const capName = _.upperFirst(mutationName);
        const modelName = modelObj.capitalizedName;
        
        if (!lines.some(line => line.includes(`field :${mutationName},`))) {
          newFields.push(
            `    field :${mutationName}, mutation: Mutations::${modelName}Mutations::${capName}`
          );
        }
      }

      let classEndIndex = lines.findIndex((line, index) => 
        line.trim() === 'end' && index > classLineIndex
      );
      let moduleEndIndex = lines.findIndex((line, index) => 
        line.trim() === 'end' && index > (classEndIndex !== -1 ? classEndIndex : classLineIndex)
      );

      if (classEndIndex === -1) {
        lines.push('  end');
        classEndIndex = lines.length - 1;
      }
      if (moduleEndIndex === -1) {
        lines.push('end');
        moduleEndIndex = lines.length - 1;
      }

      if (lastFieldIndex !== -1 && classEndIndex === lastFieldIndex + 1) {
        lines.splice(classEndIndex, 0, '');
        classEndIndex++;
        if (moduleEndIndex !== -1) moduleEndIndex++;
      }

      if (newFields.length > 0) {
        if (lastFieldIndex !== -1) {
          newFields.unshift('');
        }
        
        lines = [
          ...lines.slice(0, insertIndex),
          ...newFields,
          ...lines.slice(insertIndex, classEndIndex - 1),
          '',
          ...lines.slice(classEndIndex)
        ];
      }

      content = lines.join('\n') + '\n';
      fs.writeFileSync(mutationTypePath, content);
    }
  }

  _updateQueryType(modelObj) {
    // Update query_type.rb for the given model
    const queryTypePath = path.join(process.cwd(), 'backend/app/graphql/types/query_type.rb');
    if (!fs.existsSync(queryTypePath)) return;
  
    let content = fs.readFileSync(queryTypePath, 'utf8');
  
    const lines = content.split('\n');
  
    let endCount = 0;
    let classEndIndex = lines.length - 1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() === 'end') {
        endCount++;
        if (endCount === 2) {
          classEndIndex = i;
          break;
        }
      }
    }
  
    const { baseName, capitalizedName } = modelObj;
    
    // Properly handle PascalCase for compound words
    const pluralBaseName = this._pluralize(baseName);
    
    // First convert to camelCase, then ensure proper PascalCase with capitalized words
    const camelCasePluralName = _.camelCase(pluralBaseName);
    
    // For compound words like "shiftInterest", we need to ensure each word is capitalized
    // This will convert "shiftinterest" to "ShiftInterest"
    const pascalCasePluralName = this._toPascalCaseWithCompoundWords(camelCasePluralName);
    
    const listFieldName = 'list' + pascalCasePluralName;
    const showFieldName = 'show' + capitalizedName;
  
    const newFields = [
      `    field :${listFieldName}, resolver: Queries::${pascalCasePluralName}Queries::List${pascalCasePluralName}`,
      `    field :${showFieldName}, resolver: Queries::${pascalCasePluralName}Queries::Show${capitalizedName}`
    ];
  
    const fieldsToInsert = newFields.filter(field => !content.includes(field));
  
    if (fieldsToInsert.length > 0) {
      lines.splice(classEndIndex, 0, ...fieldsToInsert, '');
      content = lines.join('\n');
      fs.writeFileSync(queryTypePath, content);
    }
  }
  
  // Helper method to convert camelCase to PascalCase with proper handling of compound words
  _toPascalCaseWithCompoundWords(str) {
    // Handle common compound words that should be properly capitalized
    const compoundWords = {
      'shiftinterest': 'ShiftInterest',
      'shiftinterests': 'ShiftInterests',
      'userbranch': 'UserBranch',
      'userbranches': 'UserBranches'
    };
    
    // Check if the string is a known compound word
    if (compoundWords[str.toLowerCase()]) {
      return compoundWords[str.toLowerCase()];
    }
    
    // Otherwise, use a general approach to capitalize each word
    // First, ensure the first letter is capitalized
    let result = str.charAt(0).toUpperCase() + str.slice(1);
    
    // Then find word boundaries in camelCase and capitalize them
    // This regex looks for lowercase letters followed by uppercase letters
    // and inserts a space between them, then capitalizes each word
    result = result.replace(/([a-z])([A-Z])/g, '$1 $2')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join('');
    
    return result;
  }

  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  _camelCase(str) {
    return _.camelCase(str);
  }

  // Helper method to process template content
  _processTemplate(templatePath, data) {
    try {
      const templateContent = fs.readFileSync(this.templatePath(templatePath), 'utf8');
      const utils = require('../../lib/utils');
      
      const templateData = {
        ...data,
        h: {
          capitalize: this._capitalize.bind(this),
          pluralize: utils.pluralize,
          toCamelCase: utils.toCamelCase,
          toSnakeCase: utils.toSnakeCase,
          toPascalCase: utils.toPascalCase,
          camelToSnake: utils.camelToSnake
        }
      };

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
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (error) {
      this.log.error(`Error writing file ${filePath}:`, error);
    }
  }

  _generateCrudMutations(modelObj) {
    const { baseName, capitalizedName, modelFields, operations, crudPermissions } = modelObj;
    // Use snake_case for file names but CamelCase for module names
    const snakeCaseName = _.snakeCase(modelObj.model);
    const pluralSnakeCaseName = this._pluralize(snakeCaseName);
    // Use proper PascalCase for directory names
    const pluralizedDirName = `${pluralSnakeCaseName}_queries`;
    const moduleBaseName = _.camelCase(modelObj.model);
    const moduleName = _.upperFirst(moduleBaseName);
    
    // Ensure proper PascalCase for module names with compound words
    const camelCasePluralName = _.camelCase(this._pluralize(moduleBaseName));
    const pluralModuleName = this._toPascalCaseWithCompoundWords(camelCasePluralName);
  
    // Ensure base query file exists
    this._ensureBaseQueryExists();
  
    // Create directories using snake_case names
    const mutationDir = `backend/app/graphql/mutations/${snakeCaseName}_mutations`;
    const queryDir = `backend/app/graphql/queries/${pluralizedDirName}`;
  
    if (!fs.existsSync(mutationDir)) {
      fs.mkdirSync(mutationDir, { recursive: true });
    }
    if (!fs.existsSync(queryDir)) {
      fs.mkdirSync(queryDir, { recursive: true });
    }
  
    // Generate mutations (create, update, delete)
    const mutations = ['create', 'update', 'delete'];
    mutations.forEach(operation => {
      const templatePath = this.templatePath(`crud/${operation}.rb`);
      const destinationPath = this.destinationPath(`${mutationDir}/${operation}_${snakeCaseName}.rb`);
      
      console.log(`Generating ${operation} mutation for ${capitalizedName}`);
      console.log(`Template path: ${templatePath}`);
      console.log(`Destination path: ${destinationPath}`);
      
      // For create and update operations, we need to include all fields
      // For delete, we only need the ID field
      let fieldsToUse = [...modelFields];
      if (operation === 'update' || operation === 'delete') {
        // Add ID field for update and delete operations
        fieldsToUse.unshift({ name: 'id', type: 'ID' });
      }
      
      if (operation === 'update') {
        // For update, all fields are optional
        fieldsToUse = fieldsToUse.map(field => ({ ...field, required: false }));
      }
      
      if (operation === 'delete') {
        // For delete, we only need the ID field
        fieldsToUse = fieldsToUse.slice(0, 1);
      }
      
      // Generate the mutation file
      this.fs.copyTpl(
        templatePath,
        destinationPath,
        { 
          name: capitalizedName,
          baseName: moduleBaseName,
          operationName: operations[operation],
          fields: fieldsToUse,
          permission: crudPermissions[operation],
          moduleName,
          pluralName: pluralModuleName,
          h: {
            capitalize: this._capitalize.bind(this)
          }
        }
      );
    });
  
    // Generate queries (list, show)
    const queries = ['list', 'show'];
    queries.forEach(operation => {
      const fileName = operation === 'list' ? 
        `list_${pluralSnakeCaseName}.rb` : 
        `show_${snakeCaseName}.rb`;
      
      // Create the proper module name for the query file (PascalCase with compound words)
      const moduleNameForFile = pluralModuleName;
  
      this.fs.copyTpl(
        this.templatePath(`crud/${operation}.rb`),
        this.destinationPath(`${queryDir}/${fileName}`),
        {
          name: capitalizedName,
          baseName: moduleBaseName,
          pluralName: pluralModuleName,
          capitalizedPluralName: moduleNameForFile,
          operationName: operations[operation],
          fields: modelFields,
          permission: crudPermissions[operation],
          moduleName: moduleNameForFile,
          h: {
            capitalize: this._capitalize.bind(this)
          }
        }
      );
    });
  
    // Update mutation_type.rb and query_type.rb with the new fields
    this._updateMutationType(modelObj);
    this._updateQueryType(modelObj);
  }

  _getGraphQLTypeFields(modelName) {
    const snakeCaseModelName = _.snakeCase(modelName);
    const typeFilePath = path.join(process.cwd(), 'backend/app/graphql/types', `${snakeCaseModelName}_type.rb`);
    
    if (!fs.existsSync(typeFilePath)) {
      return { fields: [], relationshipFields: [] };
    }

    // First, let's get the model file to identify actual relationships
    const modelPath = path.join(process.cwd(), 'backend/app/models', `${modelName}.rb`);
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
          // Process as a relationship field as before
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
};

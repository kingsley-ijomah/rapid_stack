const Generator = require('yeoman-generator');
const { toCamelCase, toPascalCase, handlePrompt, toSnakeCase } = require('../../lib/utils');
const fs = require('fs');
const path = require('path');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.standardTypes = [
      'ID',
      'String',
      'Int',
      'Float',
      'Boolean',
      '[ ID ]',
      '[ String ]',
      '[ Int ]',
      '[ Float ]',
      '[ Boolean ]'
    ];
  }

  async _removeEndpoint() {
    const answers = await handlePrompt(this, [
      {
        type: 'input',
        name: 'endpointName',
        message: 'Enter the endpoint name to remove (e.g., searchMovies):',
        validate: input => input.length > 0 ? true : 'Endpoint name is required'
      }
    ]);

    const snakeCaseName = toSnakeCase(answers.endpointName);
    const camelCaseName = toCamelCase(answers.endpointName);

    console.log('\nRemoving generated files...');

    // Remove type file
    const typeFilePath = path.join('backend', 'app', 'graphql', 'types', `${snakeCaseName}_type.rb`);
    if (fs.existsSync(typeFilePath)) {
      fs.unlinkSync(typeFilePath);
      console.log(`\n✓ Removed type file: ${typeFilePath}`);
    }

    // Remove query files and folder
    const queriesFolderPath = path.join('backend', 'app', 'graphql', 'queries', snakeCaseName);
    const queriesFilePath = path.join(queriesFolderPath, `${snakeCaseName}.rb`);
    
    if (fs.existsSync(queriesFilePath)) {
      fs.unlinkSync(queriesFilePath);
      console.log(`\n✓ Removed query file: ${queriesFilePath}`);
    }

    if (fs.existsSync(queriesFolderPath)) {
      fs.rmdirSync(queriesFolderPath);
      console.log(`\n✓ Removed query folder: ${queriesFolderPath}`);
    }

    // Remove response type file
    const responseTypePath = path.join('backend', 'app', 'graphql', 'types', `${snakeCaseName}_response_type.rb`);
    if (fs.existsSync(responseTypePath)) {
      fs.unlinkSync(responseTypePath);
      console.log(`\n✓ Removed response type file: ${responseTypePath}`);
    }

    // Remove service file
    const serviceFilePath = path.join('backend', 'app', 'services', 'external_api', `${snakeCaseName}_service.rb`);
    if (fs.existsSync(serviceFilePath)) {
      fs.unlinkSync(serviceFilePath);
      console.log(`\n✓ Removed service file: ${serviceFilePath}`);
    }

    // Remove field from query_type.rb
    const queryTypePath = path.join('backend', 'app', 'graphql', 'types', 'query_type.rb');
    if (fs.existsSync(queryTypePath)) {
      let content = fs.readFileSync(queryTypePath, 'utf8');
      const fieldPattern = new RegExp(`field :${camelCaseName},.*\\n`);
      content = content.replace(fieldPattern, '');
      
      // Find all "end" statements
      const endIndices = [];
      let index = content.indexOf('end');
      while (index !== -1) {
        endIndices.push(index);
        index = content.indexOf('end', index + 3);
      }
      
      // If we have at least two "end" statements
      if (endIndices.length >= 2) {
        // Get the second-to-last "end" index
        let secondToLastEndIndex = endIndices[endIndices.length - 2];
        
        // Remove the last two "end" statements and add properly indented "end" statements
        content = content.slice(0, secondToLastEndIndex) + '\n' + `  end` + '\n' + 'end';
      }
      
      fs.writeFileSync(queryTypePath, content);
      console.log(`\n✓ Removed field from query_type.rb: ${camelCaseName}`);
    }

    // Exit the process after removal
    process.exit(0);
  }

  async prompting() {
    // Handle removal mode first
    if (this.options.rm) {
      await this._removeEndpoint();
    }

    // Normal generation flow
    const answers = await handlePrompt(this, [
      {
        type: 'input',
        name: 'endpointName',
        message: 'Enter the endpoint name (e.g., searchMovies):',
        validate: input => input.length > 0 ? true : 'Endpoint name is required'
      },
      {
        type: 'confirm',
        name: 'createQueryType',
        message: 'Would you like to create the query type entry?',
        default: true
      },
      {
        type: 'confirm',
        name: 'createResponseFields',
        message: 'Would you like to create the response fields?',
        default: true
      },
      {
        type: 'confirm',
        name: 'createQueries',
        message: 'Would you like to create the queries folder and file?',
        default: true
      },
      {
        type: 'confirm',
        name: 'createService',
        message: 'Would you like to create the API service?',
        default: true
      }
    ]);

    const camelCaseName = toCamelCase(answers.endpointName);
    const pascalCaseName = toPascalCase(answers.endpointName);
    const snakeCaseName = toSnakeCase(answers.endpointName);
    
    console.log(`\nEndpoint name in camelCase: ${camelCaseName}`);

    if (answers.createService) {
      const serviceAnswers = await handlePrompt(this, [
        {
          type: 'input',
          name: 'baseUrl',
          message: 'Enter the base URL for the API (e.g., https://api.themoviedb.org/3):',
          validate: input => input.length > 0 ? true : 'Base URL is required'
        },
        {
          type: 'input',
          name: 'endpoint',
          message: 'Enter the API endpoint (e.g., /search/movie):',
          validate: input => input.length > 0 ? true : 'Endpoint is required'
        },
        {
          type: 'input',
          name: 'apiKeyEnvVar',
          message: 'Enter the environment variable name for the API key (e.g., TMDB_API_KEY):',
          validate: input => input.length > 0 ? true : 'API key environment variable name is required'
        },
      ]);

      // Create service file
      const serviceFilePath = path.join('backend', 'app', 'services', 'external_api', `${snakeCaseName}_service.rb`);
      const serviceTemplatePath = this.templatePath('service.rb.ejs');
      
      // Create directory if it doesn't exist
      const serviceDir = path.dirname(serviceFilePath);
      if (!fs.existsSync(serviceDir)) {
        fs.mkdirSync(serviceDir, { recursive: true });
      }

      this.fs.copyTpl(
        serviceTemplatePath,
        serviceFilePath,
        {
          pascalCaseName,
          camelCaseName,
          baseUrl: serviceAnswers.baseUrl,
          endpoint: serviceAnswers.endpoint,
          apiKeyEnvVar: serviceAnswers.apiKeyEnvVar
        }
      );
      console.log(`\n✓ Created service file: ${serviceFilePath}`);
    }
    
    if (answers.createQueryType) {
      const queryTypePath = path.join('backend', 'app', 'graphql', 'types', 'query_type.rb');
      
      if (fs.existsSync(queryTypePath)) {
        let content = fs.readFileSync(queryTypePath, 'utf8');
        
        // Find all "end" statements
        const endIndices = [];
        let index = content.indexOf('end');
        while (index !== -1) {
          endIndices.push(index);
          index = content.indexOf('end', index + 3);
        }
        
        // If we have at least two "end" statements
        if (endIndices.length >= 2) {
          // Get the second-to-last "end" index
          const secondToLastEndIndex = endIndices[endIndices.length - 2];
          
          // Check if field already exists
          const fieldPattern = new RegExp(`field :${camelCaseName},`);
          if (!fieldPattern.test(content)) {
            // Insert the new field before the second-to-last "end"
            const newField = `  field :${camelCaseName}, resolver: Queries::${pascalCaseName}Queries::${pascalCaseName}\n`;
            // Insert two end statements first indent 2 spaces second indent 0 space
            content = content.slice(0, secondToLastEndIndex) + newField + `  end` + '\n' + 'end';
            
            fs.writeFileSync(queryTypePath, content);
            console.log(`\n✓ Added field to query_type.rb: ${camelCaseName}`);
          } else {
            console.log(`\n✓ Field already exists in query_type.rb: ${camelCaseName}`);
          }
        } else {
          console.log('\n❌ Could not find appropriate position to insert field');
        }
      } else {
        console.log('\n❌ query_type.rb file not found');
      }
    }

    if (answers.createQueries) {
      const queriesFolderPath = path.join('backend', 'app', 'graphql', 'queries', snakeCaseName);
      const queriesFilePath = path.join(queriesFolderPath, `${snakeCaseName}.rb`);

      // Create folder if it doesn't exist
      if (!fs.existsSync(queriesFolderPath)) {
        fs.mkdirSync(queriesFolderPath, { recursive: true });
        console.log(`\n✓ Created queries folder: ${queriesFolderPath}`);
      }

      // Create file if it doesn't exist
      if (!fs.existsSync(queriesFilePath)) {
        const setupAnswers = await handlePrompt(this, [
          {
            type: 'confirm',
            name: 'hasArguments',
            message: 'Does this query require arguments?',
            default: true
          },
        ]);

        // Create query file
        const queryTemplatePath = this.templatePath('query.rb.ejs');
        this.fs.copyTpl(
          queryTemplatePath,
          queriesFilePath,
          {
            pascalCaseName,
            camelCaseName,
            hasArguments: setupAnswers.hasArguments
          }
        );
        console.log(`\n✓ Created queries file: ${queriesFilePath}`);

        // Create response type file
        const responseTypePath = path.join('backend', 'app', 'graphql', 'types', `${snakeCaseName}_response_type.rb`);
        const responseTypeTemplatePath = this.templatePath('response_type.rb.ejs');
        this.fs.copyTpl(
          responseTypeTemplatePath,
          responseTypePath,
          {
            pascalCaseName
          }
        );
        console.log(`\n✓ Created response type file: ${responseTypePath}`);
      } else {
        console.log(`\n✓ Queries file already exists: ${queriesFilePath}`);
      }
    }

    if (answers.createResponseFields) {
      const responseFields = [];
      let addMoreFields = true;

      while (addMoreFields) {
        const fieldAnswers = await handlePrompt(this, [
          {
            type: 'input',
            name: 'fieldName',
            message: 'Enter the response field name: (e.g., title)',
            validate: input => input.length > 0 ? true : 'Field name is required'
          },
          {
            type: 'list',
            name: 'fieldType',
            message: 'Select the field type:',
            choices: this.standardTypes
          }
        ]);

        responseFields.push({
          name: fieldAnswers.fieldName,
          type: fieldAnswers.fieldType
        });

        const continueAnswer = await handlePrompt(this, [
          {
            type: 'confirm',
            name: 'addMore',
            message: 'Would you like to add another response field?',
            default: true
          }
        ]);

        addMoreFields = continueAnswer.addMore;
      }

      // Store the response fields for now
      this.responseFields = responseFields;

      // Create the type file
      const typeFilePath = path.join('backend', 'app', 'graphql', 'types', `${snakeCaseName}_type.rb`);
      
      // Create the type file using the template
      const typeTemplatePath = this.templatePath('type.rb.ejs');
      this.fs.copyTpl(
        typeTemplatePath,
        typeFilePath,
        {
          pascalCaseName,
          fields: responseFields.map(field => ({
            name: toSnakeCase(field.name),
            type: field.type,
            nullable: true // Default to true for now, can be made configurable later
          }))
        }
      );
      console.log(`\n✓ Created type file: ${typeFilePath}`);
    }
  }
};

const path = require('path');
const fs = require('fs');
const { toCamelCase, toPascalCase, toSnakeCase } = require('../../../lib/utils');

class GraphQLHandler {
  constructor(generator) {
    this.generator = generator;
  }

  async addField(serviceName) {
    // Convert serviceName to camelCase and PascalCase for GraphQL
    const camelCaseName = toCamelCase(serviceName);
    const pascalCaseName = toPascalCase(serviceName);

    // Show what we're about to do
    this.generator.log('\nWe will now add a new GraphQL query field:');
    this.generator.log(`Field name: ${camelCaseName}`);
    this.generator.log(`Resolver path: Queries::${pascalCaseName}Queries::${pascalCaseName}`);

    // Ask for confirmation
    const { confirm } = await this.generator.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Would you like to proceed?',
      default: true
    }]);

    if (!confirm) {
      this.generator.log('\nOperation cancelled by user.');
      return;
    }

    // Add the GraphQL field
    await this._addGraphQLField(camelCaseName, pascalCaseName);
  }

  async _addGraphQLField(camelCaseName, pascalCaseName) {
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
          content = content.slice(0, secondToLastEndIndex) + newField + `  end` + '\n' + 'end';
          
          fs.writeFileSync(queryTypePath, content);
          this.generator.log(`\n✓ Added field to query_type.rb: ${camelCaseName}`);
        } else {
          this.generator.log(`\n✓ Field already exists in query_type.rb: ${camelCaseName}`);
        }
      } else {
        this.generator.log('\n❌ Could not find appropriate position to insert field');
      }
    } else {
      this.generator.log('\n❌ query_type.rb file not found');
    }
  }

  async createResponseType(serviceName) {
    const pascalCaseName = toPascalCase(serviceName);
    const snakeCaseName = toSnakeCase(serviceName);

    // Create response type file
    const responseTypePath = path.join('backend', 'app', 'graphql', 'types', `${snakeCaseName}_response_type.rb`);
    const responseTypeTemplatePath = path.join(__dirname, '..', 'templates', 'response_type.rb.ejs');

    if (fs.existsSync(responseTypePath)) {
      this.generator.log(`\n✓ Response type file already exists: ${responseTypePath}`);
      return;
    }

    this.generator.fs.copyTpl(
      responseTypeTemplatePath,
      responseTypePath,
      { pascalCaseName }
    );
    this.generator.log(`\n✓ Created response type file: ${responseTypePath}`);
  }

  async createType(serviceName, responseKeys) {
    const pascalCaseName = toPascalCase(serviceName);
    const snakeCaseName = toSnakeCase(serviceName);

    // Create type file
    const typePath = path.join('backend', 'app', 'graphql', 'types', `${snakeCaseName}_type.rb`);
    const typeTemplatePath = path.join(__dirname, '..', 'templates', 'type.rb.ejs');

    if (fs.existsSync(typePath)) {
      this.generator.log(`\n✓ Type file already exists: ${typePath}`);
      return;
    }

    // Format the fields for the template
    const fields = responseKeys.map(({ key, type }) => ({
      name: toCamelCase(key),
      type: type,
      nullable: true
    }));

    this.generator.fs.copyTpl(
      typeTemplatePath,
      typePath,
      { 
        pascalCaseName,
        fields
      }
    );
    this.generator.log(`\n✓ Created type file: ${typePath}`);
  }

  async createQuery(serviceName, responseKeys) {
    const pascalCaseName = toPascalCase(serviceName);
    const camelCaseName = toCamelCase(serviceName);
    const snakeCaseName = toSnakeCase(serviceName);

    // Create queries folder and file paths
    const queriesFolderPath = path.join('backend', 'app', 'graphql', 'queries', snakeCaseName);
    const queriesFilePath = path.join(queriesFolderPath, `${snakeCaseName}.rb`);

    // Create folder if it doesn't exist
    if (!fs.existsSync(queriesFolderPath)) {
      fs.mkdirSync(queriesFolderPath, { recursive: true });
      this.generator.log(`\n✓ Created queries folder: ${queriesFolderPath}`);
    }

    // Create file if it doesn't exist
    if (!fs.existsSync(queriesFilePath)) {
      // Create query file
      const queryTemplatePath = path.join(__dirname, '..', 'templates', 'query.rb.ejs');
      this.generator.fs.copyTpl(
        queryTemplatePath,
        queriesFilePath,
        {
          pascalCaseName,
          camelCaseName,
          resultsKey: this.generator.answers.resultsKey,
          responseKeys: this.generator.answers.responseKeys,
          toCamelCase: this.generator.toCamelCase
        }
      );
      this.generator.log(`\n✓ Created query file: ${queriesFilePath}`);
    } else {
      this.generator.log(`\n✓ Query file already exists: ${queriesFilePath}`);
    }
  }

  async createService(serviceName, serviceAnswers) {
    const pascalCaseName = toPascalCase(serviceName);
    const camelCaseName = toCamelCase(serviceName);
    const snakeCaseName = toSnakeCase(serviceName);

    // Create service file path
    const serviceFilePath = path.join('backend', 'app', 'services', 'external_api', `${snakeCaseName}_service.rb`);
    const serviceTemplatePath = path.join(__dirname, '..', 'templates', 'service.rb.ejs');

    // Create directory if it doesn't exist
    const serviceDir = path.dirname(serviceFilePath);
    if (!fs.existsSync(serviceDir)) {
      fs.mkdirSync(serviceDir, { recursive: true });
    }

    // Create service file
    this.generator.fs.copyTpl(
      serviceTemplatePath,
      serviceFilePath,
      {
        pascalCaseName,
        camelCaseName,
        baseUrl: serviceAnswers.baseUrl,
        endpoint: serviceAnswers.endpoint,
        apiKeyEnvVar: serviceAnswers.apiKeyEnvVar,
        queryParams: serviceAnswers.queryParams || []
      }
    );
    this.generator.log(`\n✓ Created service file: ${serviceFilePath}`);
  }

  async removeEndpoint(serviceName) {
    const snakeCaseName = toSnakeCase(serviceName);
    const camelCaseName = toCamelCase(serviceName);

    this.generator.log('\nRemoving generated files...');

    // Remove type file
    const typeFilePath = path.join('backend', 'app', 'graphql', 'types', `${snakeCaseName}_type.rb`);
    if (fs.existsSync(typeFilePath)) {
      fs.unlinkSync(typeFilePath);
      this.generator.log(`\n✓ Removed type file: ${typeFilePath}`);
    }

    // Remove query files and folder
    const queriesFolderPath = path.join('backend', 'app', 'graphql', 'queries', snakeCaseName);
    const queriesFilePath = path.join(queriesFolderPath, `${snakeCaseName}.rb`);
    
    if (fs.existsSync(queriesFilePath)) {
      fs.unlinkSync(queriesFilePath);
      this.generator.log(`\n✓ Removed query file: ${queriesFilePath}`);
    }

    if (fs.existsSync(queriesFolderPath)) {
      fs.rmdirSync(queriesFolderPath);
      this.generator.log(`\n✓ Removed query folder: ${queriesFolderPath}`);
    }

    // Remove response type file
    const responseTypePath = path.join('backend', 'app', 'graphql', 'types', `${snakeCaseName}_response_type.rb`);
    if (fs.existsSync(responseTypePath)) {
      fs.unlinkSync(responseTypePath);
      this.generator.log(`\n✓ Removed response type file: ${responseTypePath}`);
    }

    // Remove service file
    const serviceFilePath = path.join('backend', 'app', 'services', 'external_api', `${snakeCaseName}_service.rb`);
    if (fs.existsSync(serviceFilePath)) {
      fs.unlinkSync(serviceFilePath);
      this.generator.log(`\n✓ Removed service file: ${serviceFilePath}`);
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
      this.generator.log(`\n✓ Removed field from query_type.rb: ${camelCaseName}`);
    }
  }
}

module.exports = GraphQLHandler; 
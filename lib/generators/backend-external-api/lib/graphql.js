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
}

module.exports = GraphQLHandler; 
const Generator = require('yeoman-generator');
const { toCamelCase, toPascalCase, handlePrompt, toSnakeCase } = require('../../lib/utils');
const fs = require('fs');
const path = require('path');

module.exports = class extends Generator {
  async collectResponseFields() {
    const fields = [];
    let addMore = true;

    while (addMore) {
      const fieldAnswers = await handlePrompt(this, [
        {
          type: 'input',
          name: 'fieldName',
          message: 'Enter field name e.g: title (or press Enter to finish):',
          validate: input => {
            if (input === '') return true;
            return input.length > 0 ? true : 'Field name is required';
          }
        }
      ]);

      if (fieldAnswers.fieldName === '') {
        addMore = false;
        continue;
      }

      const typeAnswers = await handlePrompt(this, [
        {
          type: 'list',
          name: 'fieldType',
          message: `Select type for field "${fieldAnswers.fieldName}":`,
          choices: [
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
          ]
        }
      ]);

      fields.push({
        name: fieldAnswers.fieldName,
        type: typeAnswers.fieldType
      });
    }

    return fields;
  }

  async prompting() {
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
        name: 'createQueries',
        message: 'Would you like to create the queries folder and file?',
        default: true
      }
    ]);

    const camelCaseName = toCamelCase(answers.endpointName);
    const pascalCaseName = toPascalCase(answers.endpointName);
    const snakeCaseName = toSnakeCase(answers.endpointName);
    
    console.log(`\nEndpoint name in camelCase: ${camelCaseName}`);
    
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
      const hasArguments = await handlePrompt(this, [
        {
          type: 'confirm',
          name: 'hasArguments',
          message: 'Does this query require arguments?',
          default: true
        }
      ]);

      const responseFields = await this.collectResponseFields();

      const queriesFolderPath = path.join('backend', 'app', 'graphql', 'queries', snakeCaseName);
      const queriesFilePath = path.join(queriesFolderPath, `${snakeCaseName}.rb`);

      // Create folder if it doesn't exist
      if (!fs.existsSync(queriesFolderPath)) {
        fs.mkdirSync(queriesFolderPath, { recursive: true });
        console.log(`\n✓ Created queries folder: ${queriesFolderPath}`);
      }

      // Create file if it doesn't exist
      if (!fs.existsSync(queriesFilePath)) {
        // Create query file
        const queryTemplatePath = this.templatePath('query.rb.ejs');
        this.fs.copyTpl(
          queryTemplatePath,
          queriesFilePath,
          {
            pascalCaseName,
            hasArguments: hasArguments.hasArguments
          }
        );
        console.log(`\n✓ Created queries file: ${queriesFilePath}`);

        // Create type file
        const typePath = path.join('backend', 'app', 'graphql', 'types', `${snakeCaseName}_type.rb`);
        if (!fs.existsSync(typePath)) {
          const typeTemplatePath = this.templatePath('type.rb.ejs');
          this.fs.copyTpl(
            typeTemplatePath,
            typePath,
            {
              pascalCaseName,
              fields: responseFields.map(field => ({
                ...field,
                nullable: field.type === 'ID' ? 'false' : 'true'
              }))
            }
          );
          console.log(`\n✓ Created type file: ${typePath}`);
        } else {
          console.log(`\n✓ Type file already exists: ${typePath}`);
        }

        // Create response type file
        const responseTypePath = path.join('backend', 'app', 'graphql', 'types', `${snakeCaseName}_response_type.rb`);
        if (!fs.existsSync(responseTypePath)) {
          const responseTypeTemplatePath = this.templatePath('response_type.rb');
          this.fs.copyTpl(
            responseTypeTemplatePath,
            responseTypePath,
            {
              pascalCaseName
            }
          );
          console.log(`\n✓ Created response type file: ${responseTypePath}`);
        } else {
          console.log(`\n✓ Response type file already exists: ${responseTypePath}`);
        }
      } else {
        console.log(`\n✓ Queries file already exists: ${queriesFilePath}`);
      }
    }
  }
}; 
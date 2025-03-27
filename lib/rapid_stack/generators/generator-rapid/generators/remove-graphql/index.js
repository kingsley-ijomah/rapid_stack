const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add frontend paths
    this.frontendPath = './frontend';
    this.graphqlPath = 'frontend/src/app/graphql';
  }

  // Helper functions
  _capitalize(str) {
    return _.upperFirst(_.camelCase(str));
  }

  _pluralize(str) {
    // Basic pluralization rules
    if (str.endsWith('y')) {
      return str.slice(0, -1) + 'ies';
    } else if (
      str.endsWith('s') ||
      str.endsWith('x') ||
      str.endsWith('z') ||
      str.endsWith('ch') ||
      str.endsWith('sh')
    ) {
      return str + 'es';
    } else {
      return str + 's';
    }
  }

  _getAvailableModels() {
    const modelsPath = path.join(process.cwd(), 'backend/app/models');
    if (!fs.existsSync(modelsPath)) {
      return [];
    }

    // Define system models that should be excluded
    const systemModels = ['jwt_denylist', 'otp'];

    return fs.readdirSync(modelsPath)
      .filter(file => file.endsWith('.rb'))
      .map(file => file.replace('.rb', ''))
      .filter(model => !systemModels.includes(model));
  }

  _removeMutationFolder(modelName) {
    const mutationPath = this.destinationPath(`backend/app/graphql/mutations/${modelName}_mutations`);
    if (fs.existsSync(mutationPath)) {
      this.log(`Removing mutation folder: ${mutationPath}`);
      fs.rmSync(mutationPath, { recursive: true, force: true });
    }
  }

  _removeQueryFolder(modelName) {
    const pluralModel = this._pluralize(modelName);
    const queryPath = this.destinationPath(`backend/app/graphql/queries/${pluralModel}_queries`);
    if (fs.existsSync(queryPath)) {
      this.log(`Removing query folder: ${queryPath}`);
      fs.rmSync(queryPath, { recursive: true, force: true });
    }
  }

  _removeFrontendGraphQLFiles(modelName) {
    const lowerModelName = modelName.toLowerCase();
    // Remove frontend mutation files
    const frontendMutationsPath = path.join(this.graphqlPath, 'mutations', lowerModelName);
    if (fs.existsSync(frontendMutationsPath)) {
      this.log(`Removing frontend mutations folder: ${frontendMutationsPath}`);
      fs.rmSync(frontendMutationsPath, { recursive: true, force: true });
    }

    // Remove frontend query files
    const frontendQueriesPath = path.join(this.graphqlPath, 'queries', lowerModelName);
    if (fs.existsSync(frontendQueriesPath)) {
      this.log(`Removing frontend queries folder: ${frontendQueriesPath}`);
      fs.rmSync(frontendQueriesPath, { recursive: true, force: true });
    }
  }

  _updateMutationType(modelName) {
    const mutationTypePath = this.destinationPath('backend/app/graphql/types/mutation_type.rb');
    if (fs.existsSync(mutationTypePath)) {
      let content = fs.readFileSync(mutationTypePath, 'utf8');
  
      // Fix malformed end statements (if any)
      content = content.replace(/(\S+.*?)\s+end(\s*)$/gm, '$1\n  end$2');
  
      const capitalizedModel = _.upperFirst(_.camelCase(modelName));
      // Mutation fields to remove
      const mutationFields = [
        `field :create${capitalizedModel},`,
        `field :update${capitalizedModel},`,
        `field :delete${capitalizedModel},`
      ];
  
      let lines = content.split('\n');
      let newLines = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        let shouldRemove = false;
        // Check if the current line contains one of the mutation fields
        for (const mf of mutationFields) {
          if (line.includes(mf)) {
            shouldRemove = true;
            break;
          }
        }
        if (shouldRemove) {
          // If the next line exists and is exactly 'end' (trimmed), insert a blank line
          if (i + 1 < lines.length && lines[i + 1].trim() === 'end') {
            newLines.push('');
          }
          i++;
          continue;
        } else {
          newLines.push(line);
          i++;
        }
      }
  
      // Join the lines and trim trailing whitespace/newlines
      content = newLines.join('\n').trimEnd() + '\n';
  
      // Remove extra blank lines immediately before any line that is exactly "end"
      let finalLines = content.split('\n');
      for (let j = 0; j < finalLines.length - 1; j++) {
        if (finalLines[j].trim() === '' && finalLines[j + 1].trim() === 'end') {
          finalLines.splice(j, 1);
          j--; // adjust index after removal
        }
      }
      content = finalLines.join('\n') + '\n';
  
      fs.writeFileSync(mutationTypePath, content);
      this.log(`Updated mutation type file: ${mutationTypePath}`);
    }
  }
    

  _updateQueryType(modelName) {
    const queryTypePath = this.destinationPath('backend/app/graphql/types/query_type.rb');
    if (!fs.existsSync(queryTypePath)) return;
  
    let content = fs.readFileSync(queryTypePath, 'utf8');
  
    const capitalizedModel = _.upperFirst(_.camelCase(modelName));
    // Compute plural using the camelCase form so "shift_interest" becomes "shiftInterest" then pluralized to "shiftInterests"
    const pluralModel = this._pluralize(_.camelCase(modelName));
    const capitalizedPluralModel = _.upperFirst(pluralModel);
  
    // Split the content into lines for precise manipulation
    let lines = content.split('\n');
  
    // Identify lines to remove for list and show fields for this model
    const linesToRemove = [];
    lines.forEach((line, index) => {
      if (
        line.includes(`field :list${capitalizedPluralModel}`) ||
        line.includes(`field :show${capitalizedModel}`)
      ) {
        linesToRemove.push(index);
      }
    });
  
    // Remove the identified lines in reverse order
    linesToRemove.sort((a, b) => b - a).forEach(index => {
      lines.splice(index, 1);
    });
  
    // Remove any "Generated queries" comment if no generated fields remain
    const hasGeneratedQueries = lines.some(line =>
      line.includes('field :list') || line.includes('field :show')
    );
    if (!hasGeneratedQueries) {
      const commentIndex = lines.findIndex(line => line.includes('# Generated queries'));
      if (commentIndex !== -1) {
        lines.splice(commentIndex, 1);
      }
    }
  
    // Clean up consecutive blank lines
    for (let i = lines.length - 1; i > 0; i--) {
      if (lines[i].trim() === '' && lines[i - 1].trim() === '') {
        lines.splice(i, 1);
      }
    }
  
    // Fix indentation for the class and module end statements
    let classEndIndex = -1;
    let moduleEndIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() === 'end') {
        if (moduleEndIndex === -1) {
          moduleEndIndex = i;
        } else if (classEndIndex === -1) {
          classEndIndex = i;
          break;
        }
      }
    }
    if (classEndIndex !== -1 && moduleEndIndex !== -1) {
      lines[classEndIndex] = '  end';
      lines[moduleEndIndex] = 'end';
    }
  
    content = lines.join('\n');
    if (!content.endsWith('\n')) {
      content += '\n';
    }
  
    fs.writeFileSync(queryTypePath, content);
    this.log(`Updated query type file: ${queryTypePath}`);
  }
  

  async prompting() {
    const availableModels = this._getAvailableModels();

    if (availableModels.length === 0) {
      this.log.error('No models found in backend/app/models');
      return;
    }

    this.answers = await this.prompt([
      {
        type: 'checkbox',
        name: 'modelNames',
        message: 'Select the model(s) you want to remove GraphQL files for:',
        choices: availableModels,
        validate: input => input.length < 1 ? 'Select at least one model.' : true
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: answers => `Are you sure you want to remove all GraphQL files for the selected model(s)?`,
        default: false
      }
    ]);
  }

  writing() {
    if (!this.answers.confirm) {
      this.log('Operation cancelled');
      return;
    }

    this.answers.modelNames.forEach(modelName => {
      // Remove backend files
      this._removeMutationFolder(modelName);
      this._removeQueryFolder(modelName);
      this._updateMutationType(modelName);
      this._updateQueryType(modelName);

      // Remove frontend files
      this._removeFrontendGraphQLFiles(modelName);

      this.log(`Successfully removed GraphQL files for model: ${modelName}`);
    });
  }
};

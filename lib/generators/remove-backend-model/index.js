const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');

module.exports = class extends Generator {
  // Helper functions
  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  _getAvailableModels() {
    const modelsPath = this.destinationPath('backend/app/models');
    if (!fs.existsSync(modelsPath)) {
      return [];
    }

    // Filter out special models that shouldn't be removed
    const protectedModels = ['application_record', 'jwt_denylist', 'otp'];
    
    return fs.readdirSync(modelsPath)
      .filter(file => file.endsWith('.rb'))
      .map(file => file.replace('.rb', ''))
      .filter(model => !protectedModels.includes(model));
  }

  _removeModelFile(modelName) {
    const modelPath = this.destinationPath(`backend/app/models/${modelName}.rb`);
    if (fs.existsSync(modelPath)) {
      this.log(`Removing model file: ${modelPath}`);
      fs.unlinkSync(modelPath);
      return true;
    }
    this.log.error(`Model file not found: ${modelPath}`);
    return false;
  }

  _removeTypeFile(modelName) {
    const typePath = this.destinationPath(`backend/app/graphql/types/${modelName}_type.rb`);
    if (fs.existsSync(typePath)) {
      this.log(`Removing GraphQL type file: ${typePath}`);
      fs.unlinkSync(typePath);
      return true;
    }
    this.log.error(`GraphQL type file not found: ${typePath}`);
    return false;
  }

  async prompting() {
    const availableModels = this._getAvailableModels();

    if (availableModels.length === 0) {
      this.log.error('No removable models found in backend/app/models');
      return;
    }

    this.answers = await this.prompt([
      {
        type: 'list',
        name: 'modelName',
        message: 'Which model do you want to remove?',
        choices: availableModels
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: answers => 
          `⚠️ WARNING: This will permanently remove:\n` +
          `  1. Model file: ${answers.modelName}.rb\n` +
          `  2. GraphQL type file: ${answers.modelName}_type.rb\n\n` +
          `Are you absolutely sure you want to proceed?`,
        default: false
      }
    ]);
  }

  writing() {
    if (!this.answers.confirm) {
      this.log('Operation cancelled');
      return;
    }

    const modelName = this.answers.modelName;
    let success = true;

    // Remove model file
    if (!this._removeModelFile(modelName)) {
      success = false;
    }

    // Remove GraphQL type file
    if (!this._removeTypeFile(modelName)) {
      success = false;
    }

    if (success) {
      this.log.ok(`Successfully removed model "${modelName}" and its associated files`);
    } else {
      this.log.error(`Some operations failed while removing model "${modelName}"`);
    }

    // Suggest running remove-graphql generator
    this.log(`\nℹ️  Don't forget to also remove the GraphQL queries and mutations!`);
    this.log(`Run: yo angular-templates:remove-graphql\n`);
  }
}; 
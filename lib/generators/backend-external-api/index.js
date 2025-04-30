const Generator = require('yeoman-generator');
const { getApiPrompts, getResponseKeyPrompts, handlePrompt } = require('./prompts/apiPrompts');
const GraphQLHandler = require('./lib/graphql');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add debug option
    this.option('debug', {
      desc: 'Enable debug mode',
      type: Boolean,
      default: false
    });

    // Initialize prompting flag
    this._isPromptingComplete = false;
  }

  async prompting() {
    // Prevent multiple executions
    if (this._isPromptingComplete) {
      return;
    }

    // Get initial API configuration
    this.answers = await handlePrompt(this, getApiPrompts());
    
    // Collect response keys and types
    this.responseKeys = [];
    let shouldContinue = true;
    
    while (shouldContinue) {
      const responseAnswers = await handlePrompt(this, getResponseKeyPrompts(this.answers));
      
      if (responseAnswers.responseKey && responseAnswers.responseKey.length > 0) {
        this.responseKeys.push({
          key: responseAnswers.responseKey,
          type: responseAnswers.responseKeyType
        });
        
        shouldContinue = responseAnswers.addAnotherKey;
      } else {
        shouldContinue = false;
      }
    }

    this._isPromptingComplete = true;
  }

  async writing() {
    const graphqlHandler = new GraphQLHandler(this);
    await graphqlHandler.addField(this.answers.serviceName);
    await graphqlHandler.createResponseType(this.answers.serviceName);
    await graphqlHandler.createType(this.answers.serviceName, this.responseKeys);
  }
};

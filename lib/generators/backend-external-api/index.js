const Generator = require('yeoman-generator');
const { getApiPrompts, getResponseKeyPrompts, handlePrompt } = require('./prompts/apiPrompts');
const GraphQLHandler = require('./lib/graphql');
const { toCamelCase } = require('../../lib/utils');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add debug option
    this.option('debug', {
      desc: 'Enable debug mode',
      type: Boolean,
      default: false
    });

    // Add remove option
    this.option('rm', {
      desc: 'Remove an existing endpoint',
      type: Boolean,
      default: false
    });

    // Initialize prompting flag
    this._isPromptingComplete = false;

    // Make helper functions available
    this.toCamelCase = toCamelCase;
  }

  async prompting() {
    // Prevent multiple executions
    if (this._isPromptingComplete) {
      return;
    }

    // If --rm flag is provided, handle removal
    if (this.options.rm) {
      const { serviceName } = await handlePrompt(this, [{
        type: 'input',
        name: 'serviceName',
        message: 'Enter the service name to remove (e.g., EstimatedSalary):',
        validate: input => input.length > 0 ? true : 'Service name is required'
      }]);
      
      const graphqlHandler = new GraphQLHandler(this);
      await graphqlHandler.removeEndpoint(serviceName);
      return;
    }

    // Get initial API configuration
    this.answers = await handlePrompt(this, getApiPrompts(this));
    
    // Collect response keys and types
    this.answers.responseKeys = [];
    let shouldContinue = true;
    
    while (shouldContinue) {
      const responseAnswers = await handlePrompt(this, getResponseKeyPrompts(this.answers));
      
      if (responseAnswers.responseKey && responseAnswers.responseKey.length > 0) {
        this.answers.responseKeys.push({
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
    // Skip writing if we're in remove mode
    if (this.options.rm) {
      return;
    }

    const graphqlHandler = new GraphQLHandler(this);
    await graphqlHandler.addField(this.answers.serviceName);
    await graphqlHandler.createResponseType(this.answers.serviceName);
    await graphqlHandler.createType(this.answers.serviceName, this.answers.responseKeys);
    await graphqlHandler.createQuery(this.answers.serviceName, this.answers.responseKeys);
    await graphqlHandler.createService(this.answers.serviceName, {
      baseUrl: this.answers.baseUrl,
      endpoint: this.answers.endpoint,
      apiHost: this.answers.apiHost,
      apiKey: this.answers.apiKey,
      queryParams: this.answers.queryParams || []
    });
  }
};

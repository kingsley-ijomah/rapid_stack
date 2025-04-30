const { handlePrompt, toCamelCase } = require('../../../lib/utils');

const getResponseKeyPrompts = (answers) => {
  const prompts = [];
  
  // First key prompt
  prompts.push({
    type: 'input',
    name: 'responseKey',
    message: 'Enter a response key e.g. title (press enter when done):',
    validate: (input) => {
      if (!input) return true; // Allow empty input to finish
      return input.trim().length > 0 ? true : 'Key cannot be empty';
    },
    filter: (input) => input ? input.trim() : ''
  });

  // Type prompt for the key
  prompts.push({
    type: 'list',
    name: 'responseKeyType',
    message: (answers) => `Select the type for key "${answers.responseKey}":`,
    choices: ['ID', 'String', 'Int', 'Float', 'Boolean', '[ ID ]', '[ String ]', '[ Int ]', '[ Float ]', '[ Boolean ]'],
    when: (answers) => answers.responseKey && answers.responseKey.length > 0,
    pageSize: 10
  });

  // Ask if user wants to add another key
  prompts.push({
    type: 'confirm',
    name: 'addAnotherKey',
    message: 'Would you like to add another response key?',
    when: (answers) => answers.responseKey && answers.responseKey.length > 0,
    default: true
  });

  return prompts;
};

const getApiPrompts = () => [
  {
    type: 'input',
    name: 'serviceName',
    message: 'Enter the API service name (e.g. estimatedSalary):',
    validate: (input) => {
      if (!input) return 'Service name is required';
      return true;
    },
    filter: (input) => toCamelCase(input)
  },
  {
    type: 'input',
    name: 'apiHost',
    message: 'Enter the API host (e.g. https://jobsearch.com):',
    validate: (input) => {
      if (!input) return 'API host is required';
      try {
        new URL(input);
        return true;
      } catch (e) {
        return 'Please enter a valid URL (e.g. https://jobsearch.com)';
      }
    }
  },
  {
    type: 'input',
    name: 'endpoint',
    message: 'Enter the API endpoint (e.g. /estimated-salary):',
    validate: (input) => {
      if (!input) return 'Endpoint is required';
      if (!input.startsWith('/')) return 'Endpoint must start with /';
      return true;
    }
  },
  {
    type: 'list',
    name: 'method',
    message: 'Select the HTTP method:',
    choices: ['GET', 'POST', 'PUT', 'DELETE'],
    default: 'GET'
  },
  {
    type: 'input',
    name: 'queryParams',
    message: 'Enter query parameters (comma separated, e.g. title,location):',
    filter: (input) => {
      return input.split(',')
        .map(param => param.trim())
        .filter(param => param.length > 0);
    }
  },
  {
    type: 'input',
    name: 'headers',
    message: 'Enter headers (comma separated, e.g. x-rapidapi-host,x-rapidapi-key):',
    filter: (input) => {
      return input.split(',')
        .map(header => header.trim())
        .filter(header => header.length > 0);
    }
  },
  {
    type: 'confirm',
    name: 'isPaginated',
    message: 'Is the API response paginated?',
    default: false
  },
  {
    type: 'input',
    name: 'pageField',
    message: 'What is the field name for the current page? (enter "nil" if not represented):',
    when: (answers) => answers.isPaginated,
    default: 'page',
    filter: (input) => input === 'nil' ? null : input
  },
  {
    type: 'input',
    name: 'totalResultsField',
    message: 'What is the field name for total results? (enter "nil" if not represented):',
    when: (answers) => answers.isPaginated,
    default: 'total_results',
    filter: (input) => input === 'nil' ? null : input
  },
  {
    type: 'input',
    name: 'totalPagesField',
    message: 'What is the field name for total pages? (enter "nil" if not represented):',
    when: (answers) => answers.isPaginated,
    default: 'total_pages',
    filter: (input) => input === 'nil' ? null : input
  },
  {
    type: 'input',
    name: 'resultsKey',
    message: 'What is the key name for the results array? (use "root" if results are at root level):',
    default: 'root'
  }
];

module.exports = {
  getApiPrompts,
  getResponseKeyPrompts,
  handlePrompt
}; 
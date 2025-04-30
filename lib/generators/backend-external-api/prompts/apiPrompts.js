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

const getApiPrompts = (generator) => [
  {
    type: 'input',
    name: 'serviceName',
    message: 'Enter the API service name (e.g. estimatedSalary):',
    default: 'estimatedSalary',
    validate: (input) => {
      if (!input) return 'Service name is required';
      return true;
    },
    filter: (input) => toCamelCase(input)
  },
  {
    type: 'input',
    name: 'fullApiUrl',
    message: 'Enter the full API URL (e.g. https://api.com/path/path2?query=123&query1=abc):',
    default: 'https://linkedin-data-api.p.rapidapi.com/profiles/positions/top?username=adamselipsky',
    validate: (input) => {
      if (!input) return 'API URL is required';
      try {
        new URL(input);
        return true;
      } catch (e) {
        return 'Please enter a valid URL';
      }
    },
    filter: (input, answers) => {
      if (!input) return input;
      try {
        const url = new URL(input);
        console.log('Parsed URL:', {
          origin: url.origin,
          pathname: url.pathname,
          hostname: url.hostname,
          searchParams: Array.from(url.searchParams.keys())
        });
        
        // Set the values directly in answers
        answers.baseUrl = url.origin;
        answers.endpoint = url.pathname;
        answers.apiHost = url.hostname;
        answers.queryParams = Array.from(url.searchParams.keys());
        
        console.log('Answers after setting:', answers);
        return input;
      } catch (e) {
        console.log('URL parsing error:', e);
        return input;
      }
    },
    when: (answers) => !answers.baseUrl && !answers.endpoint
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
    name: 'apiKey',
    message: 'Enter the API key:',
    default: '19845f8e18mshe82752dd00588d5p16fba2jsn669009fd449e'
  },
  {
    type: 'input',
    name: 'headers',
    message: 'Enter headers (comma separated, e.g. x-rapidapi-host,x-rapidapi-key):',
    default: 'x-rapidapi-host,x-rapidapi-key',
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
    default: 'data'
  }
];

module.exports = {
  getApiPrompts,
  getResponseKeyPrompts,
  handlePrompt
}; 
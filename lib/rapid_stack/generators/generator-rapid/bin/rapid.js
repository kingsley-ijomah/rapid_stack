#!/usr/bin/env node

const path = require('path');
const Environment = require('yeoman-environment');

const args = process.argv.slice(2);
const command = args[0];

// Parse command line options
const options = {};
let remainingArgs = [];

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--yes' || args[i] === '-y') {
    options.askAnswered = true; // This will be passed to the environment
  } else {
    remainingArgs.push(args[i]);
  }
}

if (!command) {
  console.error('Please specify a command. Available commands:');
  console.error('\nInitialization:');
  console.error('  init             - Initialize a new project');

  console.error('\nBuild Commands:');
  console.error('  build:backend     - Build backend infrastructure');
  console.error('  build:frontend    - Build frontend infrastructure');
  console.error('  build:devops      - Build devops infrastructure');
  console.error('  build:nginx       - Build nginx configuration');
  console.error('  build:terraform   - Build terraform infrastructure');
  console.error('  build:lifecycle   - Build development lifecycle');
  console.error('  build:fullstack   - Build fullstack application');
  
  console.error('\nSchema Commands:');
  console.error('  schema:create     - Create backend schema');
  console.error('  schema:run        - Run backend schema');
  console.error('  schema:rm         - Remove backend schema');
  
  console.error('\nFrontend Commands:');
  console.error('  frontend:platform - Add frontend platform');
  console.error('  frontend:crud     - Add CRUD operations');
  console.error('  frontend:auth     - Add authentication');
  console.error('  frontend:event    - Add event handling');
  console.error('  frontend:list     - Add list actions');
  console.error('  frontend:platform:rm - Remove frontend platform');
  console.error('  frontend:auth:rm    - Remove frontend authentication');

  console.error('\nBackend Commands:');
  console.error('  backend:graphql   - Add GraphQL support');
  console.error('  backend:auth      - Add authentication');
  console.error('  backend:auth:rm    - Remove backend authentication');
  
  console.error('\nOptions:');
  console.error('  --yes, -y         - Automatically answer "yes" to all prompts');
  
  process.exit(1);
}

// Map commands to generator paths
const generatorMap = {
  // Build Commands
  'build:backend': '../generators/build-backend',
  'build:frontend': '../generators/build-frontend',
  'build:devops': '../generators/build-devops',
  'build:nginx': '../generators/build-nginx',
  'build:terraform': '../generators/terraform-ops',
  'build:lifecycle': '../generators/dev-lifecycle',
  'build:fullstack': '../generators/build-fullstack',
  
  // Schema Commands
  'schema:create': '../generators/backend-schema',
  'schema:run': '../generators/backend-schema-runner',
  'schema:rm': '../generators/remove-schema-runner',
  
  // Frontend Commands
  'frontend:platform': '../generators/frontend-platform',
  'frontend:crud': '../generators/frontend-crud',
  'frontend:auth': '../generators/frontend-auth',
  'frontend:auth:rm': '../generators/remove-frontend-auth',
  'frontend:event': '../generators/frontend-event',
  'frontend:list': '../generators/frontend-list-action',
  'frontend:platform:rm': '../generators/remove-frontend-platform',
  
  // Backend Commands
  'backend:auth': '../generators/backend-auth',
  'backend:auth:rm': '../generators/remove-backend-auth',

  // GraphQL Commands
  'graphql': '../generators/graphql',
  'graphql:rm': '../generators/remove-graphql',
  
  // Initialization
  'init': '../generators/init'
};

const generatorPath = generatorMap[command];
if (!generatorPath) {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

// Create and run the environment
const env = Environment.createEnv();

try {
  const fullPath = path.resolve(__dirname, generatorPath);
  env.register(fullPath, command);
  
  // Create the run arguments array with the command and remaining args
  const runArgs = [command, ...remainingArgs];
  
  // Run the generator with the correct argument structure
  env.run(runArgs, options)
    .then(() => {
      console.log(`Successfully ran generator: ${command}`);
    })
    .catch(err => {
      console.error('Error running generator:', err);
      process.exit(1);
    });
} catch (err) {
  console.error('Error loading generator:', err);
  process.exit(1);
} 
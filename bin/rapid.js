#!/usr/bin/env node

const path = require('path');
const Environment = require('yeoman-environment');
const args = process.argv.slice(2);
const command = args[0];

// Check for version flag
if (command === '--version' || command === '-v') {
  const packageJson = require('../package.json');
  console.log(packageJson.version);
  process.exit(0);
}

// Parse command line options
const options = {};
let remainingArgs = [];

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--yes' || args[i] === '-y') {
    options.askAnswered = true;
  } else if (args[i] === '--auth-only') {
    options.authOnly = true;
  } else {
    remainingArgs.push(args[i]);
  }
}

if (!command) {
  console.error('Please specify a command. Available commands:');
  console.error('\nInitialization:');
  console.error(' init - Initialize a new project');
  console.error(' run:devops - Run devops pipeline');
  
  console.error('\nBuild Commands:');
  console.error(' build:backend - Build backend infrastructure');
  console.error(' build:frontend - Build frontend infrastructure');
  console.error(' build:devops - Build devops infrastructure');
  console.error(' build:lifecycle - Build development lifecycle');
  console.error(' build:fullstack - Build fullstack application');
  
  console.error('\nSchema Commands:');
  console.error(' schema:create - Create backend schema');
  console.error(' schema:run - Run backend schema');
  console.error(' schema:rm - Remove backend schema');
  
  console.error('\nFrontend Commands:');
  console.error(' frontend:platform - Add frontend platform');
  console.error(' frontend:crud - Add CRUD operations');
  console.error(' frontend:auth - Add authentication');
  console.error(' frontend:event - Add event handling');
  console.error(' frontend:list - Add list actions');
  console.error(' frontend:home - Add home page');
  console.error(' frontend:company - Add company page');
  console.error(' frontend:platform:rm - Remove frontend platform');
  console.error(' frontend:auth:rm - Remove frontend authentication');
  
  console.error('\nBackend Commands:');
  console.error(' backend:graphql - Add GraphQL support');
  console.error(' backend:auth - Add authentication');
  console.error(' backend:auth:rm - Remove backend authentication');
  
  console.error('\nDevelopment Commands:');
  console.error(' serve, s - Start frontend and backend servers');
  console.error(' destroy - Destroy all project resources (cloud, git, local)');

  console.error('\nMobile Commands:');
  console.error(' ios - Build iOS app');
  console.error(' android - Build Android app');
  
  console.error('\nOptions:');
  console.error(' --yes, -y - Automatically answer "yes" to all prompts');
  console.error(' --auth-only - Only add authentication');
  console.error(' --version, -v - Show version number');
  process.exit(1);
}

// Map commands to generator paths
const generatorMap = {
  // Build Commands
  'build:backend': '../lib/generators/build-backend',
  'build:frontend': '../lib/generators/build-frontend',
  'build:devops': '../lib/generators/build-devops',
  'build:lifecycle': '../lib/generators/dev-lifecycle',
  'build:fullstack': '../lib/generators/build-fullstack',
  
  // Schema Commands
  'schema:create': '../lib/generators/backend-schema',
  'schema:run': '../lib/generators/backend-schema-runner',
  'schema:rm': '../lib/generators/remove-schema-runner',
  
  // Frontend Commands
  'frontend:platform': '../lib/generators/frontend-platform',
  'frontend:crud': '../lib/generators/frontend-crud',
  'frontend:auth': '../lib/generators/frontend-auth',
  'frontend:home': '../lib/generators/frontend-home',
  'frontend:company': '../lib/generators/frontend-company',
  'frontend:auth:rm': '../lib/generators/remove-frontend-auth',
  'frontend:event': '../lib/generators/frontend-event',
  'frontend:list': '../lib/generators/frontend-list-action',
  'frontend:platform:rm': '../lib/generators/remove-frontend-platform',
  
  // Backend Commands
  'backend:auth': '../lib/generators/backend-auth',
  'backend:auth:rm': '../lib/generators/remove-backend-auth',
  
  // GraphQL Commands
  'graphql': '../lib/generators/graphql',
  'graphql:rm': '../lib/generators/remove-graphql',
  
  // Initialization
  'init': '../lib/generators/init',
  'run:devops': '../lib/generators/terraform-ops',
  
  // Development Commands
  'serve': '../lib/generators/serve',
  's': '../lib/generators/serve',
  'destroy': '../lib/generators/destroy',

  // mobile commands
  'ios': '../lib/generators/ios',
  'android': '../lib/generators/android',
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
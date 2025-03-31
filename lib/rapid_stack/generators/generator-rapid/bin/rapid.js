#!/usr/bin/env node

const path = require('path');
const Environment = require('yeoman-environment');

const args = process.argv.slice(2);
const command = args[0];

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
  console.error('  build:router      - Build router configuration');
  console.error('  build:lifecycle   - Build development lifecycle');
  console.error('  build:fullstack   - Build fullstack application');
  
  console.error('\nSchema Commands:');
  console.error('  schema:create     - Create backend schema');
  console.error('  schema:run        - Run backend schema');
  console.error('  schema:remove     - Remove backend schema');
  
  console.error('\nFrontend Commands:');
  console.error('  frontend:platform - Add frontend platform');
  console.error('  frontend:crud     - Add CRUD operations');
  console.error('  frontend:auth     - Add authentication');
  console.error('  frontend:event    - Add event handling');
  console.error('  frontend:list     - Add list actions');
  console.error('  frontend:remove   - Remove frontend components');
  
  console.error('\nBackend Commands:');
  console.error('  backend:graphql   - Add GraphQL support');
  console.error('  backend:auth      - Add authentication');
  console.error('  backend:remove    - Remove backend components');
  
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
  'build:router': '../generators/router',
  'build:lifecycle': '../generators/dev-lifecycle',
  'build:fullstack': '../generators/build-fullstack',
  
  // Schema Commands
  'schema:create': '../generators/backend-schema',
  'schema:run': '../generators/backend-schema-runner',
  'schema:remove': '../generators/remove-schema-runner',
  
  // Frontend Commands
  'frontend:platform': '../generators/frontend-platform',
  'frontend:crud': '../generators/frontend-crud',
  'frontend:auth': '../generators/frontend-auth',
  'frontend:event': '../generators/frontend-event',
  'frontend:list': '../generators/frontend-list-action',
  'frontend:remove': '../generators/remove-frontend-platform',
  
  // Backend Commands
  'backend:graphql': '../generators/graphql',
  'backend:auth': '../generators/backend-auth',
  'backend:remove': '../generators/remove-backend-auth',
  
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
  
  env.run(command, args.slice(1))
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
/**
 * Utility functions for generators
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

/**
 * Properly pluralize a string
 * @param {string} str - The string to pluralize
 * @returns {string} - The pluralized string
 */
function pluralize(str) {
  // Common irregular plurals
  const irregulars = {
    'person': 'people',
    'man': 'men',
    'child': 'children',
    'foot': 'feet',
    'tooth': 'teeth',
    'goose': 'geese',
    'mouse': 'mice',
    'ox': 'oxen',
    'leaf': 'leaves',
    'datum': 'data',
    'analysis': 'analyses',
    'criterion': 'criteria',
    'phenomenon': 'phenomena',
    'medium': 'media',
    'index': 'indices',
    'matrix': 'matrices',
    'vertex': 'vertices',
    'axis': 'axes',
    'crisis': 'crises',
    'radius': 'radii',
    'nucleus': 'nuclei',
    'stimulus': 'stimuli',
    'focus': 'foci',
    'fungus': 'fungi',
    'cactus': 'cacti',
    'alumnus': 'alumni',
    'syllabus': 'syllabi',
    'bacterium': 'bacteria',
    'curriculum': 'curricula',
    'memorandum': 'memoranda',
    'millennium': 'millennia',
    'stratum': 'strata',
    'interest': 'interests'
  };

  if (irregulars[str.toLowerCase()]) {
    return irregulars[str.toLowerCase()];
  }

  // Rules for regular plurals
  if (str.match(/[sxz]$/) || str.match(/[^aeiou]ch$/) || str.match(/sh$/) || str.match(/[^aeiou]o$/)) {
    return str + 'es';
  } else if (str.match(/[^aeiou]y$/)) {
    return str.replace(/y$/, 'ies');
  } else if (str.match(/f$/)) {
    return str.replace(/f$/, 'ves');
  } else if (str.match(/fe$/)) {
    return str.replace(/fe$/, 'ves');
  } else {
    return str + 's';
  }
}

/**
 * Convert a string to snake_case
 * @param {string} str - The string to convert
 * @returns {string} - The snake_case string
 */
function toSnakeCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Convert a string to PascalCase
 * @param {string} str - The string to convert
 * @returns {string} - The PascalCase string
 */
function toPascalCase(str) {
  // If the string is already in PascalCase or camelCase, just ensure the first letter is uppercase
  if (/^[a-zA-Z][a-zA-Z0-9]*([A-Z][a-zA-Z0-9]*)*$/.test(str) && 
      !str.includes('_') && !str.includes('-') && !str.includes(' ')) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  // Otherwise, convert from snake_case, kebab-case, or space-separated
  return str
    .split(/[_\s-]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert a string to camelCase
 * @param {string} str - The string to convert
 * @returns {string} - The camelCase string
 */
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert camelCase or PascalCase to snake_case for filenames
 * @param {string} str - The string to convert
 * @returns {string} - The snake_case string
 */
function camelToSnake(str) {
  // Handle PascalCase and camelCase properly
  // This will insert underscores before all capital letters
  // and then convert the entire string to lowercase
  return str
    .replace(/([A-Z])/g, function(match, p1, offset) {
      // Don't add underscore for the first character
      return (offset > 0 ? '_' : '') + match.toLowerCase();
    })
    .toLowerCase();
}

/**
 * Validate the project configuration file
 * @param {string} currentDir - The current directory name
 * @returns {Object} - The parsed configuration object
 * @throws {Error} - If validation fails
 */
function validateProjectConfig(currentDir) {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const configPath = path.join(homeDir, '.rapid_stack', `${currentDir}_project.yml`);

  // Check if config file exists
  if (!fs.existsSync(configPath)) {
    console.clear();
    console.log('\n' + '='.repeat(80));
    console.log('❌ Configuration File Not Found!');
    console.log('='.repeat(80));
    console.log('\n📋 Expected config file:');
    console.log(`   ${configPath}`);
    console.log('\nPlease run "rapid init" first to create the configuration.');
    console.log('\n' + '='.repeat(80) + '\n');
    process.exit(1);
  }

  try {
    // Read and parse YAML file
    const configFile = fs.readFileSync(configPath, 'utf8');
    const config = yaml.parse(configFile);

    // Validate config structure
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration file is empty or invalid YAML format');
    }

    if (!config.config || !config.repos) {
      throw new Error('Configuration must contain both "config" and "repos" sections');
    }

    // Required fields to check
    const requiredConfigFields = [
      'app_name',
      'do_token',
      'do_region',
      'space_region',
      'email',
      'app_support_email',
      'mailer_from_name',
      'mailer_from_address',
      'spaces_access_id',
      'spaces_secret_key',
      'github_username',
      'repo_access_token',
      'postmark_api_key',
      'dockerhub_username',
      'dockerhub_password',
      'domains'
    ];

    const requiredRepoFields = [
      'frontend',
      'backend',
      'devops',
      'nginx',
      'actions'
    ];

    // Check config fields
    const missingConfigFields = requiredConfigFields.filter(field => 
      !config.config[field] || config.config[field] === ''
    );

    // Check repo fields
    const missingRepoFields = requiredRepoFields.filter(field => 
      !config.repos[field] || config.repos[field] === ''
    );

    if (missingConfigFields.length > 0 || missingRepoFields.length > 0) {
      console.clear();
      console.log('\n' + '='.repeat(80));
      console.log('⚠️  Configuration Validation Failed!');
      console.log('='.repeat(80));
      
      console.log('\n📝 Configuration File:');
      console.log(`   ${configPath}`);
      
      if (missingConfigFields.length > 0) {
        console.log('\n❌ Missing or empty configuration fields:');
        missingConfigFields.forEach(field => {
          console.log(`   - ${field}`);
        });
      }

      if (missingRepoFields.length > 0) {
        console.log('\n❌ Missing or empty repository fields:');
        missingRepoFields.forEach(field => {
          console.log(`   - ${field}`);
        });
      }

      console.log('\n📋 Next Steps:');
      console.log('1. Open your configuration file:');
      console.log(`   code ${configPath}  # for VS Code`);
      console.log(`   nano ${configPath}  # for Nano`);
      console.log(`   vim ${configPath}   # for Vim`);
      console.log(`   cursor ${configPath}   # for Cursor`);
      console.log('\n2. Fill in all the missing fields');
      console.log('3. Save the file');
      console.log('4. Run this command again');
      
      console.log('\n' + '='.repeat(80));
      console.log('Need help? Check the field descriptions in the configuration file.');
      console.log('='.repeat(80) + '\n');
      
      process.exit(1);
    }

    return config;

  } catch (error) {
    console.clear();
    console.log('\n' + '='.repeat(80));
    console.log('❌ Configuration File Error!');
    console.log('='.repeat(80));
    
    console.log('\n📝 Configuration File:');
    console.log(`   ${configPath}`);
    
    console.log('\n❌ Error Details:');
    console.log(`   ${error.message}`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Check that your configuration file exists and is valid YAML');
    console.log('2. Ensure it has the correct structure:');
    console.log('   config:');
    console.log('     app_name: your-app-name');
    console.log('     ...');
    console.log('   repos:');
    console.log('     frontend: your-app-frontend');
    console.log('     ...');
    console.log('\n3. Try running the init generator again:');
    console.log('   rapid init');
    
    console.log('\n' + '='.repeat(80) + '\n');
    process.exit(1);
  }
}

module.exports = {
  pluralize,
  toSnakeCase,
  toPascalCase,
  toCamelCase,
  camelToSnake,
  validateProjectConfig
}; 
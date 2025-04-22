/**
 * Utility functions for generators
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const os = require('os');

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
 * Helper method to handle prompts based on askAnswered option
 * @param {Object} generator - The Yeoman generator instance
 * @param {Array} questions - Array of prompt questions
 * @returns {Promise<Object>} Answers to the prompts
 */
function handlePrompt(generator, questions) {
  // If askAnswered is true, automatically answer all prompts
  if (generator.options.askAnswered) {
    return questions.reduce((answers, question) => {
      let answer;
      
      // Handle different question types
      switch (question.type) {
        case 'confirm':
          answer = true;
          break;
        case 'list':
        case 'rawlist':
          answer = question.choices[0].value || question.choices[0];
          break;
        case 'input':
          answer = question.default || '';
          break;
        case 'checkbox':
          answer = question.choices
            .filter(choice => !choice.disabled)
            .map(choice => choice.value || choice);
          break;
        default:
          answer = question.default;
      }
      
      answers[question.name] = answer;
      return answers;
    }, {});
  }
  
  // Otherwise, use normal prompting
  return generator.prompt(questions);
}

/**
 * Find the project root directory by looking for .rapidrc file
 * @param {string} [startPath] - Starting path to search from (defaults to process.cwd())
 * @returns {string|null} Project name from .rapidrc or null if not found
 */
function findProjectRoot(startPath = process.cwd()) {
  let currentPath = startPath;
  
  // Traverse up until we find .rapidrc or hit the root
  while (currentPath !== path.parse(currentPath).root) {
    const rapidrcPath = path.join(currentPath, '.rapidrc');
    if (fs.existsSync(rapidrcPath)) {
      try {
        const content = fs.readFileSync(rapidrcPath, 'utf8');
        const config = JSON.parse(content);
        return config.projectName;
      } catch (error) {
        console.error('Error reading .rapidrc:', error.message);
        return null;
      }
    }
    currentPath = path.dirname(currentPath);
  }
  return null;
}

/**
 * Get a field value from the project config YAML
 * @param {string} fieldPath - Dot notation path to the field (e.g., 'config.app_name')
 * @param {string} [defaultValue] - Default value if field not found
 * @returns {any} The field value or defaultValue if not found
 */
function getConfigField(fieldPath, defaultValue = null) {
  try {
    // Find the project name from .rapidrc
    const projectName = findProjectRoot();
    
    if (!projectName) {
      console.error('Could not find .rapidrc file. Are you in a Rapid Stack project directory?');
      return defaultValue;
    }
    
    // Construct the path to the config file
    const configPath = path.join(process.env.HOME, '.rapid_stack', `${projectName}_project.yml`);

    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      return defaultValue;
    }

    // Read and parse the config file
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.parse(configContent);

    // Split the field path and traverse the config object
    const fields = fieldPath.split('.');

    let value = config.config;
    
    for (const field of fields) {
      if (value && typeof value === 'object' && field in value) {
        value = value[field];
      } else {
        return defaultValue;
      }
    }

    return value || defaultValue;
  } catch (error) {
    console.error('Error reading config file:', error.message);
    return defaultValue;
  }
}

/**
 * Create GitHub repositories
 * @param {string} username - GitHub username
 * @param {string} token - GitHub personal access token
 * @param {string} repos - Comma-separated list of repository names
 * @param {boolean} isPublic - Whether repositories should be public
 * @returns {Promise<void>}
 */
async function createGitHubRepos(username, token, repos, isPublic) {
  try {
    console.log('Creating GitHub repositories...');
    
    // Convert comma-separated list to array
    const repoArray = repos.split(',').map(repo => repo.trim());
    
    for (const repo of repoArray) {
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: repo,
          private: !isPublic
        })
      });

      const data = await response.json();

      if (response.status === 422 && data.message?.includes('already exists')) {
        console.log(`Repository '${repo}' already exists.`);
      } else if (response.ok) {
        console.log(`Repository '${repo}' created successfully.`);
      } else {
        console.error(`Failed to create repository '${repo}':`, data.message || 'Unknown error');
      }
    }
  } catch (error) {
    console.error('Error creating GitHub repositories:', error.message);
    throw error;
  }
}

/**
 * Get repositories from config file
 * @param {string} configFile - Path to the config file
 * @returns {string} Comma-separated list of repositories
 */
function getRepositoriesFromConfig(configFile) {
  try {
    // Extract all repository values from the repos section
    const configContent = fs.readFileSync(configFile, 'utf8');
    const config = yaml.parse(configContent);
    
    if (!config.repos) {
      return '';
    }

    return Object.values(config.repos).join(',');
  } catch (error) {
    console.error('Error reading repositories from config:', error.message);
    return '';
  }
}

/**
 * Initialize a Git repository and push initial commit
 * @param {string} githubUsername - GitHub username
 * @param {string} repoName - Repository name
 * @param {string} [commitMessage="first commit"] - Commit message
 * @returns {Promise<void>}
 * @throws {Error} If any Git command fails
 */
async function initializeAndPushGitRepo(githubUsername, repoName, commitMessage = "first commit") {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  
  try {
    const gitDir = path.join(process.cwd(), '.git');
    const isGitRepo = fs.existsSync(gitDir);
    const remoteUrl = `git@github.com:${githubUsername}/${repoName}.git`;

    if (!isGitRepo) {
      // Initialize Git repository only if it doesn't exist
      execSync('git init', { stdio: 'inherit' });
      execSync('git add .', { stdio: 'inherit' });
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      execSync('git branch -M main', { stdio: 'inherit' });
      execSync(`git remote add origin ${remoteUrl}`, { stdio: 'inherit' });
      execSync('git push -u origin main', { stdio: 'inherit' });
    } else {
      console.log('Git repository already exists, skipping initialization...');
    }
    return true;
  } catch (error) {
    throw new Error(`Failed to initialize and push Git repository: ${error.message}`);
  }
}

/**
 * Update GitHub repository secrets
 * @param {string} githubUsername - GitHub username
 * @param {string} repoName - Repository name
 * @param {string} token - GitHub access token
 * @param {Array<{key: string, value: string}>} secrets - Array of secrets to update
 * @returns {Promise<void>}
 * @throws {Error} If any secret update fails
 */
async function updateGitHubSecrets(githubUsername, repoName, token, secrets) {
  const { execSync } = require('child_process');
  
  try {
    // Check which secrets already exist
    const existingSecrets = new Set();
    try {
      const result = execSync(`gh secret list --repo ${githubUsername}/${repoName}`, { stdio: 'pipe' }).toString();
      result.split('\n').forEach(line => {
        const secretName = line.trim();
        if (secretName) existingSecrets.add(secretName);
      });
    } catch (error) {
      // If the command fails, assume no secrets exist
      console.log('No existing secrets found, will create all secrets');
    }

    // Filter out secrets that already exist
    const newSecrets = secrets.filter(secret => !existingSecrets.has(secret.key));

    if (newSecrets.length > 0) {
      console.log(`Creating ${newSecrets.length} new secrets...`);
      for (const secret of newSecrets) {
        // Use GitHub CLI to update the secret
        const command = `gh secret set ${secret.key} --repo ${githubUsername}/${repoName} --body "${secret.value}"`;
        execSync(command, { stdio: 'inherit' });
      }
      console.log('✓ New GitHub secrets set successfully');
    } else {
      console.log('✓ All secrets already exist, skipping creation');
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to update GitHub secrets: ${error.message}`);
  }
}

/**
 * Get secrets from project config
 * @param {string} projectName - Project name
 * @param {Array<string>} secretKeys - Array of secret keys to retrieve
 * @returns {Array<{key: string, value: string}>} - Array of secrets
 */
function getSecretsFromConfig(projectName, secretKeys) {
  const config = getConfigField('config');
  const secrets = [];
  
  for (const key of secretKeys) {
    if (config[key]) {
      secrets.push({
        key: key.toUpperCase(),
        value: config[key]
      });
    }
  }
  
  return secrets;
}

/**
 * Get the user's shell configuration file path
 * @returns {Object} - Object containing shell type and config file path
 */
function getShellConfig() {
  const shell = process.env.SHELL || '';
  let shellType = 'unknown';
  let configPath = '~/.bash_profile'; // Default fallback

  if (shell.includes('zsh')) {
    shellType = 'zsh';
    configPath = '~/.zshrc';
  } else if (shell.includes('bash')) {
    shellType = 'bash';
    configPath = '~/.bash_profile';
  } else if (shell.includes('fish')) {
    shellType = 'fish';
    configPath = '~/.config/fish/config.fish';
  } else if (shell.includes('tcsh')) {
    shellType = 'tcsh';
    configPath = '~/.tcshrc';
  } else if (shell.includes('csh')) {
    shellType = 'csh';
    configPath = '~/.cshrc';
  } else if (shell.includes('ksh')) {
    shellType = 'ksh';
    configPath = '~/.kshrc';
  }

  return {
    type: shellType,
    path: configPath,
    detectedShell: shell
  };
}

/**
 * Add environment variables to shell configuration
 * @param {string} configPath - Path to the shell configuration file
 * @param {Array<string>} envVars - Array of environment variables to add
 * @returns {boolean} - Whether the operation was successful
 */
function addEnvVarsToShellConfig(configPath, envVars) {
  try {
    const fullPath = configPath.replace('~', os.homedir());
    
    // Create directory if it doesn't exist (for fish shell)
    const configDir = path.dirname(fullPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Check if the configuration already exists
    const existingConfig = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
    if (existingConfig.includes(envVars[0])) {
      return false; // Configuration already exists
    }
    
    // Add new configuration
    fs.appendFileSync(fullPath, '\n\n' + envVars.join('\n') + '\n');

    // Source the configuration file
    try {
      const { execSync } = require('child_process');
      const sourceCmd = getSourceCommand(configPath);
      execSync(sourceCmd, { stdio: 'inherit' });
      return true;
    } catch (sourceError) {
      console.warn(`\n⚠️  Could not automatically source ${configPath}:`);
      console.warn(sourceError.message);
      console.warn('\nPlease run the following command manually:');
      console.warn(`  ${getSourceCommand(configPath)}`);
      return true;
    }
  } catch (error) {
    throw new Error(`Failed to add environment variables to ${configPath}: ${error.message}`);
  }
}

/**
 * Get the source command for the current shell
 * @param {string} configPath - Path to the shell configuration file
 * @returns {string} - The source command to use
 */
function getSourceCommand(configPath) {
  const shell = process.env.SHELL || '';
  if (shell.includes('fish')) {
    return `source ${configPath}`;
  }
  return `source ${configPath}`;
}

/**
 * Validates required fields from the config file
 * @param {Array<string>} [requiredFields=[]] - Array of field names to validate
 * @param {Object} [options={}] - Options for validation
 * @param {boolean} [options.logErrors=true] - Whether to log errors to console
 * @param {boolean} [options.exitOnError=true] - Whether to exit process on error
 * @returns {Array<string>} Array of missing field names, empty if all fields are present
 */
function validateRequiredFields(requiredFields = [], options = {}) {
  const { logErrors = true, exitOnError = true } = options;
  const missingFields = [];
  
  // Default required fields that are commonly needed
  const defaultFields = [
    'cloudflare_api_key',
    'cloudflare_account_id',
    'github_username',
    'repo_access_token',
    'app_name',
    'dockerhub_username',
    'dockerhub_password',
    'email'
  ];
  
  // Combine default fields with any provided fields, removing duplicates
  const allFields = [...new Set([...defaultFields, ...requiredFields])];
  
  for (const field of allFields) {
    const value = getConfigField(field);
    if (!value) {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0 && logErrors) {
    console.log('❌ Required fields missing in config:');
    missingFields.forEach(field => console.log(`  - ${field}`));
    console.log('Please update your config file and try again.');
    
    if (exitOnError) {
      process.exit(1);
    }
  }
  
  return missingFields;
}

module.exports = {
  pluralize,
  toSnakeCase,
  toPascalCase,
  toCamelCase,
  camelToSnake,
  handlePrompt,
  findProjectRoot,
  getConfigField,
  createGitHubRepos,
  getRepositoriesFromConfig,
  initializeAndPushGitRepo,
  updateGitHubSecrets,
  getSecretsFromConfig,
  getShellConfig,
  addEnvVarsToShellConfig,
  getSourceCommand,
  validateRequiredFields
}; 
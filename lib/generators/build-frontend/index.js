const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const yaml = require('yaml');
const { handlePrompt, getConfigField, createGitHubRepos, initializeAndPushGitRepo, updateGitHubSecrets } = require('../../lib/utils');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add debug option
    this.option('debug', {
      desc: 'Enable debug mode',
      type: Boolean,
      default: false
    });

    // Add progress indicator properties
    this._spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this._spinnerIndex = 0;
    this._spinnerInterval = null;
  }

  _startSpinner(message) {
    this._spinnerIndex = 0;
    this._spinnerInterval = setInterval(() => {
      process.stdout.write(`\r${this._spinnerChars[this._spinnerIndex]} ${message}`);
      this._spinnerIndex = (this._spinnerIndex + 1) % this._spinnerChars.length;
    }, 80);
  }

  _stopSpinner() {
    if (this._spinnerInterval) {
      clearInterval(this._spinnerInterval);
      process.stdout.write('\r\x1b[K'); // Clear the line
    }
  }

  async prompting() {
    // Get app name from config, defaulting to 'frontend' if not found
    const appName = getConfigField('config.app_name', 'frontend');

    const answers = await handlePrompt(this, [{
      type: 'input',
      name: 'appName',
      message: 'What would you like to name your app?',
      default: appName,
      validate: (input) => {
        if (!input) {
          return 'App name cannot be empty';
        }
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'App name can only contain lowercase letters, numbers, and hyphens';
        }
        return true;
      }
    }]);

    this.answers = {
      projectName: 'frontend', // Always use 'frontend' as the project name
      appName: answers.appName // Store the app name separately for wrangler
    };

    // Set flag indicating prompting is complete
    this._isPromptingComplete = true;
  }

  async configuring() {
    const { projectName } = this.answers;
    const projectPath = path.join(process.cwd(), projectName);
    
    // Check if project exists
    if (fs.existsSync(projectPath)) {
      const { action } = await handlePrompt(this, [{
        type: 'list',
        name: 'action',
        message: 'Project directory already exists. What would you like to do?',
        choices: [
          { name: 'Update existing project', value: 'update' },
          { name: 'Cancel installation', value: 'cancel' }
        ]
      }]);

      if (action === 'cancel') {
        this.log('Installation cancelled.');
        process.exit(0);
      }
    }
  }

  checkPrerequisites() {
    try {
      // Check if Node.js is installed
      const nodeVersion = execSync('node -v').toString();
      this.log('Node.js version:', nodeVersion.trim());

      // Check if npm is installed
      const npmVersion = execSync('npm -v').toString();
      this.log('npm version:', npmVersion.trim());

      // Check if Ionic CLI is installed
      try {
        const ionicVersion = execSync('ionic -v').toString();
        this.log('Ionic CLI version:', ionicVersion.trim());
      } catch (error) {
        this.log('Installing Ionic CLI...');
        execSync('npm install -g @ionic/cli');
        this.log('Ionic CLI has been installed successfully.');
      }
    } catch (error) {
      this.log('Error: Node.js is not installed. Please install Node.js before continuing.');
      process.exit(1);
    }
  }

  async install() {
    const { projectName } = this.answers;
    const projectPath = path.join(process.cwd(), projectName);
    const projectExists = fs.existsSync(projectPath);

    try {
      if (!projectExists) {
        this.log(`Creating new Ionic Angular project in current directory...`);
        // Start the spinner
        this._startSpinner('Creating Ionic project...');
        
        // Run ionic start command
        execSync(`ionic start ${projectName} blank --type=angular --capacitor --no-git`, { stdio: 'inherit' });
        
        // Stop the spinner
        this._stopSpinner();
        this.log('✓ Ionic project created successfully');
      } else {
        this.log(`Project "${projectName}" already exists. Updating dependencies...`);
      }

      // Change to the project directory
      process.chdir(projectPath);

      // Read the existing package.json
      const existingPackageJson = JSON.parse(
        fs.readFileSync('package.json', 'utf8')
      );

      // Get the Capacitor core version
      const capacitorCoreVersion = existingPackageJson.dependencies['@capacitor/core'];
      this.log(`Detected Capacitor core version: ${capacitorCoreVersion}`);

      // Read the template package.json
      const templatePackageJson = JSON.parse(
        this.fs.read(this.templatePath('package.json.erb'))
      );

      // Extract major version from Capacitor core
      const majorVersion = parseInt(capacitorCoreVersion.split('.')[0].replace('^', ''));
      
      // Update Capacitor platform versions to match the core version
      templatePackageJson.dependencies['@capacitor/android'] = `^${majorVersion}.0.0`;
      templatePackageJson.dependencies['@capacitor/ios'] = `^${majorVersion}.0.0`;

      // Check if dependencies need to be updated
      const needsUpdate = this._checkDependenciesNeedUpdate(
        existingPackageJson,
        templatePackageJson
      );

      if (needsUpdate) {
        // Merge dependencies
        existingPackageJson.dependencies = {
          ...existingPackageJson.dependencies,
          ...templatePackageJson.dependencies
        };

        // Merge devDependencies
        existingPackageJson.devDependencies = {
          ...existingPackageJson.devDependencies,
          ...templatePackageJson.devDependencies
        };

        // Write the updated package.json
        fs.writeFileSync('package.json', JSON.stringify(existingPackageJson, null, 2));

        // Install the new dependencies
        this.log('Installing/updating dependencies...');
        execSync('npm install', { stdio: 'inherit' });
      } else {
        this.log('All required dependencies are already installed.');
      }

      // Handle GitHub Actions workflow
      await this._setupGitHubActions(projectPath);

      // Handle .gitignore
      await this._setupGitignore(projectPath);

      // Handle capacitor.config.ts
      await this._setupCapacitorConfig(projectPath);

      // Handle README.md
      await this._setupReadme(projectPath);

      // Handle interceptors
      await this._setupInterceptors(projectPath);

      // Handle error service
      await this._setupErrorService(projectPath);

      // Handle auth service
      await this._setupAuthService(projectPath);

      // Handle storage service
      await this._setupStorageService(projectPath);

      // Handle logging service
      await this._setupLoggingService(projectPath);

      // Handle routes service
      await this._setupRoutesService(projectPath);

      // Handle toast service
      await this._setupToastService(projectPath);

      // Handle GraphQL service
      await this._setupGraphQLService(projectPath);

      // Handle shared directory
      await this._setupSharedDirectory(projectPath);

      // Handle app component files
      await this._setupAppComponent(projectPath);

      // Handle theme variables
      await this._setupThemeVariables(projectPath);

      // Handle main.ts
      await this._setupMainTs(projectPath);

      // Handle Apollo config
      await this._setupApolloConfig(projectPath);

      // Handle auth guard
      await this._setupAuthGuard(projectPath);

      // Update angular.json
      await this._updateAngularJson(projectPath);

      // Handle Dockerfile
      await this._setupDockerfile(projectPath);

      // Handle logging mutation
      await this._setupLoggingMutation(projectPath);

      // Handle environment files
      await this._setupEnvironmentFiles(projectPath);

      // Handle wrangler.jsonc
      await this._setupWranglerConfig(projectPath);

      // Setup github repository
      await this._setupGitHubRepository();

      this._printSummary(process.cwd(), projectName, projectExists);
    } catch (error) {
      this.log('Error processing project:', error.message);
      process.exit(1);
    }
  }

  async _setupGitHubRepository() {
    try {
      // Get GitHub credentials from config
      const githubUsername = getConfigField('config.github_username');
      const repoAccessToken = getConfigField('config.repo_access_token');
      
      if (!githubUsername || !repoAccessToken) {
        this.log('⚠️  GitHub credentials not found in config. Skipping repository creation.');
        return;
      }

      // Ask user if they want to create the repository
      const { createRepo } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'createRepo',
        message: `Would you like to create the ${this.answers.appName}-frontend repository?`,
        default: true
      }]);

      if (createRepo) {
        // Ask if repository should be private
        const { isPrivate } = await handlePrompt(this, [{
          type: 'confirm',
          name: 'isPrivate',
          message: 'Should the repository be private?',
          default: true
        }]);

        try {
          const repoName = `${this.answers.appName}-frontend`;
          await createGitHubRepos(
            githubUsername,
            repoAccessToken,
            repoName,
            !isPrivate // invert isPrivate since createGitHubRepos expects isPublic
          );
          this.log('✓ GitHub repository created successfully');

          // Initialize Git repository and push initial commit
          this.log('Initializing Git repository...');
          await initializeAndPushGitRepo(githubUsername, repoName);
          this.log('✓ Initial commit pushed to GitHub');

          // Set Cloudflare secrets
          this.log('Setting Cloudflare secrets...');
          const cloudflareSecrets = [
            {
              key: 'CLOUDFLARE_API_TOKEN',
              value: getConfigField('config.cloudflare_api_key')
            },
            {
              key: 'CLOUDFLARE_ACCOUNT_ID',
              value: getConfigField('config.cloudflare_account_id')
            }
          ];

          await updateGitHubSecrets(githubUsername, repoName, repoAccessToken, cloudflareSecrets);
          this.log('✓ Cloudflare secrets set successfully');
        } catch (error) {
          this.log('❌ Error creating GitHub repository:', error.message);
        }
      } else {
        this.log('⚠️  Skipping GitHub repository creation');
      }
    } catch (error) {
      this.log('⚠️  Error accessing config file:', error.message);
      this.log('⚠️  Skipping GitHub repository creation');
    }
  }

  async _setupGitHubActions(projectPath) {
    const workflowPath = path.join(projectPath, '.github', 'workflows', 'deploy.yml');
    const workflowDir = path.dirname(workflowPath);

    // Create .github/workflows directory if it doesn't exist
    if (!fs.existsSync(workflowDir)) {
      fs.mkdirSync(workflowDir, { recursive: true });
    }

    // Check if workflow file exists
    if (fs.existsSync(workflowPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'GitHub Actions workflow file already exists. Do you want to overwrite it?',
        default: false
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping GitHub Actions workflow setup.');
        return;
      }
    }

    // Copy the workflow file
    this.fs.copy(
      this.templatePath('github/workflows/deploy.yml.erb'),
      workflowPath
    );

    this.log('✓ Added GitHub Actions workflow for deploying to Cloudflare');
  }

  async _setupGitignore(projectPath) {
    const gitignorePath = path.join(projectPath, '.gitignore');

    // Check if .gitignore exists
    if (fs.existsSync(gitignorePath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: '.gitignore file already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping .gitignore setup.');
        return;
      }
    }

    // Read the template content and write it directly
    const templateContent = this.fs.read(this.templatePath('gitignore.erb'));
    fs.writeFileSync(gitignorePath, templateContent);

    this.log('✓ Added .gitignore file');
  }

  async _setupCapacitorConfig(projectPath) {
    const configPath = path.join(projectPath, 'capacitor.config.ts');

    // Check if config file exists
    if (fs.existsSync(configPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'capacitor.config.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping capacitor.config.ts setup.');
        return;
      }
    }

    // Read the template content and write it directly
    const templateContent = this.fs.read(this.templatePath('capacitor.config.ts.erb'));
    const interpolatedContent = templateContent.replace(/<%= projectName %>/g, this.answers.projectName);
    fs.writeFileSync(configPath, interpolatedContent);

    this.log('✓ Updated capacitor.config.ts');
  }

  async _setupReadme(projectPath) {
    const readmePath = path.join(projectPath, 'README.md');

    // Check if README.md exists
    if (fs.existsSync(readmePath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'README.md already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping README.md setup.');
        return;
      }
    }

    // Read the template content and write it directly
    const templateContent = this.fs.read(this.templatePath('README.md.erb'));
    fs.writeFileSync(readmePath, templateContent);

    this.log('✓ Added README.md with build instructions');
  }

  async _setupInterceptors(projectPath) {
    const interceptorsDir = path.join(projectPath, 'src', 'app', 'interceptors');
    
    // Create interceptors directory if it doesn't exist
    if (!fs.existsSync(interceptorsDir)) {
      fs.mkdirSync(interceptorsDir, { recursive: true });
    }

    // Handle http-error.interceptor.ts
    const interceptorPath = path.join(interceptorsDir, 'http-error.interceptor.ts');
    if (fs.existsSync(interceptorPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'http-error.interceptor.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping http-error.interceptor.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/interceptors/http-error.interceptor.ts.erb'));
        fs.writeFileSync(interceptorPath, templateContent);
        this.log('✓ Added http-error.interceptor.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/interceptors/http-error.interceptor.ts.erb'));
      fs.writeFileSync(interceptorPath, templateContent);
      this.log('✓ Added http-error.interceptor.ts');
    }

    // Handle http-error.interceptor.spec.ts
    const specPath = path.join(interceptorsDir, 'http-error.interceptor.spec.ts');
    if (fs.existsSync(specPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'http-error.interceptor.spec.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping http-error.interceptor.spec.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/interceptors/http-error.interceptor.spec.ts.erb'));
        fs.writeFileSync(specPath, templateContent);
        this.log('✓ Added http-error.interceptor.spec.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/interceptors/http-error.interceptor.spec.ts.erb'));
      fs.writeFileSync(specPath, templateContent);
      this.log('✓ Added http-error.interceptor.spec.ts');
    }
  }

  async _setupErrorService(projectPath) {
    const errorsDir = path.join(projectPath, 'src', 'app', 'services', 'errors');
    
    // Create errors directory if it doesn't exist
    if (!fs.existsSync(errorsDir)) {
      fs.mkdirSync(errorsDir, { recursive: true });
    }

    // Handle error.service.ts
    const servicePath = path.join(errorsDir, 'error.service.ts');
    if (fs.existsSync(servicePath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'error.service.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping error.service.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/services/errors/error.service.ts.erb'));
        fs.writeFileSync(servicePath, templateContent);
        this.log('✓ Added error.service.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/services/errors/error.service.ts.erb'));
      fs.writeFileSync(servicePath, templateContent);
      this.log('✓ Added error.service.ts');
    }

    // Handle error.service.spec.ts
    const specPath = path.join(errorsDir, 'error.service.spec.ts');
    if (fs.existsSync(specPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'error.service.spec.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping error.service.spec.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/services/errors/error.service.spec.ts.erb'));
        fs.writeFileSync(specPath, templateContent);
        this.log('✓ Added error.service.spec.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/services/errors/error.service.spec.ts.erb'));
      fs.writeFileSync(specPath, templateContent);
      this.log('✓ Added error.service.spec.ts');
    }
  }

  async _setupAuthService(projectPath) {
    const authDir = path.join(projectPath, 'src', 'app', 'services', 'auth');
    
    // Create auth directory if it doesn't exist
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Handle auth.service.ts
    const servicePath = path.join(authDir, 'auth.service.ts');
    if (fs.existsSync(servicePath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'auth.service.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping auth.service.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/services/auth/auth.service.ts.erb'));
        fs.writeFileSync(servicePath, templateContent);
        this.log('✓ Added auth.service.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/services/auth/auth.service.ts.erb'));
      fs.writeFileSync(servicePath, templateContent);
      this.log('✓ Added auth.service.ts');
    }
  }

  async _setupStorageService(projectPath) {
    const initDir = path.join(projectPath, 'src', 'app', 'services', 'init');
    
    // Create init directory if it doesn't exist
    if (!fs.existsSync(initDir)) {
      fs.mkdirSync(initDir, { recursive: true });
    }

    // Handle storage.service.ts
    const servicePath = path.join(initDir, 'storage.service.ts');
    if (fs.existsSync(servicePath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'storage.service.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping storage.service.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/services/init/storage.service.ts.erb'));
        fs.writeFileSync(servicePath, templateContent);
        this.log('✓ Added storage.service.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/services/init/storage.service.ts.erb'));
      fs.writeFileSync(servicePath, templateContent);
      this.log('✓ Added storage.service.ts');
    }
  }

  async _setupLoggingService(projectPath) {
    const logsDir = path.join(projectPath, 'src', 'app', 'services', 'logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Handle logging.service.ts
    const servicePath = path.join(logsDir, 'logging.service.ts');
    if (fs.existsSync(servicePath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'logging.service.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping logging.service.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/services/logs/logging.service.ts.erb'));
        fs.writeFileSync(servicePath, templateContent);
        this.log('✓ Added logging.service.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/services/logs/logging.service.ts.erb'));
      fs.writeFileSync(servicePath, templateContent);
      this.log('✓ Added logging.service.ts');
    }
  }

  async _setupRoutesService(projectPath) {
    const routesDir = path.join(projectPath, 'src', 'app', 'services', 'routes');
    
    // Create routes directory if it doesn't exist
    if (!fs.existsSync(routesDir)) {
      fs.mkdirSync(routesDir, { recursive: true });
    }

    // Handle routes.service.ts
    const servicePath = path.join(routesDir, 'routes.service.ts');
    if (fs.existsSync(servicePath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'routes.service.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping routes.service.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/services/routes/routes.service.ts.erb'));
        fs.writeFileSync(servicePath, templateContent);
        this.log('✓ Added routes.service.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/services/routes/routes.service.ts.erb'));
      fs.writeFileSync(servicePath, templateContent);
      this.log('✓ Added routes.service.ts');
    }
  }

  async _setupToastService(projectPath) {
    const uiDir = path.join(projectPath, 'src', 'app', 'services', 'ui');
    
    // Create ui directory if it doesn't exist
    if (!fs.existsSync(uiDir)) {
      fs.mkdirSync(uiDir, { recursive: true });
    }

    // Handle toast.service.ts
    const servicePath = path.join(uiDir, 'toast.service.ts');
    if (fs.existsSync(servicePath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'toast.service.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping toast.service.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/services/ui/toast.service.ts.erb'));
        fs.writeFileSync(servicePath, templateContent);
        this.log('✓ Added toast.service.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/services/ui/toast.service.ts.erb'));
      fs.writeFileSync(servicePath, templateContent);
      this.log('✓ Added toast.service.ts');
    }
  }

  async _setupGraphQLService(projectPath) {
    const servicesDir = path.join(projectPath, 'src', 'app', 'services');
    
    // Handle graphql.service.ts
    const servicePath = path.join(servicesDir, 'graphql.service.ts');
    if (fs.existsSync(servicePath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'graphql.service.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping graphql.service.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/services/graphql.service.ts.erb'));
        fs.writeFileSync(servicePath, templateContent);
        this.log('✓ Added graphql.service.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/services/graphql.service.ts.erb'));
      fs.writeFileSync(servicePath, templateContent);
      this.log('✓ Added graphql.service.ts');
    }
  }

  async _setupSharedDirectory(projectPath) {
    const sharedDir = path.join(projectPath, 'src', 'app', 'shared');
    const templateSharedDir = this.templatePath('src/app/shared');

    // Check if shared directory exists
    if (fs.existsSync(sharedDir)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'shared directory already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping shared directory setup.');
        return;
      }
    }

    // Create shared directory if it doesn't exist
    if (!fs.existsSync(sharedDir)) {
      fs.mkdirSync(sharedDir, { recursive: true });
    }

    // Function to recursively copy directory contents
    const copyDirectory = (source, target) => {
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
      }

      const files = fs.readdirSync(source);
      
      for (const file of files) {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);

        if (fs.statSync(sourcePath).isDirectory()) {
          copyDirectory(sourcePath, targetPath);
        } else {
          const templateContent = this.fs.read(sourcePath);
          fs.writeFileSync(targetPath, templateContent);
        }
      }
    };

    // Copy the entire shared directory structure
    copyDirectory(templateSharedDir, sharedDir);
    this.log('✓ Added shared directory structure with all contents');
  }

  async _setupAppComponent(projectPath) {
    const appDir = path.join(projectPath, 'src', 'app');
    const files = ['app.component.html', 'app.component.scss', 'app.component.ts'];

    for (const file of files) {
      const targetPath = path.join(appDir, file);
      const templatePath = this.templatePath(`src/app/${file}.erb`);

      if (fs.existsSync(targetPath)) {
        const { confirmOverwrite } = await handlePrompt(this, [{
          type: 'confirm',
          name: 'confirmOverwrite',
          message: `${file} already exists. Do you want to overwrite it?`,
          default: true
        }]);

        if (!confirmOverwrite) {
          this.log(`Skipping ${file} setup.`);
          continue;
        }
      }

      const templateContent = this.fs.read(templatePath);
      fs.writeFileSync(targetPath, templateContent);
      this.log(`✓ Added ${file}`);
    }
  }

  async _setupThemeVariables(projectPath) {
    const themeDir = path.join(projectPath, 'src', 'theme');
    
    // Create theme directory if it doesn't exist
    if (!fs.existsSync(themeDir)) {
      fs.mkdirSync(themeDir, { recursive: true });
    }

    // Handle variables.scss
    const variablesPath = path.join(themeDir, 'variables.scss');
    if (fs.existsSync(variablesPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'variables.scss already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping variables.scss setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/theme/variables.scss.erb'));
        fs.writeFileSync(variablesPath, templateContent);
        this.log('✓ Added variables.scss');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/theme/variables.scss.erb'));
      fs.writeFileSync(variablesPath, templateContent);
      this.log('✓ Added variables.scss');
    }
  }

  async _setupMainTs(projectPath) {
    const srcDir = path.join(projectPath, 'src');
    
    // Handle main.ts
    const mainPath = path.join(srcDir, 'main.ts');
    if (fs.existsSync(mainPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'main.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping main.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/main.ts.erb'));
        fs.writeFileSync(mainPath, templateContent);
        this.log('✓ Added main.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/main.ts.erb'));
      fs.writeFileSync(mainPath, templateContent);
      this.log('✓ Added main.ts');
    }
  }

  async _setupApolloConfig(projectPath) {
    const graphqlDir = path.join(projectPath, 'src', 'app', 'graphql');
    
    // Create graphql directory if it doesn't exist
    if (!fs.existsSync(graphqlDir)) {
      fs.mkdirSync(graphqlDir, { recursive: true });
    }

    // Handle apollo.config.ts
    const configPath = path.join(graphqlDir, 'apollo.config.ts');
    if (fs.existsSync(configPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'apollo.config.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping apollo.config.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/graphql/apollo.config.ts.erb'));
        fs.writeFileSync(configPath, templateContent);
        this.log('✓ Added apollo.config.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/graphql/apollo.config.ts.erb'));
      fs.writeFileSync(configPath, templateContent);
      this.log('✓ Added apollo.config.ts');
    }
  }

  async _setupAuthGuard(projectPath) {
    const guardsDir = path.join(projectPath, 'src', 'app', 'auth', 'guards');
    
    // Create guards directory if it doesn't exist
    if (!fs.existsSync(guardsDir)) {
      fs.mkdirSync(guardsDir, { recursive: true });
    }

    // Handle auth.guard.ts
    const guardPath = path.join(guardsDir, 'auth.guard.ts');
    if (fs.existsSync(guardPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'auth.guard.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping auth.guard.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/auth/guards/auth.guard.ts.erb'));
        fs.writeFileSync(guardPath, templateContent);
        this.log('✓ Added auth.guard.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/auth/guards/auth.guard.ts.erb'));
      fs.writeFileSync(guardPath, templateContent);
      this.log('✓ Added auth.guard.ts');
    }
  }

  async _updateAngularJson(projectPath) {
    const angularJsonPath = path.join(projectPath, 'angular.json');
    
    if (!fs.existsSync(angularJsonPath)) {
      this.log('angular.json not found. Skipping update.');
      return;
    }

    try {
      const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
      
      // Update the architect section
      if (angularJson.projects && angularJson.projects.app && angularJson.projects.app.architect) {
        const architect = angularJson.projects.app.architect;
        
        // Update build configuration
        if (architect.build) {
          architect.build.options.outputPath = "www";

          // Update budgets for component styles
          if (architect.build.configurations && architect.build.configurations.production) {
            const budgets = architect.build.configurations.production.budgets;
            if (budgets) {
              const styleBudget = budgets.find(budget => budget.type === 'anyComponentStyle');
              if (styleBudget) {
                styleBudget.maximumWarning = '6kb';
                styleBudget.maximumError = '10kb';
              }
            }
          }
        }

        // Update serve configuration
        if (architect.serve) {
          architect.serve.configurations = {
            production: {
              buildTarget: "app:build:production"
            },
            development: {
              buildTarget: "app:build:development"
            },
            ci: {
              progress: false
            }
          };
          architect.serve.defaultConfiguration = "development";
        }

        // Update test configuration
        if (architect.test) {
          architect.test.options = {
            main: "src/test.ts",
            polyfills: "src/polyfills.ts",
            tsConfig: "tsconfig.spec.json",
            karmaConfig: "karma.conf.js",
            inlineStyleLanguage: "scss",
            assets: [
              {
                glob: "**/*",
                input: "src/assets",
                output: "assets"
              }
            ],
            styles: ["src/global.scss", "src/theme/variables.scss"],
            scripts: []
          };
          architect.test.configurations = {
            ci: {
              progress: false,
              watch: false
            }
          };
        }

        // Update lint configuration
        if (architect.lint) {
          architect.lint.options = {
            lintFilePatterns: ["src/**/*.ts", "src/**/*.html"]
          };
        }

        // Write the updated angular.json back to file
        fs.writeFileSync(angularJsonPath, JSON.stringify(angularJson, null, 2));
        this.log('✓ Updated angular.json configuration');
      } else {
        this.log('Could not find architect section in angular.json');
      }
    } catch (error) {
      this.log('Error updating angular.json:', error.message);
    }
  }

  async _setupDockerfile(projectPath) {
    const dockerfilePath = path.join(projectPath, 'Dockerfile');
    
    // Handle Dockerfile
    if (fs.existsSync(dockerfilePath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'Dockerfile already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping Dockerfile setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('Dockerfile.erb'));
        fs.writeFileSync(dockerfilePath, templateContent);
        this.log('✓ Added Dockerfile');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('Dockerfile.erb'));
      fs.writeFileSync(dockerfilePath, templateContent);
      this.log('✓ Added Dockerfile');
    }
  }

  async _setupLoggingMutation(projectPath) {
    const mutationsDir = path.join(projectPath, 'src', 'app', 'graphql', 'mutations');
    
    // Create mutations directory if it doesn't exist
    if (!fs.existsSync(mutationsDir)) {
      fs.mkdirSync(mutationsDir, { recursive: true });
    }

    // Handle logging.mutation.ts
    const mutationPath = path.join(mutationsDir, 'logging.mutation.ts');
    if (fs.existsSync(mutationPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'logging.mutation.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping logging.mutation.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/app/graphql/mutations/logging.mutation.ts.erb'));
        fs.writeFileSync(mutationPath, templateContent);
        this.log('✓ Added logging.mutation.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/app/graphql/mutations/logging.mutation.ts.erb'));
      fs.writeFileSync(mutationPath, templateContent);
      this.log('✓ Added logging.mutation.ts');
    }
  }

  async _setupEnvironmentFiles(projectPath) {
    const environmentsDir = path.join(projectPath, 'src', 'environments');
    
    // Create environments directory if it doesn't exist
    if (!fs.existsSync(environmentsDir)) {
      fs.mkdirSync(environmentsDir, { recursive: true });
    }

    // Generate encryption key using openssl
    const encryptionKey = execSync('openssl rand -hex 32').toString().trim();
    this.log('Generated new encryption key');

    // Handle environment.ts
    const devEnvPath = path.join(environmentsDir, 'environment.ts');
    if (fs.existsSync(devEnvPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'environment.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping environment.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/environments/environment.ts.erb'));
        const interpolatedContent = templateContent.replace(/<%= encryptionKey %>/g, encryptionKey);
        fs.writeFileSync(devEnvPath, interpolatedContent);
        this.log('✓ Added environment.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/environments/environment.ts.erb'));
      const interpolatedContent = templateContent.replace(/<%= encryptionKey %>/g, encryptionKey);
      fs.writeFileSync(devEnvPath, interpolatedContent);
      this.log('✓ Added environment.ts');
    }

    // Handle environment.prod.ts
    const prodEnvPath = path.join(environmentsDir, 'environment.prod.ts');
    if (fs.existsSync(prodEnvPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'environment.prod.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping environment.prod.ts setup.');
      } else {
        const templateContent = this.fs.read(this.templatePath('src/environments/environment.prod.ts.erb'));
        const interpolatedContent = templateContent.replace(/<%= encryptionKey %>/g, encryptionKey);
        fs.writeFileSync(prodEnvPath, interpolatedContent);
        this.log('✓ Added environment.prod.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/environments/environment.prod.ts.erb'));
      const interpolatedContent = templateContent.replace(/<%= encryptionKey %>/g, encryptionKey);
      fs.writeFileSync(prodEnvPath, interpolatedContent);
      this.log('✓ Added environment.prod.ts');
    }
  }

  async _setupWranglerConfig(projectPath) {
    const wranglerPath = path.join(projectPath, 'wrangler.jsonc');
    
    // Handle wrangler.jsonc
    if (fs.existsSync(wranglerPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'wrangler.jsonc already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping wrangler.jsonc setup.');
        return;
      }
    }

    // Get current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Read the template content and write it directly
    const templateContent = this.fs.read(this.templatePath('wrangler.jsonc.erb'));
    const interpolatedContent = templateContent
      .replace(/<%= compatibility_date %>/g, currentDate)
      .replace(/<%= appName %>/g, this.answers.appName + '-worker');
    fs.writeFileSync(wranglerPath, interpolatedContent);
    
    this.log('✓ Added wrangler.jsonc configuration');
  }

  _checkDependenciesNeedUpdate(existingJson, templateJson) {
    // Check dependencies
    for (const [dep, version] of Object.entries(templateJson.dependencies)) {
      if (!existingJson.dependencies[dep] || existingJson.dependencies[dep] !== version) {
        return true;
      }
    }

    // Check devDependencies
    for (const [dep, version] of Object.entries(templateJson.devDependencies)) {
      if (!existingJson.devDependencies[dep] || existingJson.devDependencies[dep] !== version) {
        return true;
      }
    }

    return false;
  }

  _printSummary(installPath, projectName, projectExists) {
    this.log('\n=== Installation Summary ===');
    this.log('\nProject Setup:');
    this.log(`✓ ${projectExists ? 'Updated' : 'Created'} Ionic Angular project: ${projectName}`);
    this.log(`✓ Location: ${path.join(installPath, projectName)}`);
    this.log('✓ Dependencies:');
    this.log('  • @capacitor/android and @capacitor/ios');
    this.log('  • @ionic/storage-angular');
    this.log('  • Apollo GraphQL packages');
    this.log('  • GraphQL');
    this.log('✓ GitHub Actions:');
    this.log('  • Added frontend build and deployment workflow');
    this.log('✓ Git:');
    this.log('  • Added .gitignore file');
    this.log('✓ Capacitor:');
    this.log('  • Updated capacitor.config.ts');
    this.log('✓ Documentation:');
    this.log('  • Added README.md with build instructions');
    this.log('✓ Interceptors:');
    this.log('  • Added HTTP error interceptor and tests');
    this.log('✓ Services:');
    this.log('  • Added error service and tests');
    this.log('  • Added auth service');
    this.log('  • Added storage service');
    this.log('  • Added logging service');
    this.log('  • Added routes service');
    this.log('  • Added toast service');
    this.log('  • Added GraphQL service');
    this.log('✓ Shared Directory:');
    this.log('  • Added interfaces, components, pages, and base directories');
    this.log('✓ App Component:');
    this.log('  • Added app.component.html, app.component.scss, and app.component.ts');
    this.log('✓ Theme:');
    this.log('  • Added variables.scss with custom color palette');
    this.log('✓ Application:');
    this.log('  • Added main.ts with app bootstrap configuration');
    this.log('✓ GraphQL:');
    this.log('  • Added apollo.config.ts with authentication setup');
    this.log('✓ Authentication:');
    this.log('  • Added auth guard for protected routes');
    this.log('✓ Angular Configuration:');
    this.log('  • Updated angular.json with proper build and serve configurations');
    this.log('✓ Docker:');
    this.log('  • Added Dockerfile with multi-stage build configuration');
    this.log('✓ GraphQL Mutations:');
    this.log('  • Added logging mutation for error tracking');
    this.log('✓ Environment Configuration:');
    this.log('  • Added environment.ts and environment.prod.ts with secure encryption key');
    this.log('✓ Wrangler Configuration:');
    this.log('  • Added wrangler.jsonc configuration');
    
    this.log('\nNext Steps:');
    this.log('1. cd into your project directory:');
    this.log(`   cd ${projectName}`);
    this.log('2. Start the development server:');
    this.log('   ionic serve');
    
    this.log('\nAvailable Commands:');
    this.log('• ionic serve - Start the development server');
    this.log('• ionic build - Build the app for production');
    this.log('• ionic capacitor add android - Add Android platform');
    this.log('• ionic capacitor add ios - Add iOS platform');
    this.log('• ionic capacitor copy - Copy web assets to native platforms');
    this.log('• ionic capacitor open - Open native project in IDE');
  }

  _debugLog(message) {
    if (this.options.debug) {
      this.log(`[DEBUG] ${message}`);
    }
  }
}; 
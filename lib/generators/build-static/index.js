const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { handlePrompt, getConfigField, validateRequiredFields } = require('../../lib/utils');
const BaseGenerator = require('../base');

module.exports = class extends BaseGenerator {
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
    validateRequiredFields();

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
      projectName: 'static', // Changed from 'frontend' to 'static'
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

      // Handle .gitignore
      await this._setupGitignore(projectPath);

      // Handle capacitor.config.ts
      await this._setupCapacitorConfig(projectPath);

      // Handle README.md
      await this._setupReadme(projectPath);

      // Handle error service
      await this._setupErrorService(projectPath);

      // Handle storage service
      await this._setupStorageService(projectPath);

      // Handle logging service
      await this._setupLoggingService(projectPath);

      // Handle routes service
      await this._setupRoutesService(projectPath);

      // Handle toast service
      await this._setupToastService(projectPath);

      // Handle shared directory
      await this._setupSharedDirectory(projectPath);

      // Handle app component files
      await this._setupAppComponent(projectPath);

      // Handle theme variables
      await this._setupThemeVariables(projectPath);

      // Handle main.ts
      await this._setupMainTs(projectPath);

      // Handle app.routes.ts
      await this._setupAppRoutes(projectPath);

      // Update angular.json
      await this._updateAngularJson(projectPath);

      // Handle Dockerfile
      await this._setupDockerfile(projectPath);

      // Handle environment files
      await this._setupEnvironmentFiles(projectPath);

      // Handle wrangler.jsonc
      await this._setupWranglerConfig(projectPath);

      // Set up GitHub Actions workflow
      await this._setupGitHubActions(projectPath);

      // Update package.json scripts
      await this._updatePackageJsonScripts(projectPath);

      // Remove default home directory
      await this._removeDefaultHome(projectPath);

      // Set up new home page
      await this._setupHomePage(projectPath);

      this._printSummary(process.cwd(), projectName, projectExists);
    } catch (error) {
      this.log('Error processing project:', error.message);
      process.exit(1);
    }
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

  async _setupAppRoutes(projectPath) {
    const routesPath = path.join(projectPath, 'src', 'app', 'app.routes.ts');
    
    if (fs.existsSync(routesPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'app.routes.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping app.routes.ts setup.');
        return;
      }
    }

    const templateContent = this.fs.read(this.templatePath('src/app/app.routes.ts.erb'));
    fs.writeFileSync(routesPath, templateContent);
    this.log('✓ Added app.routes.ts');
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
          architect.build.options.outputPath = "www/cloudflare";

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
        this.log('✓ Updated angular.json configuration with Cloudflare output path');
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
      .replace(/<%= appName %>/g, this.answers.appName);
    fs.writeFileSync(wranglerPath, interpolatedContent);
    
    this.log('✓ Added wrangler.jsonc configuration');
  }

  async _setupGitHubActions(projectPath) {
    const workflowsDir = path.join(projectPath, '.github', 'workflows');
    
    // Create .github/workflows directory if it doesn't exist
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir, { recursive: true });
    }

    // Handle cloudflare.yml
    const workflowPath = path.join(workflowsDir, 'cloudflare.yml');
    if (fs.existsSync(workflowPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'cloudflare.yml already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping cloudflare.yml setup.');
        return;
      }
    }

    // Read the template content and write it directly
    const templateContent = this.fs.read(this.templatePath('.github/workflows/cloudflare.yml.erb'));
    fs.writeFileSync(workflowPath, templateContent);
    
    this.log('✓ Added GitHub Actions workflow for Cloudflare Pages');
  }

  async _updatePackageJsonScripts(projectPath) {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.log('package.json not found. Skipping scripts update.');
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Update or add scripts
      packageJson.scripts = {
        ...packageJson.scripts,
        "preview": "npm run build && cd www/cloudflare/browser && http-server --cors -o -c-1",
        "build": "ng build --configuration production"
      };

      // Write the updated package.json back to file
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      this.log('✓ Updated package.json scripts');
    } catch (error) {
      this.log('Error updating package.json scripts:', error.message);
    }
  }

  async _removeDefaultHome(projectPath) {
    const homeDir = path.join(projectPath, 'src', 'app', 'home');
    
    if (fs.existsSync(homeDir)) {
      try {
        fs.rmSync(homeDir, { recursive: true, force: true });
        this.log('✓ Removed default home directory');
      } catch (error) {
        this.log('Warning: Could not remove default home directory:', error.message);
      }
    }
  }

  async _setupHomePage(projectPath) {
    const homeDir = path.join(projectPath, 'src', 'app', 'pages', 'home');
    
    // Create home directory if it doesn't exist
    if (!fs.existsSync(homeDir)) {
      fs.mkdirSync(homeDir, { recursive: true });
    }

    // Set up home.page.html
    const htmlPath = path.join(homeDir, 'home.page.html');
    const htmlContent = this.fs.read(this.templatePath('src/app/pages/home/home.page.html.erb'));
    fs.writeFileSync(htmlPath, htmlContent);
    this.log('✓ Added home.page.html');

    // Set up home.page.scss
    const scssPath = path.join(homeDir, 'home.page.scss');
    const scssContent = this.fs.read(this.templatePath('src/app/pages/home/home.page.scss.erb'));
    fs.writeFileSync(scssPath, scssContent);
    this.log('✓ Added home.page.scss');

    // Set up home.page.ts
    const tsPath = path.join(homeDir, 'home.page.ts');
    const tsContent = this.fs.read(this.templatePath('src/app/pages/home/home.page.ts.erb'));
    fs.writeFileSync(tsPath, tsContent);
    this.log('✓ Added home.page.ts');
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
    this.log('✓ Services:');
    this.log('  • Added error service and tests');
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
    this.log('✓ Angular Configuration:');
    this.log('  • Updated angular.json with proper build and serve configurations');
    this.log('✓ Docker:');
    this.log('  • Added Dockerfile with multi-stage build configuration');
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
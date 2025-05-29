const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { handlePrompt, getConfigField, validateRequiredFields } = require('../../lib/utils');
const BaseGenerator = require('../base');
const Generator = require('yeoman-generator');

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

    // Add rm option
    this.option('rm', {
      type: Boolean,
      default: false,
      description: 'Remove the static-web project'
    });
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

  async initializing() {
    // Check if --rm flag is present
    if (this.options.rm) {
      const appName = getConfigField('config.app_name');
      if (!appName) {
        this.log('\n' + '='.repeat(80));
        this.log('❌ Could not find project name in .rapidrc!');
        this.log('='.repeat(80));
        this.log('\nPlease ensure your .rapidrc file contains a valid config.app_name field.');
        this.log('\n' + '='.repeat(80) + '\n');
        process.exit(1);
      }

      // Prompt for confirmation
      const confirmAnswer = await this.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Do you want to remove the static-web project folder?`,
          default: false
        }
      ]);

      if (!confirmAnswer.confirm) {
        this.log('\nOperation cancelled by user.');
        process.exit(0);
      }

      // Remove the static-web directory
      try {
        const projectDir = path.join(process.cwd(), 'static-web');
        if (fs.existsSync(projectDir)) {
          fs.rmSync(projectDir, { recursive: true, force: true });
          this.log('✓ Removed static-web directory');
        } else {
          this.log('static-web directory not found.');
        }
        process.exit(0);
      } catch (error) {
        this.log.error('\n❌ Error removing static-web directory:', error.message);
        process.exit(1);
      }
    }

    // Validate required fields
    validateRequiredFields([
      'config.cloudflare_api_key',
      'config.cloudflare_account_id',
      'config.github_username',
      'config.repo_access_token',
      'config.supabase_url',
      'config.supabase_anonkey'
    ]);
  }

  async prompting() {
    validateRequiredFields();

    // Get app name from config, defaulting to 'static-web' if not found
    const appName = getConfigField('config.app_name', 'static-web');

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
      projectName: 'static-web',
      outputPath: getConfigField('config.output_path', 'www/cloudflare'),
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
        this.log(`Creating new Angular project in current directory...`);
        // Start the spinner
        this._startSpinner('Creating project...');
        
        // Run ionic start command
        execSync(`ng new ${projectName} --routing --style=scss --skip-git`, { stdio: 'inherit' });
        
        // Stop the spinner
        this._stopSpinner();
        this.log('✓ Angular project created successfully');
      } else {
        this.log(`Project "${projectName}" already exists. Updating dependencies...`);
      }

      // Change to the project directory
      process.chdir(projectPath);

      // Handle .gitignore
      await this._setupGitignore(projectPath);

      // Handle README.md
      await this._setupReadme(projectPath);

      // Handle environment files
      await this._setupEnvironmentFiles(projectPath);

      // Update angular.json
      await this._updateAngularJson(projectPath);

      // Update package.json scripts
      await this._updatePackageJsonScripts(projectPath);

      // Handle auth.service.ts
      await this._setupAuthService(projectPath);

      // Handle auth.guard.ts
      await this._setupAuthGuard(projectPath);

      // Handle app.routes.ts
      await this._setupAppRoutes(projectPath);

      // Handle Dockerfile
      await this._setupDockerfile(projectPath);

      // Handle wrangler.jsonc
      await this._setupWranglerConfig(projectPath);

      // Set up GitHub Actions workflow
      await this._setupGitHubActions(projectPath);

      // Add auth pages
      await this._setupAuthPages(projectPath);

      // Add dashboard page
      await this._setupDashboardPage(projectPath);

      // Add header component
      await this._setupHeaderComponent(projectPath);

      // Update app component
      await this._setupAppComponent(projectPath);

      // Update app config
      await this._setupAppConfig(projectPath);

      // Install dependencies
      this.log('Installing dependencies...');
      execSync('npm install', { stdio: 'inherit' });
      this.log('✓ Dependencies installed successfully');

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

  async _setupAuthService(projectPath) {
    const serviceDir = path.join(projectPath, 'src', 'app', 'services');
    const servicePath = path.join(serviceDir, 'auth.service.ts');
    
    // Create services directory if it doesn't exist
    if (!fs.existsSync(serviceDir)) {
      fs.mkdirSync(serviceDir, { recursive: true });
    }
    
    if (fs.existsSync(servicePath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'auth.service.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping auth.service.ts setup.');
        return;
      }
    }

    const templateContent = this.fs.read(this.templatePath('src/app/services/auth.service.ts.erb'));
    fs.writeFileSync(servicePath, templateContent);
    this.log('✓ Added auth.service.ts');
  }

  async _setupAuthGuard(projectPath) {
    const guardDir = path.join(projectPath, 'src', 'app', 'guards');
    const guardPath = path.join(guardDir, 'auth.guard.ts');
    
    // Create guards directory if it doesn't exist
    if (!fs.existsSync(guardDir)) {
      fs.mkdirSync(guardDir, { recursive: true });
    }
    
    if (fs.existsSync(guardPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'auth.guard.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping auth.guard.ts setup.');
        return;
      }
    }

    const templateContent = this.fs.read(this.templatePath('src/app/guards/auth.guard.ts.erb'));
    fs.writeFileSync(guardPath, templateContent);
    this.log('✓ Added auth.guard.ts');
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

  async _setupEnvironmentFiles(projectPath) {
    const environmentsDir = path.join(projectPath, 'src', 'environments');
    
    // Create environments directory if it doesn't exist
    if (!fs.existsSync(environmentsDir)) {
      fs.mkdirSync(environmentsDir, { recursive: true });
    }

    // Get Supabase configuration from .rapidrc
    const supabaseUrl = getConfigField('config.supabase_url');
    const supabaseAnonKey = getConfigField('config.supabase_anonkey');

    if (!supabaseUrl || !supabaseAnonKey) {
      this.log.error('❌ Missing Supabase configuration in .rapidrc');
      this.log('Please ensure your .rapidrc file contains config.supabase_url and config.supabase_anonkey');
      process.exit(1);
    }

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
        const interpolatedContent = templateContent
          .replace(/<%= supabaseUrl %>/g, supabaseUrl)
          .replace(/<%= supabaseAnonKey %>/g, supabaseAnonKey);
        fs.writeFileSync(devEnvPath, interpolatedContent);
        this.log('✓ Added environment.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/environments/environment.ts.erb'));
      const interpolatedContent = templateContent
        .replace(/<%= supabaseUrl %>/g, supabaseUrl)
        .replace(/<%= supabaseAnonKey %>/g, supabaseAnonKey);
      fs.writeFileSync(devEnvPath, interpolatedContent);
      this.log('✓ Added environment.ts');
    }

    // Handle environment.prod.ts - simply copy the template without substitutions
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
        fs.writeFileSync(prodEnvPath, templateContent);
        this.log('✓ Added environment.prod.ts');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('src/environments/environment.prod.ts.erb'));
      fs.writeFileSync(prodEnvPath, templateContent);
      this.log('✓ Added environment.prod.ts');
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
      if (angularJson?.projects?.[this.answers.projectName]?.architect) {
        const architect = angularJson.projects[this.answers.projectName].architect;
        
        // Update build configuration
        if (architect.build) {
          architect.build.options.outputPath = this.answers.outputPath;

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
        "preview": `npm run build && cd ${this.answers.outputPath}/browser && http-server --cors -o -c-1`,
        "build": "ng build --configuration production"
      };

      // Update dependencies
      packageJson.dependencies = {
        ...packageJson.dependencies,
        "@supabase/supabase-js": "^2.49.4",
        "uuid": "^11.1.0",
        "rxjs": "~7.8.0"
      };

      // Update devDependencies
      packageJson.devDependencies = {
        ...packageJson.devDependencies,
        "@types/uuid": "^10.0.0"
      };

      // Write the updated package.json back to file
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      this.log('✓ Updated package.json scripts');
    } catch (error) {
      this.log('Error updating package.json scripts:', error.message);
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
        const interpolatedContent = templateContent
          .replace(/<%= outputPath %>/g, this.answers.outputPath);
        fs.writeFileSync(dockerfilePath, interpolatedContent);
        this.log('✓ Added Dockerfile');
      }
    } else {
      const templateContent = this.fs.read(this.templatePath('Dockerfile.erb'));
      const interpolatedContent = templateContent
        .replace(/<%= outputPath %>/g, this.answers.outputPath);
      fs.writeFileSync(dockerfilePath, interpolatedContent);
      this.log('✓ Added Dockerfile');
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
      .replace(/<%= appName %>/g, this.answers.appName)
      .replace(/<%= outputPath %>/g, this.answers.outputPath);
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

  async _setupAuthPages(projectPath) {
    const authPagesDir = path.join(projectPath, 'src', 'app', 'pages', 'auth');
    const templateAuthPagesDir = path.join(this.templatePath(), 'src', 'app', 'pages', 'auth');

    // Create auth pages directory if it doesn't exist
    if (!fs.existsSync(authPagesDir)) {
      fs.mkdirSync(authPagesDir, { recursive: true });
    }

    // Function to copy a file and remove .erb extension
    const copyFile = async (sourcePath, destPath) => {
      const content = this.fs.read(sourcePath);
      fs.writeFileSync(destPath, content);
    };

    // Function to process a directory recursively
    const processDirectory = async (sourceDir, destDir) => {
      const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

      for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const destPath = path.join(destDir, entry.name.replace('.erb', ''));

        if (entry.isDirectory()) {
          // Create directory if it doesn't exist
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          await processDirectory(sourcePath, destPath);
        } else {
          // Copy file and remove .erb extension
          await copyFile(sourcePath, destPath);
        }
      }
    };

    try {
      // Process all auth pages
      await processDirectory(templateAuthPagesDir, authPagesDir);
      this.log('✓ Added auth pages');
    } catch (error) {
      this.log.error('Error setting up auth pages:', error.message);
      throw error;
    }
  }

  async _setupDashboardPage(projectPath) {
    const dashboardDir = path.join(projectPath, 'src', 'app', 'pages', 'dashboard');
    const templateDashboardDir = path.join(this.templatePath(), 'src', 'app', 'pages', 'dashboard');

    // Create dashboard directory if it doesn't exist
    if (!fs.existsSync(dashboardDir)) {
      fs.mkdirSync(dashboardDir, { recursive: true });
    }

    // Function to copy a file and remove .erb extension
    const copyFile = async (sourcePath, destPath) => {
      const content = this.fs.read(sourcePath);
      fs.writeFileSync(destPath, content);
    };

    try {
      // Copy all dashboard page files
      const files = fs.readdirSync(templateDashboardDir);
      for (const file of files) {
        const sourcePath = path.join(templateDashboardDir, file);
        const destPath = path.join(dashboardDir, file.replace('.erb', ''));
        await copyFile(sourcePath, destPath);
      }
      this.log('✓ Added dashboard page');
    } catch (error) {
      this.log.error('Error setting up dashboard page:', error.message);
      throw error;
    }
  }

  async _setupHeaderComponent(projectPath) {
    const headerDir = path.join(projectPath, 'src', 'app', 'components', 'header');
    const templateHeaderDir = path.join(this.templatePath(), 'src', 'app', 'components', 'header');

    // Create header directory if it doesn't exist
    if (!fs.existsSync(headerDir)) {
      fs.mkdirSync(headerDir, { recursive: true });
    }

    // Function to copy a file and remove .erb extension
    const copyFile = async (sourcePath, destPath) => {
      const content = this.fs.read(sourcePath);
      fs.writeFileSync(destPath, content);
    };

    try {
      // Copy all header component files
      const files = fs.readdirSync(templateHeaderDir);
      for (const file of files) {
        const sourcePath = path.join(templateHeaderDir, file);
        const destPath = path.join(headerDir, file.replace('.erb', ''));
        await copyFile(sourcePath, destPath);
      }
      this.log('✓ Added header component');
    } catch (error) {
      this.log.error('Error setting up header component:', error.message);
      throw error;
    }
  }

  async _setupAppComponent(projectPath) {
    const appComponentPath = path.join(projectPath, 'src', 'app', 'app.component.html');
    
    if (fs.existsSync(appComponentPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'app.component.html already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping app.component.html setup.');
        return;
      }
    }

    try {
      const templateContent = this.fs.read(this.templatePath('src/app/app.component.html.erb'));
      fs.writeFileSync(appComponentPath, templateContent);
      this.log('✓ Updated app.component.html');
    } catch (error) {
      this.log.error('Error updating app.component.html:', error.message);
      throw error;
    }
  }

  async _setupAppConfig(projectPath) {
    const appConfigPath = path.join(projectPath, 'src', 'app', 'app.config.ts');
    
    if (fs.existsSync(appConfigPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'app.config.ts already exists. Do you want to overwrite it?',
        default: true
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping app.config.ts setup.');
        return;
      }
    }

    try {
      const templateContent = this.fs.read(this.templatePath('src/app/app.config.ts.erb'));
      fs.writeFileSync(appConfigPath, templateContent);
      this.log('✓ Updated app.config.ts');
    } catch (error) {
      this.log.error('Error updating app.config.ts:', error.message);
      throw error;
    }
  }

  _printSummary(installPath, projectName, projectExists) {
    this.log(`\nProject created in ${installPath}`);
    this.log('\nNext Steps:');
    this.log('1. cd into your project directory:');
    this.log(`   cd ${projectName}`);
    this.log('2. Start the development server:');
    this.log('   ng serve');
  }

  _debugLog(message) {
    if (this.options.debug) {
      this.log(`[DEBUG] ${message}`);
    }
  }
}; 
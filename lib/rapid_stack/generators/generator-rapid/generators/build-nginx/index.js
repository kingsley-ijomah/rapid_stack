const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const { validateProjectConfig, handlePrompt } = require('../../lib/utils');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add debug option
    this.option('debug', {
      desc: 'Enable debug mode',
      type: Boolean,
      default: false
    });

    // Track modified files
    this.modifiedFiles = [];

    // Initialize prompting flag
    this._isPromptingComplete = false;
  }

  async initializing() {
    // Get current directory name (parent directory)
    const currentDir = path.basename(process.cwd());
    
    // Validate configuration and store it for later use
    this.projectConfig = validateProjectConfig(currentDir);
  }

  destinationPath(...paths) {
    // First call the parent's destinationPath to get the base path
    const basePath = super.destinationPath(...paths);
    
    // Only prepend project name if:
    // 1. We have answers (prompting phase is complete)
    // 2. We have a project name
    // 3. The path doesn't already include the project name
    // 4. We're not in the initial setup phase
    if (this.answers?.projectName && 
        !basePath.includes(this.answers.projectName) && 
        this._isPromptingComplete) {
      // Prepend the project name to the path
      return path.join(process.cwd(), this.answers.projectName, ...paths);
    }
    
    return basePath;
  }

  async prompting() {
    // Set default project name to 'nginx'
    this.answers = {
      projectName: 'nginx'
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

  async _setupProjectDirectory() {
    const { projectName } = this.answers;
    const projectPath = path.join(process.cwd(), projectName);

    if (!fs.existsSync(projectPath)) {
      const { confirmCreate } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmCreate',
        message: `This will create a new nginx project in: ${projectPath}\nAre you sure you want to continue?`,
        default: false
      }]);

      if (!confirmCreate) {
        this.log('Installation cancelled.');
        process.exit(0);
      }

      fs.mkdirSync(projectPath, { recursive: true });
      this.log('✓ Created project directory');
    } else {
      this.log('Using existing project directory');
    }
  }

  async _setupDockerfile() {
    const { confirmDockerfile } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmDockerfile',
      message: 'Would you like to set up the Dockerfile?',
      default: true
    }]);

    if (confirmDockerfile) {
      this._copyTemplateFile('Dockerfile.erb', 'Dockerfile', {});
      this.log('✓ Dockerfile created');
    }
  }

  async _setupNginxConfig() {
    const { confirmNginxConfig } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmNginxConfig',
      message: 'Would you like to set up the nginx configuration?',
      default: true
    }]);

    if (confirmNginxConfig) {
      this._copyTemplateFile('nginx.conf.erb', 'nginx/nginx.conf', {});
      this.log('✓ Nginx configuration created');
    }
  }

  async _setupReadme() {
    const { confirmReadme } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmReadme',
      message: 'Would you like to set up the README?',
      default: true
    }]);

    if (confirmReadme) {
      this._copyTemplateFile('README.md.erb', 'README.md', {});
      this.log('✓ README created');
    }
  }

  _copyTemplateFile(templatePath, destinationPath, templateData) {
    try {
      // Get the full template path. It may return an array if multiple files match.
      const templateFullPath = this.templatePath(templatePath);
      // If it's an array, pick the first file.
      const src = Array.isArray(templateFullPath) ? templateFullPath[0] : templateFullPath;
      
      // Get the destination path within the project directory
      const destinationFullPath = this.destinationPath(destinationPath);
      
      // Ensure destination directory exists
      const destDir = path.dirname(destinationFullPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        this._debugLog(`Created directory: ${destDir}`);
      }
      
      // Copy the template file with provided context
      this.fs.copyTpl(src, destinationFullPath, templateData);
      
      // Force write to disk immediately
      this.fs.commit();
      
      this.modifiedFiles.push(destinationPath);
      this._debugLog(`Copied template ${templatePath} to ${destinationFullPath}`);
    } catch (error) {
      this.log(`Error copying template ${templatePath}: ${error.message}`);
      if (this.options.debug) {
        this.log('Stack trace:', error.stack);
      }
      throw error;
    }
  }

  async install() {
    const { projectName } = this.answers;
    const projectPath = path.join(process.cwd(), projectName);

    try {
      // Set up project directory
      await this._setupProjectDirectory();

      // Set up Dockerfile
      await this._setupDockerfile();

      // Set up nginx configuration
      await this._setupNginxConfig();

      // Set up README
      await this._setupReadme();

      this._printSummary(projectPath, projectName);
    } catch (error) {
      this.log('Error during installation:', error.message);
      if (this.options.debug) {
        this.log('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  }

  _printSummary(installPath, projectName) {
    this.log('\n=== Installation Summary ===');
    this.log('\nProject Setup:');
    this.log(`✓ Created new nginx project: ${projectName}`);
    this.log(`✓ Location: ${installPath}`);
    
    this.log('\nKey Features Installed:');
    this.log('✓ Dockerfile for containerization');
    this.log('✓ Nginx configuration with environment variable support');
    this.log('✓ Health check endpoint');
    this.log('✓ Security headers configuration');

    this.log('\nNext Steps:');
    this.log('1. cd into your project directory:');
    this.log(`   cd ${projectName}`);
    this.log('2. Build the Docker image:');
    this.log(`   docker build -t ${projectName} .`);
    this.log('3. Run the container:');
    this.log(`   docker run -p 80:80 ${projectName}`);
    
    this.log('\nEnvironment Variables:');
    this.log('• DOMAINS: Comma-separated list of domains');
    this.log('• APP_NAME: Your application name');
    this.log('• FRONTEND_BUCKET_NAME: Your frontend bucket name');
    this.log('• SPACES_REGION: Your DigitalOcean Spaces region');
  }

  _debugLog(message) {
    if (this.options.debug) {
      this.log(`[DEBUG] ${message}`);
    }
  }
}; 
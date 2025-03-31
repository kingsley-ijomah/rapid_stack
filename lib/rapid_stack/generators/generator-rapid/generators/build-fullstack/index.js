const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add debug option
    this.option('debug', {
      desc: 'Enable debug mode',
      type: Boolean,
      default: false
    });
  }

  async prompting() {
    // Set default project names
    this.answers = {
      frontendName: 'frontend',
      backendName: 'backend'
    };

    // Ask about frontend scaffolding
    const frontendAnswer = await this.prompt([{
      type: 'confirm',
      name: 'buildFrontend',
      message: 'Would you like to build the frontend scaffold?',
      default: true
    }]);

    // Store the frontend answer
    this.answers = {
      ...this.answers,
      buildFrontend: frontendAnswer.buildFrontend
    };

    // Set flag indicating prompting is complete
    this._isPromptingComplete = true;
  }

  checkPrerequisites() {
    // Check for Node.js and npm
    try {
      execSync('node -v');
      execSync('npm -v');
    } catch (error) {
      this.log.error('Node.js and npm are required but not installed.');
      process.exit(1);
    }

    // Check for Ruby and Rails
    try {
      execSync('ruby -v');
      // Get Rails version and store it
      const railsVersionOutput = execSync('rails -v').toString();
      this.railsVersion = railsVersionOutput.match(/Rails\s+([\d.]+)/)[1];
      this.log(`Using Rails version: ${this.railsVersion}`);
    } catch (error) {
      this.log.error('Ruby and Rails are required but not installed.');
      process.exit(1);
    }

    // Check for Ionic CLI
    try {
      execSync('ionic -v');
    } catch (error) {
      this.log.error('Ionic CLI is required but not installed. Please install it with: npm install -g @ionic/cli');
      process.exit(1);
    }
  }

  async install() {
    const { frontendName, backendName, buildFrontend } = this.answers;
    const frontendPath = path.join(process.cwd(), frontendName);
    const backendPath = path.join(process.cwd(), backendName);

    // Create frontend application if requested
    if (buildFrontend) {
      this.log('\nCreating frontend application...');
      try {
        // Remove existing frontend directory if it exists
        if (fs.existsSync(frontendPath)) {
          this.log('Removing existing frontend directory...');
          fs.rmSync(frontendPath, { recursive: true, force: true });
        }
        
        // Change to parent directory
        const parentDir = path.dirname(frontendPath);
        process.chdir(parentDir);
        
        // Initialize Ionic Angular app
        execSync(`ionic start ${frontendName} blank --type=angular --capacitor --no-git --no-deps`, { stdio: 'inherit' });
        this.log('✓ Created new Ionic Angular application');
        
        // Change to frontend directory
        process.chdir(frontendPath);
        
        // Install dependencies with legacy peer deps flag
        this.log('Installing dependencies...');
        execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
        
        // Wait a moment to ensure frontend setup is complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // After frontend is complete, ask about backend
        const backendAnswer = await this.prompt([{
          type: 'confirm',
          name: 'buildBackend',
          message: 'Would you like to build the backend scaffold?',
          default: true
        }]);

        // Store the backend answer
        this.answers = {
          ...this.answers,
          buildBackend: backendAnswer.buildBackend
        };

        // Create backend if requested
        if (backendAnswer.buildBackend) {
          this.log('\nCreating backend application...');
          try {
            // Remove existing backend directory if it exists
            if (fs.existsSync(backendPath)) {
              this.log('Removing existing backend directory...');
              fs.rmSync(backendPath, { recursive: true, force: true });
            }
            
            // Create new Rails API application
            const command = [
              `rails _${this.railsVersion}_ new ${backendName}`,
              '--api',
              '--skip-active-record',
              '--skip-test',
              '--skip-system-test',
              '--skip-bundle'
            ].join(' ');

            execSync(command, { stdio: 'inherit' });
            this.log('✓ Created new Rails API application');
          } catch (error) {
            this.log.error('Failed to create backend application:', error.message);
            process.exit(1);
          }
        } else {
          this.log('\nSkipping backend creation as requested.');
        }
      } catch (error) {
        this.log.error('Failed to create frontend application:', error.message);
        process.exit(1);
      }
    } else {
      this.log('\nSkipping frontend creation as requested.');
    }

    this._printSummary(frontendPath, backendPath, frontendName, backendName, buildFrontend, this.answers.buildBackend);
  }

  _printSummary(frontendPath, backendPath, frontendName, backendName, buildFrontend, buildBackend) {
    this.log('\n✨ Fullstack application setup completed!');
    
    if (buildFrontend) {
      this.log('\nFrontend:');
      this.log(`  Directory: ${frontendPath}`);
      this.log('  To start the frontend:');
      this.log(`    cd ${frontendName}`);
      this.log('    npm install --legacy-peer-deps');
      this.log('    ionic serve');
    }
    
    if (buildBackend) {
      this.log('\nBackend:');
      this.log(`  Directory: ${backendPath}`);
      this.log('  To start the backend:');
      this.log(`    cd ${backendName}`);
      this.log('    bundle install');
      this.log('    rails db:create');
      this.log('    rails server');
    }
  }

  _debugLog(message) {
    if (this.options.debug) {
      this.log(message);
    }
  }
}; 
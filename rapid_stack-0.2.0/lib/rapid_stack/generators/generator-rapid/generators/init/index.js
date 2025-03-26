const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
  }

  async prompting() {
    let fullPath;
    let confirmed = false;

    while (!confirmed) {
      // First try with home directory
      if (!fullPath) {
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        
        const dirAnswer = await this.prompt([
          {
            type: 'input',
            name: 'parent_dir',
            message: 'Enter the parent folder directory name (relative to home directory):',
            default: 'rapid-example',
            validate: (input) => {
              if (!input) return 'Directory name cannot be empty';
              return true;
            }
          }
        ]);

        fullPath = path.join(homeDir, dirAnswer.parent_dir);
      }

      // Confirm the location
      const confirmAnswer = await this.prompt([
        {
          type: 'confirm',
          name: 'confirmLocation',
          message: `Are you happy to create the parent directory at: ${fullPath}?`,
          default: true
        }
      ]);

      if (!confirmAnswer.confirmLocation) {
        // If user says no, ask for full path
        const pathAnswer = await this.prompt([
          {
            type: 'input',
            name: 'fullPath',
            message: 'Enter the complete path where you want to create the directory:',
            validate: (input) => {
              if (!input) return 'Path cannot be empty';
              return true;
            }
          }
        ]);
        fullPath = pathAnswer.fullPath;
      } else {
        confirmed = true;
      }
    }

    // Prompt for app name
    const appAnswer = await this.prompt([
      {
        type: 'input',
        name: 'app_name',
        message: 'Enter your application name:',
        validate: (input) => {
          if (!input) return 'Application name cannot be empty';
          // Only allow lowercase letters, numbers, and hyphens
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Application name can only contain lowercase letters, numbers, and hyphens';
          }
          return true;
        }
      }
    ]);

    // Create project directory if it doesn't exist
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      this.log(`Created directory: ${fullPath}`);
    }

    // Change into the project directory
    process.chdir(fullPath);
    this.log(`Changed to directory: ${fullPath}`);

    // Check if config file already exists
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const rapidStackDir = path.join(homeDir, '.rapid_stack');
    const folderName = path.basename(fullPath);
    const configPath = path.join(rapidStackDir, `${folderName}_project.yml`);

    if (fs.existsSync(configPath)) {
      const confirmOverwrite = await this.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Configuration file already exists. Do you want to proceed with the existing configuration?',
          default: true
        }
      ]);

      if (confirmOverwrite.overwrite) {
        // Skip file creation and show next steps
        console.clear();
        console.log('\n' + '='.repeat(80));
        console.log('✨ Using existing configuration!');
        console.log('='.repeat(80));
        
        console.log('\n📁 Project Directory:');
        console.log(`   ${fullPath}`);
        
        console.log('\n📋 Next Steps:');
        console.log('1. Change to your project directory:');
        console.log(`   cd ${fullPath}`);
        console.log('\n2. Build your backend application:');
        console.log('   yo rapid:build-backend');
        
        console.log('\n' + '='.repeat(80) + '\n');
        process.exit(0);
      }
    }

    // Store all answers
    this.answers = { 
      fullPath,
      app_name: appAnswer.app_name
    };
  }

  writing() {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const rapidStackDir = path.join(homeDir, '.rapid_stack');
    
    // Create .rapid_stack directory if it doesn't exist
    if (!fs.existsSync(rapidStackDir)) {
      fs.mkdirSync(rapidStackDir, { recursive: true });
      this.log(`Created .rapid_stack directory: ${rapidStackDir}`);
    }

    // Create project directory if it doesn't exist
    if (!fs.existsSync(this.answers.fullPath)) {
      fs.mkdirSync(this.answers.fullPath, { recursive: true });
      this.log(`Created directory: ${this.answers.fullPath}`);
    }

    // Change to the directory
    process.chdir(this.answers.fullPath);
    this.log(`Changed to directory: ${this.answers.fullPath}`);

    const folderName = path.basename(this.answers.fullPath);
    const configPath = path.join(rapidStackDir, `${folderName}_project.yml`);

    // Use Yeoman's templating system
    this.fs.copyTpl(
      this.templatePath('project.yml'),
      this.destinationPath(configPath),
      {
        app_name: this.answers.app_name
      }
    );

    // Show success message
    console.clear();
    console.log('\n' + '='.repeat(80));
    console.log('✨ Project initialized successfully!');
    console.log('='.repeat(80));
    
    console.log('\n📁 Project Directory:');
    console.log(`   ${this.answers.fullPath}`);
    
    console.log('\n📝 Configuration File Location:');
    console.log(`   ${configPath}`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Open the configuration file in your preferred text editor');
    console.log('2. Fill in all the required details in the configuration file');
    console.log('3. Save the file after making your changes');
    console.log('4. Run terraform setup when you\'re ready to proceed');
    
    console.log('\n' + '='.repeat(80));
    console.log('Next steps to build your application:');
    console.log(`1. Run: cd ${this.answers.fullPath}`);
    console.log('2. Then, build your backend: rapid build:backend');
    console.log('='.repeat(80) + '\n');
  }
};
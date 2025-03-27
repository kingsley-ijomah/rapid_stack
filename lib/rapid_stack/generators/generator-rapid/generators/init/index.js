const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const VersionChecker = require('./lib/version-checker');
const GitInstaller = require('./lib/git-installer');
const GitHubCliInstaller = require('./lib/github-cli-installer');
const PackageManager = require('./lib/package-manager');
const yaml = require('js-yaml');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.versionChecker = new VersionChecker();
    this.gitInstaller = new GitInstaller();
    this.githubCliInstaller = new GitHubCliInstaller();
    this.packageManager = new PackageManager();
  }

  async prompting() {
    // Check if running on a Unix-like system
    if (process.platform === 'win32') {
      console.log('\n❌ Error: This tool requires a Unix-like operating system (macOS, Linux, or WSL)');
      console.log('\nTo use this tool on Windows, you have two options:');
      console.log('1. Use Windows Subsystem for Linux (WSL)');
      console.log('   - Install WSL from: https://docs.microsoft.com/en-us/windows/wsl/install');
      console.log('   - Run this tool from within WSL');
      console.log('\n2. Use a virtual machine');
      console.log('   - Install VirtualBox or VMware');
      console.log('   - Create a virtual machine with Ubuntu or macOS');
      console.log('   - Run this tool from within the virtual machine');
      
      const { retry } = await this.prompt([
        {
          type: 'confirm',
          name: 'retry',
          message: 'Would you like to try again after setting up a Unix-like environment?',
          default: true
        }
      ]);

      if (!retry) {
        process.exit(1);
      }
      return;
    }

    // Check for GitHub account
    let hasGitHubAccount = false;
    while (!hasGitHubAccount) {
      const { hasAccount } = await this.prompt([
        {
          type: 'confirm',
          name: 'hasAccount',
          message: 'Do you have a GitHub account?',
          default: true
        }
      ]);

      if (!hasAccount) {
        console.log('\n⚠️ A GitHub account is required to use this tool.');
        console.log('\nPlease create a GitHub account:');
        console.log('1. Visit https://github.com/signup');
        console.log('2. Follow the signup process');
        console.log('3. Return here to continue');
        
        const { retry } = await this.prompt([
          {
            type: 'confirm',
            name: 'retry',
            message: 'Would you like to try again after creating a GitHub account?',
            default: true
          }
        ]);

        if (!retry) {
          process.exit(1);
        }
      } else {
        hasGitHubAccount = true;
      }
    }

    // Display version comparison
    this.versionChecker.displayVersionComparison();

    // Check and update Git if needed
    const gitVersion = this.gitInstaller.getCurrentVersion();
    if (!gitVersion || !this.versionChecker.compareVersions(gitVersion, this.versionChecker.minVersions.git)) {
      console.log('\n⚠️ Git version check failed');
      const { updateGit } = await this.prompt([
        {
          type: 'confirm',
          name: 'updateGit',
          message: 'Would you like to update Git?',
          default: true
        }
      ]);

      if (updateGit) {
        const result = await this.gitInstaller.update();
        if (!result.success) {
          console.log('\n⚠️ Git update failed:', result.error);
          if (result.needsManualUpdate) {
            console.log('Please update Git manually from https://git-scm.com/downloads');
          }
          process.exit(1);
        }
      } else {
        console.log('\n⚠️ Git update skipped. Please update Git manually from https://git-scm.com/downloads');
        process.exit(1);
      }
    }

    // Check and update GitHub CLI if needed
    const ghVersion = this.githubCliInstaller.getCurrentVersion();
    if (!ghVersion) {
      console.log('\n⚠️ GitHub CLI is not installed');
      const { installGh } = await this.prompt([
        {
          type: 'confirm',
          name: 'installGh',
          message: 'Would you like to install GitHub CLI?',
          default: true
        }
      ]);

      if (installGh) {
        const result = await this.githubCliInstaller.install();
        if (!result.success) {
          console.log('\n⚠️ GitHub CLI installation failed:', result.error);
          console.log('Please install GitHub CLI manually from https://cli.github.com/');
          process.exit(1);
        }
      } else {
        console.log('\n⚠️ GitHub CLI installation skipped. Please install GitHub CLI manually from https://cli.github.com/');
        process.exit(1);
      }
    } else if (!this.versionChecker.compareVersions(ghVersion, this.versionChecker.minVersions.gh)) {
      console.log('\n⚠️ GitHub CLI version check failed');
      const { updateGh } = await this.prompt([
        {
          type: 'confirm',
          name: 'updateGh',
          message: 'Would you like to update GitHub CLI?',
          default: true
        }
      ]);

      if (updateGh) {
        const result = await this.githubCliInstaller.update();
        if (!result.success) {
          console.log('\n⚠️ GitHub CLI update failed:', result.error);
          if (result.needsManualUpdate) {
            console.log('Please update GitHub CLI manually from https://cli.github.com/');
          }
          process.exit(1);
        }
      } else {
        console.log('\n⚠️ GitHub CLI update skipped. Please update GitHub CLI manually from https://cli.github.com/');
        process.exit(1);
      }
    }

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

    // Store all answers
    this.answers = { 
      fullPath,
      app_name: appAnswer.app_name,
      configPath,
      usingExistingConfig: fs.existsSync(configPath)
    };
  }

  async writing() {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const rapidStackDir = path.join(homeDir, '.rapid_stack');
    
    // Create .rapid_stack directory if it doesn't exist
    if (!fs.existsSync(rapidStackDir)) {
      fs.mkdirSync(rapidStackDir, { recursive: true });
      this.log(`Created .rapid_stack directory: ${rapidStackDir}`);
    }

    // Display version comparison
    const issues = this.versionChecker.displayVersionComparison();

    // If there are issues, ask if user wants help installing
    const hasIssues = issues.missing.length > 0 || issues.outdated.length > 0;
    if (hasIssues) {
      const answers = await this.prompt([
        {
          type: 'confirm',
          name: 'installMissing',
          message: 'Would you like me to help you install missing or outdated tools?',
          default: true
        }
      ]);

      if (answers.installMissing) {
        // Handle Git updates first
        const gitVersion = this.versionChecker.getCommandVersion('git');
        const minGitVersion = this.versionChecker.minVersions.git;
        
        if (gitVersion === 'N/A') {
          this.log('\n❌ Git is not installed. Please install Git first.');
        } else if (!this.versionChecker.compareVersions(gitVersion, minGitVersion)) {
          this.log(`\n⚠️ Git version ${gitVersion} is outdated. Minimum required version is ${minGitVersion}`);
          const gitUpdateResult = await this.gitInstaller.update();
          if (!gitUpdateResult.success) {
            this.log('\n⚠️ Failed to update Git. Please update it manually.');
          }
        }
      }
    }

    // If using existing config, show appropriate message
    if (this.answers.usingExistingConfig) {
      console.log('\n' + '='.repeat(80));
      console.log('✨ Using existing configuration!');
      console.log('='.repeat(80));
      
      console.log('\n📁 Project Directory:');
      console.log(`   ${this.answers.fullPath}`);
      
      console.log('\n📋 Next Steps:');
      console.log('1. Change to your project directory:');
      console.log(`   cd ${this.answers.fullPath}`);
      console.log('\n2. Build your backend application:');
      console.log('   yo rapid:build-backend');
      
      console.log('\n' + '='.repeat(80) + '\n');
      return;
    }

    // Create project directory if it doesn't exist
    if (!fs.existsSync(this.answers.fullPath)) {
      fs.mkdirSync(this.answers.fullPath, { recursive: true });
      this.log(`Created directory: ${this.answers.fullPath}`);
    }

    // Change to the directory
    process.chdir(this.answers.fullPath);
    this.log(`Changed to directory: ${this.answers.fullPath}`);

    // Use Yeoman's templating system
    this.fs.copyTpl(
      this.templatePath('project.yml'),
      this.destinationPath(this.answers.configPath),
      {
        app_name: this.answers.app_name
      }
    );

    // Show success message
    console.log('\n' + '='.repeat(80));
    console.log('✨ Project initialized successfully!');
    console.log('='.repeat(80));
    
    console.log('\n📁 Project Directory:');
    console.log(`   ${this.answers.fullPath}`);
    
    console.log('\n📝 Configuration File Location:');
    console.log(`   ${this.answers.configPath}`);
    
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
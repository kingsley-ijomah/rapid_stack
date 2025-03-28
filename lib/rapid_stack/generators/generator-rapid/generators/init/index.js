const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const VersionChecker = require('./lib/version-checker');
const PackageManagerFactory = require('./lib/package-manager-factory');
const packages = require('./lib/packages');
const ShellManager = require('./lib/shell-manager');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.versionChecker = new VersionChecker();
    this.shellManager = new ShellManager();
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

    // Display version comparison and handle package installation
    let issues;
    let installComplete = false;
    
    while (!installComplete) {
      issues = this.versionChecker.displayVersionComparison();
      const hasIssues = issues.missing.length > 0 || issues.outdated.length > 0;
      
      if (!hasIssues) {
        installComplete = true;
        break;
      }

      const answers = await this.prompt([
        {
          type: 'confirm',
          name: 'installMissing',
          message: 'Would you like me to help you install missing or outdated tools?',
          default: true
        }
      ]);

      if (!answers.installMissing) {
        installComplete = true;
        break;
      }

      // Handle missing or outdated tools
      for (const tool of [...issues.missing, ...issues.outdated]) {
        const packageInfo = packages[tool];
        if (!packageInfo) continue;

        try {
          const manager = PackageManagerFactory.getManager(packageInfo);
          
          // For missing packages, show available versions
          if (issues.missing.includes(tool)) {
            const versions = await manager.listAvailableVersions(packageInfo.name);
            if (versions.success && versions.versions.length > 0) {
              const { action } = await this.prompt([
                {
                  type: 'list',
                  name: 'action',
                  message: `How would you like to install ${tool}?`,
                  choices: [
                    { name: 'Install latest version', value: 'latest' },
                    { name: 'Skip installation', value: 'skip' }
                  ],
                  default: 'latest'
                }
              ]);

              if (action === 'skip') continue;

              // Show installation progress
              this.log(`\nInstalling ${tool}...`);
              const result = await manager.install(packageInfo.name);
              
              if (result) {
                this.log(`✅ Successfully installed ${tool}`);
                
                // If this is a Homebrew package, ensure Homebrew paths are configured
                if (packageInfo.packageManager.darwin === 'brew') {
                  await this.shellManager.addHomebrewPaths();
                  await this.shellManager.reloadConfig();
                }
              } else {
                this.log(`❌ Failed to install ${tool}`);
              }
            }
          } else {
            // For outdated packages, show upgrade options
            const { action } = await this.prompt([
              {
                type: 'list',
                name: 'action',
                message: `How would you like to upgrade ${tool}?`,
                choices: [
                  { name: 'Upgrade to latest version', value: 'latest' },
                  { name: 'Skip upgrade', value: 'skip' }
                ],
                default: 'latest'
              }
            ]);

            if (action === 'skip') continue;

            // Show installation progress for latest version
            this.log(`\nUpgrading ${tool} to latest version...`);
            const result = await manager.upgrade(packageInfo.name);
            
            if (result) {
              this.log(`✅ Successfully upgraded ${tool}`);
              
              // If this is a Homebrew package, ensure Homebrew paths are configured
              if (packageInfo.packageManager.darwin === 'brew') {
                await this.shellManager.addHomebrewPaths();
                await this.shellManager.reloadConfig();
              }
            } else {
              this.log(`❌ Failed to upgrade ${tool}`);
            }
          }
        } catch (error) {
          this.log(`\n❌ Error handling ${tool}: ${error.message}`);
        }
      }

      // Check if all issues are resolved
      issues = this.versionChecker.displayVersionComparison();
      if (issues.missing.length === 0 && issues.outdated.length === 0) {
        installComplete = true;
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
        // Handle missing or outdated tools
        for (const tool of [...issues.missing, ...issues.outdated]) {
          const packageInfo = packages[tool];
          if (!packageInfo) continue;

          try {
            const manager = PackageManagerFactory.getManager(packageInfo);
            
            // For missing packages, show available versions
            if (issues.missing.includes(tool)) {
              const versions = await manager.listAvailableVersions(packageInfo.name);
              if (versions.success && versions.versions.length > 0) {
                const { action } = await this.prompt([
                  {
                    type: 'list',
                    name: 'action',
                    message: `How would you like to install ${tool}?`,
                    choices: [
                      { name: 'Install latest version', value: 'latest' },
                      { name: 'Skip installation', value: 'skip' }
                    ],
                    default: 'latest'
                  }
                ]);

                if (action === 'skip') continue;

                // Show installation progress
                this.log(`\nInstalling ${tool}...`);
                const result = await manager.install(packageInfo.name);
                
                if (result) {
                  this.log(`✅ Successfully installed ${tool}`);
                  
                  // If this is a Homebrew package, ensure Homebrew paths are configured
                  if (packageInfo.packageManager.darwin === 'brew') {
                    await this.shellManager.addHomebrewPaths();
                    await this.shellManager.reloadConfig();
                  }
                } else {
                  this.log(`❌ Failed to install ${tool}`);
                }
              }
            } else {
              // For outdated packages, show upgrade options
              const { action } = await this.prompt([
                {
                  type: 'list',
                  name: 'action',
                  message: `How would you like to upgrade ${tool}?`,
                  choices: [
                    { name: 'Upgrade to latest version', value: 'latest' },
                    { name: 'Skip upgrade', value: 'skip' }
                  ],
                  default: 'latest'
                }
              ]);

              if (action === 'skip') continue;

              // Show installation progress for latest version
              this.log(`\nUpgrading ${tool} to latest version...`);
              const result = await manager.upgrade(packageInfo.name);
              
              if (result) {
                this.log(`✅ Successfully upgraded ${tool}`);
                
                // If this is a Homebrew package, ensure Homebrew paths are configured
                if (packageInfo.packageManager.darwin === 'brew') {
                  await this.shellManager.addHomebrewPaths();
                  await this.shellManager.reloadConfig();
                }
              } else {
                this.log(`❌ Failed to upgrade ${tool}`);
              }
            }
          } catch (error) {
            this.log(`\n❌ Error handling ${tool}: ${error.message}`);
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
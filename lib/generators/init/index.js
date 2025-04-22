const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const VersionChecker = require('./lib/version-checker');
const PackageManagerFactory = require('./lib/package-managers');
const packages = require('./lib/packages');
const ShellManager = require('./lib/shell-manager');
const { execSync } = require('child_process');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.versionChecker = new VersionChecker();
    this.shellManager = new ShellManager();
  }

  async installPackageManager(managerType) {
    try {
      this.log(`\nInstalling ${managerType}...`);
      switch (managerType) {
        case 'brew':
          execSync('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"', { stdio: 'inherit' });
          // Add Homebrew to shell config
          await this.shellManager.addHomebrewPaths();
          await this.shellManager.reloadConfig();
          break;
        case 'nix':
          execSync('sh <(curl -L https://nixos.org/nix/install)', { stdio: 'inherit' });
          // Add Nix to shell config
          await this.shellManager.addNixPaths();
          await this.shellManager.reloadConfig();
          break;
        case 'asdf':
          // First check if we have the required package manager for the platform
          const platform = process.platform;
          if (platform !== 'darwin' && platform !== 'linux') {
            this.log(`❌ ASDF is not supported on ${platform}`);
            return false;
          }
          
          const requiredManager = platform === 'darwin' ? 'brew' : 'nix';
          
          // Check if the required manager is installed
          const manager = PackageManagerFactory.getManager({ packageManager: { [platform]: requiredManager } });
          const isRequiredManagerInstalled = await manager.isManagerInstalled();
          
          if (!isRequiredManagerInstalled) {
            this.log(`❌ ASDF requires ${requiredManager} to be installed first`);
            
            const { installRequiredManager } = await this.prompt([
              {
                type: 'confirm',
                name: 'installRequiredManager',
                message: `Would you like me to install ${requiredManager} first?`,
                default: true
              }
            ]);

            if (installRequiredManager) {
              const success = await this.installPackageManager(requiredManager);
              if (!success) {
                this.log(`Please install ${requiredManager} manually and try again.`);
                return false;
              }
            } else {
              this.log(`Please install ${requiredManager} first and try again.`);
              return false;
            }
          }

          // Now install ASDF using the appropriate package manager
          if (platform === 'darwin') {
            execSync('brew install asdf', { stdio: 'inherit' });
            // Add ASDF paths and completions
            await this.shellManager.addASDFPaths();
            await this.shellManager.addASDFCompletions();
            await this.shellManager.reloadConfig();
          } else {
            execSync('nix-env -iA nixpkgs.asdf-vm', { stdio: 'inherit' });
            // Add ASDF paths and completions
            await this.shellManager.addASDFPaths();
            await this.shellManager.addASDFCompletions();
            await this.shellManager.reloadConfig();
          }
          break;
      }
      this.log(`✅ Successfully installed ${managerType}`);
      return true;
    } catch (error) {
      this.log(`❌ Failed to install ${managerType}: ${error.message}`);
      return false;
    }
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
          
          // Check if the package manager is installed
          const isManagerInstalled = await manager.isManagerInstalled();
          if (!isManagerInstalled) {
            this.log(`❌ Required package manager (${packageInfo.packageManager[process.platform]}) is not installed`);
            
            const { installManager } = await this.prompt([
              {
                type: 'confirm',
                name: 'installManager',
                message: `Would you like me to install ${packageInfo.packageManager[process.platform]}?`,
                default: true
              }
            ]);

            if (installManager) {
              const success = await this.installPackageManager(packageInfo.packageManager[process.platform]);
              if (!success) {
                this.log('Please install the package manager manually and try again.');
                continue;
              }
            } else {
              this.log('Please install the required package manager first:');
              switch (packageInfo.packageManager[process.platform]) {
                case 'brew':
                  this.log('  - Install Homebrew: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
                  break;
                case 'nix':
                  this.log('  - Install Nix: sh <(curl -L https://nixos.org/nix/install)');
                  break;
                case 'asdf':
                  this.log('  - Install ASDF: git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.13.1');
                  break;
              }
              continue;
            }
          }
          
          // For missing packages, show available versions
          if (issues.missing.includes(tool)) {
            const platform = process.platform;
            const managerType = packageInfo.packageManager[platform];
            const packageName = packageInfo.name[managerType];

            const versions = await manager.listAvailableVersions(packageName, {
              taps: packageInfo.taps,
              startService: packageInfo.startService
            });
            this.log(`Found ${versions.success ? versions.versions.length : 0} versions`);
            
            if (versions.success && versions.versions.length > 0) {
              this.log(`\n📦 Available versions for ${packageName}:`);
              versions.versions.forEach(version => this.log(`  - ${version}`));
              
              const { action } = await this.prompt([
                {
                  type: 'list',
                  name: 'action',
                  message: `How would you like to install ${packageName}?`,
                  choices: [
                    { name: 'Install latest version', value: 'latest' },
                    { name: 'Skip installation', value: 'skip' }
                  ],
                  default: 'latest'
                }
              ]);

              if (action === 'skip') {
                this.log(`⏭️ Skipping installation of ${packageName}`);
                continue;
              }

              // Show installation progress
              this.log(`\n🚀 Starting installation of ${packageName}...`);
              try {
                const result = await manager.install(packageName, {
                  taps: packageInfo.taps,
                  startService: packageInfo.startService
                });
                
                if (result) {
                  this.log(`✅ Successfully installed ${packageName}`);
                  
                  // Configure package manager specific paths
                  const platform = process.platform;
                  this.log(`\n🔧 Configuring paths for ${packageInfo.packageManager[platform]}...`);
                  if (packageInfo.packageManager[platform] === 'brew') {
                    await this.shellManager.addHomebrewPaths();
                  } else if (packageInfo.packageManager[platform] === 'nix') {
                    await this.shellManager.addNixPaths();
                  } else if (packageInfo.packageManager[platform] === 'asdf') {
                    await this.shellManager.addASDFPaths();
                  }
                  await this.shellManager.reloadConfig();
                  this.log(`✅ Path configuration complete for ${packageName}`);
                } else {
                  this.log(`❌ Failed to install ${packageName}`);
                }
              } catch (error) {
                this.log(`❌ Error during installation of ${packageName}: ${error.message}`);
              }
            } else {
              this.log(`❌ No versions found for ${packageName}`);
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
            const platform = process.platform;
            const managerType = packageInfo.packageManager[platform];
            const packageName = packageInfo.name[managerType];
            const result = await manager.upgrade(packageName);
            
            if (result) {
              this.log(`✅ Successfully upgraded ${tool}`);
              
              // Configure package manager specific paths
              const platform = process.platform;
              if (packageInfo.packageManager[platform] === 'brew') {
                await this.shellManager.addHomebrewPaths();
              } else if (packageInfo.packageManager[platform] === 'nix') {
                await this.shellManager.addNixPaths();
              } else if (packageInfo.packageManager[platform] === 'asdf') {
                await this.shellManager.addASDFPaths();
              }
              await this.shellManager.reloadConfig();
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

    let confirmed = false;
    let fullPath = null;

    while (!confirmed) {
      // Get the current working directory as the base
      const currentDir = process.cwd();
      
      const dirAnswer = await this.prompt([
        {
          type: 'input',
          name: 'parent_dir',
          message: 'Enter project folder name or path to be created:',
          default: 'rapid-example',
          validate: (input) => {
            if (!input) return 'Directory name cannot be empty';
            return true;
          }
        }
      ]);

      // Handle both relative and absolute paths
      const inputPath = dirAnswer.parent_dir;
      if (path.isAbsolute(inputPath)) {
        fullPath = inputPath;
      } else {
        fullPath = path.join(currentDir, inputPath);
      }

      // Confirm the location
      const confirmAnswer = await this.prompt([
        {
          type: 'confirm',
          name: 'confirmLocation',
          message: `Are you happy to create the project at: ${fullPath}?`,
          default: true
        }
      ]);

      if (!confirmAnswer.confirmLocation) {
        // If user says no, ask for full path
        const pathAnswer = await this.prompt([
          {
            type: 'input',
            name: 'fullPath',
            message: 'Enter the complete path where you want to create the project:',
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

    // Get the project name from the folder name
    const projectName = path.basename(fullPath);

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
    const configPath = path.join(rapidStackDir, `config.yml`);

    // Store all answers
    this.answers = { 
      fullPath,
      app_name: projectName,
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

    // Create global config file if it doesn't exist
    const globalConfigPath = path.join(rapidStackDir, 'config.yml');
    if (!fs.existsSync(globalConfigPath)) {
      // Use Yeoman's templating system
      this.fs.copyTpl(
        this.templatePath('global_config.yml'),
        this.destinationPath(globalConfigPath),
        {
          app_name: this.answers.app_name
        }
      );
      this.log(`Created global config file: ${globalConfigPath}`);
    } else {
      this.log(`Using existing global config file: ${globalConfigPath}`);
    }

    // Create local config file (.rapidrc)
    const localConfigPath = path.join(this.answers.fullPath, '.rapidrc');
    this.fs.copyTpl(
      this.templatePath('local_config.yml'),
      this.destinationPath(localConfigPath),
      {
        app_name: this.answers.app_name
      }
    );
    this.log(`Created local config file: ${localConfigPath}`);

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
            
            // Check if the package manager is installed
            const isManagerInstalled = await manager.isManagerInstalled();
            if (!isManagerInstalled) {
              this.log(`❌ Required package manager (${packageInfo.packageManager[process.platform]}) is not installed`);
              
              const { installManager } = await this.prompt([
                {
                  type: 'confirm',
                  name: 'installManager',
                  message: `Would you like me to install ${packageInfo.packageManager[process.platform]}?`,
                  default: true
                }
              ]);

              if (installManager) {
                const success = await this.installPackageManager(packageInfo.packageManager[process.platform]);
                if (!success) {
                  this.log('Please install the package manager manually and try again.');
                  continue;
                }
              } else {
                this.log('Please install the required package manager first:');
                switch (packageInfo.packageManager[process.platform]) {
                  case 'brew':
                    this.log('  - Install Homebrew: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
                    break;
                  case 'nix':
                    this.log('  - Install Nix: sh <(curl -L https://nixos.org/nix/install)');
                    break;
                  case 'asdf':
                    this.log('  - Install ASDF: git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.13.1');
                    break;
                }
                continue;
              }
            }
            
            // For missing packages, show available versions
            if (issues.missing.includes(tool)) {
              this.log(`\n🔍 Checking available versions for ${packageInfo.name}...`);
              const platform = process.platform;
              const managerType = packageInfo.packageManager[platform];
              const packageName = packageInfo.name[managerType];

              const versions = await manager.listAvailableVersions(packageName, {
                taps: packageInfo.taps,
                startService: packageInfo.startService
              });
              this.log(`Found ${versions.success ? versions.versions.length : 0} versions`);
              
              if (versions.success && versions.versions.length > 0) {
                this.log(`\n📦 Available versions for ${packageName}:`);
                versions.versions.forEach(version => this.log(`  - ${version}`));
                
                const { action } = await this.prompt([
                  {
                    type: 'list',
                    name: 'action',
                    message: `How would you like to install ${packageName}?`,
                    choices: [
                      { name: 'Install latest version', value: 'latest' },
                      { name: 'Skip installation', value: 'skip' }
                    ],
                    default: 'latest'
                  }
                ]);

                if (action === 'skip') {
                  this.log(`⏭️ Skipping installation of ${packageName}`);
                  continue;
                }

                // Show installation progress
                this.log(`\n🚀 Starting installation of ${packageName}...`);
                try {
                  const result = await manager.install(packageName, {
                    taps: packageInfo.taps,
                    startService: packageInfo.startService
                  });
                  
                  if (result) {
                    this.log(`✅ Successfully installed ${packageName}`);
                    
                    // Configure package manager specific paths
                    const platform = process.platform;
                    this.log(`\n🔧 Configuring paths for ${packageInfo.packageManager[platform]}...`);
                    if (packageInfo.packageManager[platform] === 'brew') {
                      await this.shellManager.addHomebrewPaths();
                    } else if (packageInfo.packageManager[platform] === 'nix') {
                      await this.shellManager.addNixPaths();
                    } else if (packageInfo.packageManager[platform] === 'asdf') {
                      await this.shellManager.addASDFPaths();
                    }
                    await this.shellManager.reloadConfig();
                    this.log(`✅ Path configuration complete for ${packageName}`);
                  } else {
                    this.log(`❌ Failed to install ${packageName}`);
                  }
                } catch (error) {
                  this.log(`❌ Error during installation of ${packageName}: ${error.message}`);
                }
              } else {
                this.log(`❌ No versions found for ${packageName}`);
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
              const platform = process.platform;
              const managerType = packageInfo.packageManager[platform];
              const packageName = packageInfo.name[managerType];
              const result = await manager.upgrade(packageName);
              
              if (result) {
                this.log(`✅ Successfully upgraded ${tool}`);
                
                // Configure package manager specific paths
                const platform = process.platform;
                if (packageInfo.packageManager[platform] === 'brew') {
                  await this.shellManager.addHomebrewPaths();
                } else if (packageInfo.packageManager[platform] === 'nix') {
                  await this.shellManager.addNixPaths();
                } else if (packageInfo.packageManager[platform] === 'asdf') {
                  await this.shellManager.addASDFPaths();
                }
                await this.shellManager.reloadConfig();
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

    // Show success message
    console.log('\n' + '='.repeat(80));
    console.log('✨ Project initialized successfully!');
    console.log('='.repeat(80));
    
    console.log('\n📁 Project Directory:');
    console.log(`   ${this.answers.fullPath}`);
    
    console.log('\n📝 Global Configuration File Location:');
    console.log(`   ${globalConfigPath}`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Open the global configuration file in your preferred text editor');
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
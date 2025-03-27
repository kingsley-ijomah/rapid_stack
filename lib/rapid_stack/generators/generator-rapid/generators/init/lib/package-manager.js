const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');

class PackageManager {
  constructor() {
    this.isWindows = process.platform === 'win32';
    this.commands = {
      checkCommand: this.isWindows ? 'where' : 'which',
      packageManager: this.isWindows ? 'winget' : 'brew',
      // Package manager installation commands
      installPackageManager: this.isWindows ? 
        'powershell -Command "& {Invoke-WebRequest -Uri https://aka.ms/getwinget -OutFile winget.msi; Start-Process msiexec -ArgumentList \'/i\', \'winget.msi\', \'/quiet\', \'/norestart\' -Wait; Remove-Item winget.msi}"' :
        '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    };
    console.log(`\n📦 Package Manager: ${this.commands.packageManager} (${this.isWindows ? 'Windows' : 'Unix-like'})`);
  }

  // Check if a command exists
  commandExists(command) {
    try {
      console.log(`\n🔍 Checking if command exists: ${command}`);
      execSync(`${this.commands.checkCommand} ${command}`, { stdio: 'ignore' });
      console.log(`✅ Command exists: ${command}`);
      return true;
    } catch (e) {
      console.log(`❌ Command not found: ${command}`);
      return false;
    }
  }

  // Check if package manager is available
  isInstalled() {
    console.log(`\n🔍 Checking if ${this.commands.packageManager} is installed...`);
    const installed = this.commandExists(this.commands.packageManager);
    console.log(installed ? `✅ ${this.commands.packageManager} is installed` : `❌ ${this.commands.packageManager} is not installed`);
    return installed;
  }

  // Check if a package is installed via the package manager
  async isPackageInstalledViaManager(packageName) {
    try {
      console.log(`\n🔍 Checking if ${packageName} is installed via ${this.commands.packageManager}...`);
      
      if (this.isWindows) {
        const output = execSync(`winget list --id ${packageName}`).toString();
        const isInstalled = output.includes(packageName);
        console.log(isInstalled ? `✅ ${packageName} is installed via winget` : `❌ ${packageName} is not installed via winget`);
        return isInstalled;
      } else {
        const output = execSync(`brew list ${packageName} 2>/dev/null || true`).toString();
        const isInstalled = output.trim() !== '';
        console.log(isInstalled ? `✅ ${packageName} is installed via Homebrew` : `❌ ${packageName} is not installed via Homebrew`);
        return isInstalled;
      }
    } catch (e) {
      console.log(`❌ Error checking package installation: ${e.message}`);
      return false;
    }
  }

  // Install package manager
  async install() {
    try {
      console.log(`\n🔄 Installing ${this.commands.packageManager}...`);
      
      if (this.isWindows) {
        // For Windows, we need to run PowerShell as administrator
        console.log('⚠️ Windows requires administrator privileges for winget installation');
        console.log('Please run PowerShell as Administrator and execute the following command:');
        console.log(this.commands.installPackageManager);
        console.log('\nAfter installing winget, please run this command again.');
        return false;
      } else {
        // For macOS, we can run the installation directly
        console.log('📥 Downloading and installing Homebrew...');
        execSync(this.commands.installPackageManager, { stdio: 'inherit' });
        
        // After installation, we need to add brew to PATH
        const brewPath = '/opt/homebrew/bin';
        console.log(`\n🔍 Checking if Homebrew is in PATH: ${brewPath}`);
        if (!process.env.PATH.includes(brewPath)) {
          console.log('⚠️ Homebrew not found in PATH, adding it...');
          const shellConfig = process.env.SHELL.includes('zsh') ? '.zshrc' : '.bash_profile';
          const configPath = path.join(process.env.HOME, shellConfig);
          fs.appendFileSync(configPath, `\nexport PATH="${brewPath}:$PATH"\n`);
          console.log(`\n✅ Added Homebrew to PATH in ${shellConfig}`);
          console.log('⚠️ Please restart your terminal or run:');
          console.log(`   source ${configPath}`);
          return false;
        }
        console.log('✅ Homebrew is properly configured in PATH');
      }
      
      return true;
    } catch (error) {
      console.error(`\n❌ Error installing ${this.commands.packageManager}:`, error.message);
      console.error('Stack trace:', error.stack);
      return false;
    }
  }

  // Install a package using the package manager
  async installPackage(packageName, options = {}) {
    try {
      console.log(`\n📦 Installing package: ${packageName}`);
      
      if (!this.isInstalled()) {
        console.log(`\n⚠️ ${this.commands.packageManager} is not installed.`);
        const installed = await this.install();
        if (!installed) {
          throw new Error(`Please install ${this.commands.packageManager} first and try again`);
        }
      }

      const command = this.isWindows ? 
        `winget install --id ${packageName} -e --source winget` :
        `brew install ${packageName}`;

      console.log(`\n🔄 Executing command: ${command}`);
      execSync(command, { stdio: 'inherit' });
      console.log(`\n✅ Package installed successfully: ${packageName}`);
      return true;
    } catch (error) {
      console.error(`\n❌ Error installing ${packageName}:`, error.message);
      console.error('Stack trace:', error.stack);
      return false;
    }
  }

  // Upgrade a package using the package manager
  async upgradePackage(packageName) {
    try {
      console.log(`\n📦 Upgrading package: ${packageName}`);
      
      if (!this.isInstalled()) {
        console.log(`\n⚠️ ${this.commands.packageManager} is not installed.`);
        const installed = await this.install();
        if (!installed) {
          throw new Error(`Please install ${this.commands.packageManager} first and try again`);
        }
      }

      // Check if the package is installed via the package manager
      const isInstalledViaManager = await this.isPackageInstalledViaManager(packageName);
      if (!isInstalledViaManager) {
        console.log(`\n⚠️ ${packageName} is not installed via ${this.commands.packageManager}`);
        
        // Ask user if they want to install via package manager
        const { shouldInstall } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldInstall',
            message: `Would you like to install ${packageName} via ${this.commands.packageManager}?`,
            default: true
          }
        ]);

        if (shouldInstall) {
          return await this.installPackage(packageName);
        } else {
          console.log(`\n⚠️ Skipping ${packageName} installation via ${this.commands.packageManager}`);
          return false;
        }
      }

      const command = this.isWindows ? 
        `winget upgrade --id ${packageName} -e --source winget` :
        `brew upgrade ${packageName}`;

      console.log(`\n🔄 Executing command: ${command}`);
      execSync(command, { stdio: 'inherit' });
      console.log(`\n✅ Package upgrade completed: ${packageName}`);
      return true;
    } catch (error) {
      console.error(`\n❌ Error upgrading ${packageName}:`, error.message);
      console.error('Stack trace:', error.stack);
      return false;
    }
  }

  // Get the current version of a package
  async getPackageVersion(packageName) {
    try {
      console.log(`\n🔍 Checking version for package: ${packageName}`);
      
      if (!this.isInstalled()) {
        console.log(`❌ ${this.commands.packageManager} is not installed`);
        return null;
      }

      const command = this.isWindows ? 
        `winget show --id ${packageName}` :
        `brew info ${packageName}`;

      console.log(`\n🔄 Executing command: ${command}`);
      const output = execSync(command).toString().trim();
      console.log('Command output:', output);
      
      let version = null;
      if (this.isWindows) {
        const match = output.match(/Version:\s*([\d.]+)/);
        version = match ? match[1] : null;
      } else {
        const match = output.match(/stable\s+([\d.]+)/);
        version = match ? match[1] : null;
      }

      console.log(version ? `✅ Found version: ${version}` : '❌ Could not determine version');
      return version;
    } catch (e) {
      console.error(`\n❌ Error getting version for ${packageName}:`, e.message);
      console.error('Stack trace:', e.stack);
      return null;
    }
  }
}

module.exports = PackageManager; 
const { execSync } = require('child_process');
const os = require('os');
const PackageManager = require('./package-manager');
const inquirer = require('inquirer');

class GitHubCliInstaller {
  constructor() {
    this.isWindows = process.platform === 'win32';
    this.packageManager = new PackageManager();
    this.commands = {
      checkCommand: this.isWindows ? 'where' : 'which',
      versionCommand: 'gh --version'
    };
    // Use different package names based on platform
    this.ghPackageName = this.isWindows ? 'GitHub.cli' : 'gh';
    console.log('\n🔧 GitHub CLI Installer initialized');
    console.log(`Platform: ${this.isWindows ? 'Windows' : 'Unix-like'}`);
    console.log(`Package name: ${this.ghPackageName}`);
  }

  // Check if GitHub CLI is installed
  isInstalled() {
    try {
      console.log('\n🔍 Checking if GitHub CLI is installed...');
      execSync(`${this.commands.checkCommand} gh`, { stdio: 'ignore' });
      console.log('✅ GitHub CLI is installed');
      return true;
    } catch (e) {
      console.log('❌ GitHub CLI is not installed');
      return false;
    }
  }

  // Get current GitHub CLI version
  getCurrentVersion() {
    try {
      if (!this.isInstalled()) {
        return null;
      }

      console.log('\n🔍 Getting current GitHub CLI version...');
      const versionOutput = execSync(this.commands.versionCommand).toString().trim();
      console.log('GitHub CLI version output:', versionOutput);
      
      const match = versionOutput.match(/gh version\s+([\d.]+)/i);
      if (match && match[1]) {
        console.log(`✅ Current GitHub CLI version: ${match[1]}`);
        return match[1];
      } else {
        console.error('❌ Could not parse GitHub CLI version from output:', versionOutput);
        return null;
      }
    } catch (e) {
      console.error('❌ Error fetching GitHub CLI version:', e.message);
      console.error('Stack trace:', e.stack);
      return null;
    }
  }

  // Install GitHub CLI
  async install() {
    try {
      console.log('\n🔄 Installing GitHub CLI...');
      const success = await this.packageManager.installPackage(this.ghPackageName);
      if (!success) {
        throw new Error('Failed to install GitHub CLI via package manager');
      }

      // Verify the installation
      console.log('\n🔍 Verifying GitHub CLI installation...');
      const version = this.getCurrentVersion();
      if (!version) {
        throw new Error('GitHub CLI installed, but version verification failed');
      }

      console.log(`\n✅ GitHub CLI has been successfully installed (version ${version})`);
      return {
        success: true,
        version: version
      };
    } catch (error) {
      console.error('\n❌ Error installing GitHub CLI:', error.message);
      console.error('Stack trace:', error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Uninstall GitHub CLI based on installation method
  async uninstallGitHubCli() {
    try {
      console.log('\n🔍 Determining GitHub CLI installation method...');
      
      // Check if GitHub CLI is installed via package manager
      const isInstalledViaManager = await this.packageManager.isPackageInstalledViaManager(this.ghPackageName);
      
      if (isInstalledViaManager) {
        console.log('\n🔄 Uninstalling GitHub CLI via package manager...');
        const command = this.isWindows ? 
          `winget uninstall --id ${this.ghPackageName}` :
          `brew uninstall ${this.ghPackageName}`;
        
        execSync(command, { stdio: 'inherit' });
        console.log('✅ GitHub CLI uninstalled via package manager');
      } else {
        // For non-package-manager installations, we need to handle it differently
        if (this.isWindows) {
          console.log('\n⚠️ Please uninstall GitHub CLI using Windows Control Panel or Settings');
          console.log('1. Open Windows Settings');
          console.log('2. Go to Apps & features');
          console.log('3. Search for "GitHub CLI"');
          console.log('4. Click Uninstall');
          return false;
        } else {
          // For macOS, find GitHub CLI's exact location
          console.log('\n🔍 Finding GitHub CLI installation location...');
          const ghPath = execSync('which gh').toString().trim();
          console.log(`Found GitHub CLI at: ${ghPath}`);

          // Check if this is a Homebrew installation
          if (ghPath.includes('homebrew')) {
            console.log('\n🔄 This appears to be a Homebrew installation');
            execSync('brew uninstall gh', { stdio: 'inherit' });
          } else {
            // For system installation, we need to be more careful
            console.log('\n⚠️ This appears to be a system GitHub CLI installation');
            console.log('Removing GitHub CLI executable...');
            execSync(`sudo rm ${ghPath}`, { stdio: 'inherit' });
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('\n❌ Error uninstalling GitHub CLI:', error.message);
      console.error('Stack trace:', error.stack);
      return false;
    }
  }

  // Update GitHub CLI to the latest version
  async update() {
    try {
      console.log('\n🔄 Starting GitHub CLI update process...');
      
      if (!this.isInstalled()) {
        throw new Error('GitHub CLI is not installed on your system');
      }

      // Get current version before update
      const currentVersion = this.getCurrentVersion();
      console.log(`\n📊 Current GitHub CLI version: ${currentVersion}`);

      // Check if GitHub CLI is installed via package manager
      const isInstalledViaManager = await this.packageManager.isPackageInstalledViaManager(this.ghPackageName);
      
      if (!isInstalledViaManager) {
        console.log('\n⚠️ GitHub CLI is installed but not via package manager');
        console.log('To update GitHub CLI, you have two options:');
        console.log('1. Install GitHub CLI via package manager (recommended)');
        console.log('2. Update GitHub CLI manually from https://cli.github.com/');
        
        // Ask user which option they prefer
        const { updateMethod } = await inquirer.prompt([
          {
            type: 'list',
            name: 'updateMethod',
            message: 'How would you like to update GitHub CLI?',
            choices: [
              { name: 'Install via package manager (recommended)', value: 'package' },
              { name: 'Update manually from cli.github.com', value: 'manual' }
            ],
            default: 'package'
          }
        ]);

        if (updateMethod === 'package') {
          console.log('\n⚠️ Since GitHub CLI is not installed via package manager, we need to:');
          console.log('1. Uninstall the current GitHub CLI installation');
          console.log('2. Install GitHub CLI via package manager');
          
          const { proceed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'proceed',
              message: 'Would you like to proceed with uninstalling the current GitHub CLI installation?',
              default: true
            }
          ]);

          if (!proceed) {
            console.log('\n⚠️ Skipping GitHub CLI update. You can update GitHub CLI manually from https://cli.github.com/');
            return {
              success: false,
              error: 'User cancelled uninstallation',
              needsManualUpdate: true
            };
          }

          // Uninstall current GitHub CLI installation
          const uninstalled = await this.uninstallGitHubCli();
          if (!uninstalled) {
            throw new Error('Failed to uninstall current GitHub CLI installation');
          }

          // Install GitHub CLI via package manager
          console.log('\n🔄 Installing GitHub CLI via package manager...');
          const success = await this.packageManager.installPackage(this.ghPackageName);
          if (!success) {
            throw new Error('Failed to install GitHub CLI via package manager');
          }
        } else {
          console.log('\n⚠️ Manual update selected');
          console.log('Please visit https://cli.github.com/ to download and install the latest version');
          return {
            success: false,
            error: 'Manual update required',
            needsManualUpdate: true
          };
        }
      } else {
        // GitHub CLI is already installed via package manager, just upgrade it
        console.log('\n🔄 GitHub CLI is already installed via package manager, proceeding with upgrade...');
      }

      console.log('\n🔄 Updating GitHub CLI...');
      // Use the package manager to upgrade GitHub CLI
      const success = await this.packageManager.upgradePackage(this.ghPackageName);
      if (!success) {
        throw new Error('Failed to update GitHub CLI via package manager');
      }

      // Verify the update by checking the new version
      console.log('\n🔍 Verifying GitHub CLI update...');
      const newVersion = this.getCurrentVersion();
      if (!newVersion) {
        throw new Error('GitHub CLI updated, but version verification failed');
      }
      
      console.log(`\n📊 Version comparison:`);
      console.log(`Before: ${currentVersion}`);
      console.log(`After:  ${newVersion}`);
      
      if (currentVersion === newVersion) {
        console.log('\n⚠️ GitHub CLI version unchanged. The package might already be at the latest version.');
      } else {
        console.log(`\n✅ GitHub CLI has been successfully updated from ${currentVersion} to ${newVersion}`);
      }

      return {
        success: true,
        version: newVersion,
        previousVersion: currentVersion
      };
    } catch (error) {
      console.error('\n❌ Error updating GitHub CLI:', error.message);
      console.error('Stack trace:', error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = GitHubCliInstaller; 
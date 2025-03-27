const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const PackageManager = require('./package-manager');
const inquirer = require('inquirer');

class GitInstaller {
  constructor() {
    this.isWindows = process.platform === 'win32';
    this.packageManager = new PackageManager();
    this.commands = {
      checkCommand: this.isWindows ? 'where' : 'which',
      versionCommand: 'git --version'
    };
    // Use different package names based on platform
    this.gitPackageName = this.isWindows ? 'Git.Git' : 'git';
    console.log('\n🔧 Git Installer initialized');
    console.log(`Platform: ${this.isWindows ? 'Windows' : 'Unix-like'}`);
    console.log(`Package name: ${this.gitPackageName}`);
  }

  // Check if Git is installed
  isInstalled() {
    try {
      console.log('\n🔍 Checking if Git is installed...');
      execSync(`${this.commands.checkCommand} git`, { stdio: 'ignore' });
      console.log('✅ Git is installed');
      return true;
    } catch (e) {
      console.log('❌ Git is not installed');
      return false;
    }
  }

  // Get current Git version
  getCurrentVersion() {
    try {
      console.log('\n🔍 Getting current Git version...');
      const versionOutput = execSync(this.commands.versionCommand).toString().trim();
      console.log('Git version output:', versionOutput);
      
      // Use a more robust regex pattern to match version output.
      const match = versionOutput.match(/git version\s+([\d.]+)/i);
      if (match && match[1]) {
        console.log(`✅ Current Git version: ${match[1]}`);
        return match[1];
      } else {
        console.error('❌ Could not parse Git version from output:', versionOutput);
        return null;
      }
    } catch (e) {
      console.error('❌ Error fetching Git version:', e.message);
      console.error('Stack trace:', e.stack);
      return null;
    }
  }

  // Uninstall Git based on installation method
  async uninstallGit() {
    try {
      console.log('\n🔍 Determining Git installation method...');
      
      // Check if Git is installed via package manager
      const isInstalledViaManager = await this.packageManager.isPackageInstalledViaManager(this.gitPackageName);
      
      if (isInstalledViaManager) {
        console.log('\n🔄 Uninstalling Git via package manager...');
        const command = this.isWindows ? 
          `winget uninstall --id ${this.gitPackageName}` :
          `brew uninstall ${this.gitPackageName}`;
        
        execSync(command, { stdio: 'inherit' });
        console.log('✅ Git uninstalled via package manager');
      } else {
        // For non-package-manager installations, we need to handle it differently
        if (this.isWindows) {
          console.log('\n⚠️ Please uninstall Git using Windows Control Panel or Settings');
          console.log('1. Open Windows Settings');
          console.log('2. Go to Apps & features');
          console.log('3. Search for "Git"');
          console.log('4. Click Uninstall');
          return false;
        } else {
          // For macOS, find Git's exact location
          console.log('\n🔍 Finding Git installation location...');
          const gitPath = execSync('which git').toString().trim();
          console.log(`Found Git at: ${gitPath}`);

          // Check if this is a system Git installation
          if (gitPath === '/usr/bin/git') {
            console.log('\n⚠️ This is the system Git installation on macOS');
            console.log('We recommend keeping the system Git and installing a separate version via Homebrew');
            console.log('The system Git will be used as a fallback');
            return false;
          }

          // Check if this is a Homebrew installation
          if (gitPath.includes('homebrew')) {
            console.log('\n🔄 This appears to be a Homebrew installation');
            execSync('brew uninstall git', { stdio: 'inherit' });
          } else {
            // For other installations, we need to be more careful
            console.log('\n⚠️ This appears to be a non-system Git installation');
            console.log('Removing Git executable...');
            execSync(`sudo rm ${gitPath}`, { stdio: 'inherit' });

            // Try to find and remove related files
            const possibleRelatedDirs = [
              path.join(path.dirname(gitPath), 'git-core'),
              path.join(path.dirname(gitPath), 'git')
            ];

            for (const dir of possibleRelatedDirs) {
              if (fs.existsSync(dir)) {
                console.log(`\n🔄 Removing related directory: ${dir}`);
                execSync(`sudo rm -rf ${dir}`, { stdio: 'inherit' });
              }
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('\n❌ Error uninstalling Git:', error.message);
      console.error('Stack trace:', error.stack);
      return false;
    }
  }

  // Update Git to the latest version
  async update() {
    try {
      console.log('\n🔄 Starting Git update process...');
      
      if (!this.isInstalled()) {
        throw new Error('Git is not installed on your system');
      }

      // Get current version before update
      const currentVersion = this.getCurrentVersion();
      console.log(`\n📊 Current Git version: ${currentVersion}`);

      // Check if Git is installed via package manager
      const isInstalledViaManager = await this.packageManager.isPackageInstalledViaManager(this.gitPackageName);
      
      if (!isInstalledViaManager) {
        console.log('\n⚠️ Git is installed but not via package manager');
        
        // Check if this is a system Git installation
        const gitPath = execSync('which git').toString().trim();
        if (gitPath === '/usr/bin/git') {
          console.log('\nℹ️ This is the system Git installation on macOS');
          console.log('We will keep the system Git and install a separate version via Homebrew');
          console.log('The system Git will be used as a fallback');
          
          // Proceed directly to installing via Homebrew
          console.log('\n🔄 Installing Git via Homebrew...');
          const success = await this.packageManager.installPackage(this.gitPackageName);
          if (!success) {
            throw new Error('Failed to install Git via Homebrew');
          }
          
          // Verify the installation
          const newVersion = this.getCurrentVersion();
          if (!newVersion) {
            throw new Error('Git installed, but version verification failed');
          }
          
          console.log(`\n✅ Git has been successfully installed via Homebrew (version ${newVersion})`);
          return {
            success: true,
            version: newVersion,
            previousVersion: currentVersion
          };
        }

        // For non-system installations, show options
        console.log('To update Git, you have two options:');
        console.log('1. Install Git via package manager (recommended)');
        console.log('2. Update Git manually from https://git-scm.com/downloads');
        
        // Ask user which option they prefer
        const { updateMethod } = await inquirer.prompt([
          {
            type: 'list',
            name: 'updateMethod',
            message: 'How would you like to update Git?',
            choices: [
              { name: 'Install via package manager (recommended)', value: 'package' },
              { name: 'Update manually from git-scm.com', value: 'manual' }
            ],
            default: 'package'
          }
        ]);

        if (updateMethod === 'package') {
          console.log('\n⚠️ Since Git is not installed via package manager, we need to:');
          console.log('1. Uninstall the current Git installation');
          console.log('2. Install Git via package manager');
          
          const { proceed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'proceed',
              message: 'Would you like to proceed with uninstalling the current Git installation?',
              default: true
            }
          ]);

          if (!proceed) {
            console.log('\n⚠️ Skipping Git update. You can update Git manually from https://git-scm.com/downloads');
            return {
              success: false,
              error: 'User cancelled uninstallation',
              needsManualUpdate: true
            };
          }

          // Uninstall current Git installation
          const uninstalled = await this.uninstallGit();
          if (!uninstalled) {
            throw new Error('Failed to uninstall current Git installation');
          }

          // Install Git via package manager
          console.log('\n🔄 Installing Git via package manager...');
          const success = await this.packageManager.installPackage(this.gitPackageName);
          if (!success) {
            throw new Error('Failed to install Git via package manager');
          }
        } else {
          console.log('\n⚠️ Manual update selected');
          console.log('Please visit https://git-scm.com/downloads to download and install the latest version');
          return {
            success: false,
            error: 'Manual update required',
            needsManualUpdate: true
          };
        }
      } else {
        // Git is already installed via package manager, just upgrade it
        console.log('\n🔄 Git is already installed via package manager, proceeding with upgrade...');
      }

      console.log('\n🔄 Updating Git...');
      // Use the package manager to upgrade Git
      const success = await this.packageManager.upgradePackage(this.gitPackageName);
      if (!success) {
        throw new Error('Failed to update Git via package manager');
      }

      // Verify the update by checking the new version
      console.log('\n🔍 Verifying Git update...');
      const newVersion = this.getCurrentVersion();
      if (!newVersion) {
        throw new Error('Git updated, but version verification failed');
      }
      
      console.log(`\n📊 Version comparison:`);
      console.log(`Before: ${currentVersion}`);
      console.log(`After:  ${newVersion}`);
      
      if (currentVersion === newVersion) {
        console.log('\n⚠️ Git version unchanged. The package might already be at the latest version.');
      } else {
        console.log(`\n✅ Git has been successfully updated from ${currentVersion} to ${newVersion}`);
      }

      return {
        success: true,
        version: newVersion,
        previousVersion: currentVersion
      };
    } catch (error) {
      console.error('\n❌ Error updating Git:', error.message);
      console.error('Stack trace:', error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = GitInstaller;

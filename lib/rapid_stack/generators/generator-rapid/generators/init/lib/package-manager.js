const { execSync } = require('child_process');

class PackageManager {
  constructor() {
    this.commands = {
      install: 'brew install',
      upgrade: 'brew upgrade',
      uninstall: 'brew uninstall',
      list: 'brew list',
      info: 'brew info'
    };
    console.log('\n🔧 Package Manager initialized');
  }

  // Check if a package is installed via package manager
  async isPackageInstalledViaManager(packageName) {
    try {
      console.log(`\n🔍 Checking if ${packageName} is installed via brew...`);
      const output = execSync(`${this.commands.list} ${packageName}`, { stdio: 'ignore' }).toString().trim();
      console.log(`✅ ${packageName} is installed via Homebrew`);
      return true;
    } catch (e) {
      console.log(`❌ ${packageName} is not installed via Homebrew`);
      return false;
    }
  }

  // Install a package
  async installPackage(packageName) {
    try {
      console.log(`\n🔄 Installing ${packageName} via Homebrew...`);
      execSync(`${this.commands.install} ${packageName}`, { stdio: 'inherit' });
      console.log(`✅ ${packageName} installed successfully`);
      return true;
    } catch (error) {
      console.error(`\n❌ Error installing ${packageName}:`, error.message);
      console.error('Stack trace:', error.stack);
      return false;
    }
  }

  // Upgrade a package
  async upgradePackage(packageName) {
    try {
      console.log(`\n🔄 Upgrading ${packageName} via Homebrew...`);
      execSync(`${this.commands.upgrade} ${packageName}`, { stdio: 'inherit' });
      console.log(`✅ ${packageName} upgraded successfully`);
      return true;
    } catch (error) {
      console.error(`\n❌ Error upgrading ${packageName}:`, error.message);
      console.error('Stack trace:', error.stack);
      return false;
    }
  }

  // Uninstall a package
  async uninstallPackage(packageName) {
    try {
      console.log(`\n🔄 Uninstalling ${packageName} via Homebrew...`);
      execSync(`${this.commands.uninstall} ${packageName}`, { stdio: 'inherit' });
      console.log(`✅ ${packageName} uninstalled successfully`);
      return true;
    } catch (error) {
      console.error(`\n❌ Error uninstalling ${packageName}:`, error.message);
      console.error('Stack trace:', error.stack);
      return false;
    }
  }

  // Get package version
  async getPackageVersion(packageName) {
    try {
      console.log(`\n🔍 Getting ${packageName} version from Homebrew...`);
      const output = execSync(`${this.commands.info} ${packageName}`).toString().trim();
      const match = output.match(new RegExp(`${packageName}: ([0-9.]+)`));
      if (match && match[1]) {
        console.log(`✅ ${packageName} version: ${match[1]}`);
        return match[1];
      }
      console.log(`❌ Could not find version for ${packageName}`);
      return null;
    } catch (error) {
      console.error(`\n❌ Error getting ${packageName} version:`, error.message);
      console.error('Stack trace:', error.stack);
      return null;
    }
  }
}

module.exports = PackageManager; 
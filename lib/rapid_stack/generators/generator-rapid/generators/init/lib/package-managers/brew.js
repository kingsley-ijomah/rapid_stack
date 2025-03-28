const { execSync } = require('child_process');
const os = require('os');

class BrewPackageManager {
  constructor() {
    this.platform = process.platform;
    console.log(`Initializing brew package manager for platform: ${this.platform}`);
    this.commands = {
      install: 'arch -arm64 brew install',
      upgrade: 'arch -arm64 brew upgrade',
      uninstall: 'arch -arm64 brew uninstall',
      list: 'arch -arm64 brew list',
      info: 'arch -arm64 brew info'
    };
  }

  async isInstalled(packageName) {
    try {
      console.log('Checking if Homebrew is installed...');
      execSync('which brew', { stdio: 'ignore' });
      console.log('✅ Homebrew is installed');

      console.log(`Checking if ${packageName} is installed...`);
      execSync(`${this.commands.list} ${packageName}`, { stdio: 'ignore' });
      console.log(`✅ ${packageName} is installed`);
      return true;
    } catch (error) {
      console.log(`Error checking installation status: ${error.message}`);
      return false;
    }
  }

  async install(packageName, options = {}) {
    try {
      console.log(`Attempting to install ${packageName}...`);
      console.log('Checking if Homebrew is installed...');
      execSync('which brew', { stdio: 'ignore' });
      console.log('✅ Homebrew is installed');

      console.log(`Checking if ${packageName} is installed...`);
      const isInstalled = await this.isInstalled(packageName);
      
      if (isInstalled) {
        console.log(`${packageName} is already installed`);
        return true;
      }

      console.log(`${packageName} is not installed`);
      if (options.version) {
        console.log(`Installing version ${options.version}`);
        execSync(`${this.commands.install} ${packageName}@${options.version}`, { stdio: 'inherit' });
      } else {
        console.log('Installing latest version');
        execSync(`${this.commands.install} ${packageName}`, { stdio: 'inherit' });
      }
      return true;
    } catch (error) {
      console.error(`❌ Installation failed: ${error.message}`);
      return false;
    }
  }

  async upgrade(packageName, options = {}) {
    try {
      console.log(`Attempting to upgrade ${packageName}...`);
      console.log('Checking if Homebrew is installed...');
      execSync('which brew', { stdio: 'ignore' });
      console.log('✅ Homebrew is installed');

      console.log(`Checking if ${packageName} is installed...`);
      const isInstalled = await this.isInstalled(packageName);
      
      if (!isInstalled) {
        console.log(`❌ ${packageName} is not installed, attempting to install it first...`);
        return await this.install(packageName, options);
      }

      if (options.version) {
        console.log(`Upgrading to version ${options.version}`);
        execSync(`${this.commands.install} ${packageName}@${options.version}`, { stdio: 'inherit' });
      } else {
        console.log('Upgrading to latest version');
        execSync(`${this.commands.upgrade} ${packageName}`, { stdio: 'inherit' });
      }
      return true;
    } catch (error) {
      console.error(`❌ Failed to upgrade ${packageName}: ${error.message}`);
      return false;
    }
  }

  async uninstall(packageName) {
    try {
      console.log(`Attempting to uninstall ${packageName}...`);
      execSync(`${this.commands.uninstall} ${packageName}`, { stdio: 'inherit' });
      return true;
    } catch (error) {
      console.error(`❌ Failed to uninstall ${packageName}: ${error.message}`);
      return false;
    }
  }

  async getVersion(packageName) {
    try {
      const output = execSync(`${this.commands.info} ${packageName}`, { encoding: 'utf8' });
      const versionMatch = output.match(/^.*?(\d+\.\d+\.\d+).*$/m);
      return versionMatch ? versionMatch[1] : null;
    } catch (error) {
      console.error(`Error getting version: ${error.message}`);
      return null;
    }
  }
}

module.exports = BrewPackageManager; 
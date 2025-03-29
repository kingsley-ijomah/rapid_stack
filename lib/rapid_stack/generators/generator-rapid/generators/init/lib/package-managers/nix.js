const { execSync } = require('child_process');
const os = require('os');

class NixPackageManager {
  constructor() {
    this.platform = process.platform;
    console.log(`Initializing nix package manager for platform: ${this.platform}`);
    this.commands = {
      install: 'nix-env -iA',
      upgrade: 'nix-env -u',
      uninstall: 'nix-env -e',
      list: 'nix-env -q',
      info: 'nix-env -qaP'
    };
  }

  async isInstalled(packageName) {
    try {
      console.log(`Checking if ${packageName} is installed...`);
      execSync(`${this.commands.list} ${packageName}`, { stdio: 'ignore' });
      console.log(`✅ ${packageName} is installed`);
      return true;
    } catch (error) {
      console.log(`Error checking installation status: ${error.message}`);
      return false;
    }
  }

  async isManagerInstalled() {
    try {
      console.log('Checking if Nix is installed...');
      execSync('which nix', { stdio: 'ignore' });
      console.log('✅ Nix is installed');
      return true;
    } catch (error) {
      console.log(`Error checking Nix installation: ${error.message}`);
      return false;
    }
  }

  async install(packageName, options = {}) {
    try {
      console.log(`Attempting to install ${packageName}...`);
      console.log('Checking if Nix is installed...');
      execSync('which nix-env', { stdio: 'ignore' });
      console.log('✅ Nix is installed');

      console.log(`Checking if ${packageName} is installed...`);
      const isInstalled = await this.isInstalled(packageName);
      
      if (isInstalled) {
        console.log(`${packageName} is already installed`);
        return true;
      }

      console.log(`${packageName} is not installed`);
      if (options.version) {
        console.log(`Installing version ${options.version}`);
        execSync(`${this.commands.install} nixpkgs.${packageName}@${options.version}`, { stdio: 'inherit' });
      } else {
        console.log('Installing latest version');
        execSync(`${this.commands.install} nixpkgs.${packageName}`, { stdio: 'inherit' });
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
      console.log('Checking if Nix is installed...');
      execSync('which nix-env', { stdio: 'ignore' });
      console.log('✅ Nix is installed');

      console.log(`Checking if ${packageName} is installed...`);
      const isInstalled = await this.isInstalled(packageName);
      
      if (!isInstalled) {
        console.log(`❌ ${packageName} is not installed, attempting to install it first...`);
        return await this.install(packageName, options);
      }

      if (options.version) {
        console.log(`Upgrading to version ${options.version}`);
        execSync(`${this.commands.install} nixpkgs.${packageName}@${options.version}`, { stdio: 'inherit' });
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

module.exports = NixPackageManager; 
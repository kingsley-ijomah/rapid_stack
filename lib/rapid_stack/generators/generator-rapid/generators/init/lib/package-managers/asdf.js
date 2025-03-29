const { execSync } = require('child_process');
const os = require('os');

class ASDFPackageManager {
  constructor() {
    this.platform = process.platform;
    console.log(`Initializing asdf package manager for platform: ${this.platform}`);
    this.commands = {
      install: 'asdf install',
      upgrade: 'asdf install',
      uninstall: 'asdf uninstall',
      list: 'asdf list',
      info: 'asdf list all',
      current: 'asdf current'
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
      console.log('Checking if ASDF is installed...');
      execSync('which asdf', { stdio: 'ignore' });
      console.log('✅ ASDF is installed');
      return true;
    } catch (error) {
      console.log(`Error checking ASDF installation: ${error.message}`);
      return false;
    }
  }

  async install(packageName, options = {}) {
    try {
      console.log(`Attempting to install ${packageName}...`);
      console.log('Checking if ASDF is installed...');
      execSync('which asdf', { stdio: 'ignore' });
      console.log('✅ ASDF is installed');

      console.log(`Checking if ${packageName} is installed...`);
      const isInstalled = await this.isInstalled(packageName);
      
      if (isInstalled) {
        console.log(`${packageName} is already installed`);
        return true;
      }

      console.log(`${packageName} is not installed`);
      if (options.version) {
        console.log(`Installing version ${options.version}`);
        execSync(`${this.commands.install} ${packageName} ${options.version}`, { stdio: 'inherit' });
        // Set the global version after installation
        execSync(`asdf global ${packageName} ${options.version}`, { stdio: 'inherit' });
      } else {
        console.log('Installing latest version');
        // Get the latest version
        const latestVersion = execSync(`${this.commands.info} ${packageName} | tail -n 1`, { encoding: 'utf8' }).trim();
        execSync(`${this.commands.install} ${packageName} ${latestVersion}`, { stdio: 'inherit' });
        // Set the global version after installation
        execSync(`asdf global ${packageName} ${latestVersion}`, { stdio: 'inherit' });
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
      console.log('Checking if ASDF is installed...');
      execSync('which asdf', { stdio: 'ignore' });
      console.log('✅ ASDF is installed');

      console.log(`Checking if ${packageName} is installed...`);
      const isInstalled = await this.isInstalled(packageName);
      
      if (!isInstalled) {
        console.log(`❌ ${packageName} is not installed, attempting to install it first...`);
        return await this.install(packageName, options);
      }

      if (options.version) {
        console.log(`Upgrading to version ${options.version}`);
        execSync(`${this.commands.install} ${packageName} ${options.version}`, { stdio: 'inherit' });
        // Set the global version after upgrade
        execSync(`asdf global ${packageName} ${options.version}`, { stdio: 'inherit' });
      } else {
        console.log('Upgrading to latest version');
        // Get the latest version
        const latestVersion = execSync(`${this.commands.info} ${packageName} | tail -n 1`, { encoding: 'utf8' }).trim();
        execSync(`${this.commands.install} ${packageName} ${latestVersion}`, { stdio: 'inherit' });
        // Set the global version after upgrade
        execSync(`asdf global ${packageName} ${latestVersion}`, { stdio: 'inherit' });
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
      const output = execSync(`${this.commands.current} ${packageName}`, { encoding: 'utf8' });
      const versionMatch = output.match(/^.*?(\d+\.\d+\.\d+).*$/m);
      return versionMatch ? versionMatch[1] : null;
    } catch (error) {
      console.error(`Error getting version: ${error.message}`);
      return null;
    }
  }

  async listAvailableVersions(packageName) {
    try {
      const output = execSync(`${this.commands.info} ${packageName}`, { encoding: 'utf8' });
      const versions = output.split('\n').filter(v => v.trim());
      return {
        success: true,
        versions: versions
      };
    } catch (error) {
      console.error(`Error listing versions: ${error.message}`);
      return {
        success: false,
        versions: []
      };
    }
  }
}

module.exports = ASDFPackageManager; 
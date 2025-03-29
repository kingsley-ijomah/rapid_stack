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
      current: 'asdf current',
      set: 'asdf set',
      plugin: {
        add: 'asdf plugin add',
        list: 'asdf plugin list'
      }
    };
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

  async listAvailableVersions(packageName) {
    try {
      // First check if the plugin is installed
      const pluginList = execSync(this.commands.plugin.list, { encoding: 'utf8' });
      if (!pluginList.includes(packageName)) {
        console.log(`Installing ASDF plugin for ${packageName}...`);
        execSync(`${this.commands.plugin.add} ${packageName}`, { stdio: 'inherit' });
      }

      console.log(`Listing available versions for ${packageName}...`);
      const versions = execSync(`${this.commands.info} ${packageName}`, { encoding: 'utf8' })
        .split('\n')
        .filter(version => version.trim() !== '');
      
      return {
        success: true,
        versions
      };
    } catch (error) {
      console.log(`Error listing versions: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async install(packageName, options = {}) {
    try {
      // First check if the plugin is installed
      const pluginList = execSync(this.commands.plugin.list, { encoding: 'utf8' });
      if (!pluginList.includes(packageName)) {
        console.log(`Installing ASDF plugin for ${packageName}...`);
        execSync(`${this.commands.plugin.add} ${packageName}`, { stdio: 'inherit' });
      }

      console.log(`Installing ${packageName}...`);
      execSync(`${this.commands.install} ${packageName} latest`, { stdio: 'inherit' });
      execSync(`${this.commands.set} --home ${packageName} latest`, { stdio: 'inherit' });
      return true;
    } catch (error) {
      console.log(`Error installing package: ${error.message}`);
      return false;
    }
  }

  async upgrade(packageName) {
    try {
      // First check if the plugin is installed
      const pluginList = execSync(this.commands.plugin.list, { encoding: 'utf8' });
      if (!pluginList.includes(packageName)) {
        console.log(`Installing ASDF plugin for ${packageName}...`);
        execSync(`${this.commands.plugin.add} ${packageName}`, { stdio: 'inherit' });
      }

      console.log(`Upgrading ${packageName}...`);
      execSync(`${this.commands.upgrade} ${packageName} latest`, { stdio: 'inherit' });
      execSync(`${this.commands.set} --home ${packageName} latest`, { stdio: 'inherit' });
      return true;
    } catch (error) {
      console.log(`Error upgrading package: ${error.message}`);
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
}

module.exports = ASDFPackageManager; 
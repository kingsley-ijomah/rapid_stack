const { execSync } = require('child_process');
const path = require('path');

class GemPackageManager {
  constructor() {
    this.platform = process.platform;
    console.log(`Initializing gem package manager for platform: ${this.platform}`);
    this.commands = {
      install: 'gem install',
      uninstall: 'gem uninstall',
      list: 'gem list',
      info: 'gem info'
    };
  }

  async isManagerInstalled() {
    try {
      console.log('Checking if Ruby is installed...');
      execSync('which ruby', { stdio: 'ignore' });
      console.log('✅ Ruby is installed');
      return true;
    } catch (error) {
      console.log(`Error checking Ruby installation: ${error.message}`);
      return false;
    }
  }

  async isInstalled(packageName) {
    try {
      console.log(`\n🔍 Checking if ${packageName} is installed...`);
      const output = execSync(`${this.commands.list} ${packageName}`, { encoding: 'utf8' });
      const isGemInstalled = output.includes(packageName) && output.includes('(');
      console.log(`Is ${packageName} installed? ${isGemInstalled}`);
      return isGemInstalled;
    } catch (error) {
      console.log(`\n❌ Error checking installation: ${error.message}`);
      return false;
    }
  }

  async listAvailableVersions(packageName) {
    try {
      console.log(`\n🔍 Checking available versions for ${packageName}...`);
      const infoCommand = `${this.commands.info} ${packageName}`;
      console.log(`Executing: ${infoCommand}`);
      const output = execSync(infoCommand, { encoding: 'utf8' });
      
      // Extract versions from the output
      const versions = output
        .split('\n')
        .filter(line => line.includes('Installed versions:'))
        .map(line => {
          const match = line.match(/Installed versions: (.*)/);
          return match ? match[1].split(', ').map(v => v.trim()) : [];
        })
        .flat();

      return {
        success: true,
        versions: versions.length > 0 ? versions : ['latest']
      };
    } catch (error) {
      console.log(`❌ Error checking versions: ${error.message}`);
      return {
        success: false,
        versions: []
      };
    }
  }

  async install(packageName, options = {}) {
    try {
      console.log(`\n🔍 Starting installation process for ${packageName}...`);

      // Check if it's already installed
      console.log(`Checking if ${packageName} is already installed...`);
      const isInstalled = await this.isInstalled(packageName);
      if (isInstalled) {
        console.log(`✅ ${packageName} is already installed`);
        return true;
      }

      // Install the package using ASDF-managed Ruby's gem
      const installCommand = `asdf exec gem install ${packageName}`;
      console.log(`\n🚀 Executing installation command: ${installCommand}`);
      execSync(installCommand, { stdio: 'inherit' });

      // Run asdf reshim ruby to ensure executables are properly linked
      try {
        console.log('\n🔄 Running asdf reshim ruby to update executable links...');
        execSync('asdf reshim ruby', { stdio: 'inherit' });
      } catch (error) {
        console.log(`⚠️ Note: asdf reshim ruby failed: ${error.message}`);
      }

      // Verify installation
      console.log(`\n🔍 Verifying installation...`);
      const installSuccess = await this.isInstalled(packageName);
      if (installSuccess) {
        console.log(`✅ Successfully installed ${packageName}`);
        return true;
      } else {
        console.log(`❌ Failed to install ${packageName}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error during installation: ${error.message}`);
      return false;
    }
  }

  async upgrade(packageName) {
    try {
      // First check if it's installed
      const isInstalled = await this.isInstalled(packageName);
      if (!isInstalled) {
        console.log(`${packageName} is not installed. Installing...`);
        return await this.install(packageName);
      }

      console.log(`Upgrading ${packageName}...`);
      execSync(`${this.commands.install} ${packageName} --update`, { stdio: 'inherit' });
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
      // First try to get version directly from the command
      const output = execSync(`${packageName} --version`, { encoding: 'utf8' });
      const versionMatch = output.match(/([\d.]+)/);
      if (versionMatch) {
        return versionMatch[1];
      }

      // Fallback to gem list if direct version check fails
      const gemOutput = execSync(`${this.commands.list} ${packageName}`, { encoding: 'utf8' });
      const match = gemOutput.match(/\(([\d.]+)\)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = GemPackageManager; 
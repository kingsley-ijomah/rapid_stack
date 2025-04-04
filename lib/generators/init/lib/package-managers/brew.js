const { execSync } = require('child_process');
const os = require('os');

class BrewPackageManager {
  constructor() {
    this.platform = process.platform;
    console.log(`Initializing brew package manager for platform: ${this.platform}`);
    this.commands = {
      install: 'brew install',
      upgrade: 'brew upgrade',
      uninstall: 'brew uninstall',
      list: 'brew list',
      info: 'brew info',
      current: 'brew list --versions',
      tap: 'brew tap',
      services: {
        list: 'brew services list',
        start: 'brew services start',
        stop: 'brew services stop',
        restart: 'brew services restart'
      }
    };
  }

  async isManagerInstalled() {
    try {
      console.log('Checking if Homebrew is installed...');
      execSync('which brew', { stdio: 'ignore' });
      console.log('✅ Homebrew is installed');
      return true;
    } catch (error) {
      console.log(`Error checking Homebrew installation: ${error.message}`);
      return false;
    }
  }

  async isTapInstalled(tap) {
    try {
      execSync(`brew tap | grep -q "^${tap}$"`, { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  async installTap(tap) {
    try {
      console.log(`\n🔍 Checking if tap ${tap} is installed...`);
      const isTapInstalled = await this.isTapInstalled(tap);
      
      if (isTapInstalled) {
        console.log(`✅ Tap ${tap} is already installed`);
        return true;
      }

      console.log(`\n🚀 Adding tap: ${tap}`);
      execSync(`${this.commands.tap} ${tap}`, { stdio: 'inherit' });
      
      // Verify tap was added successfully
      const tapSuccess = await this.isTapInstalled(tap);
      if (tapSuccess) {
        console.log(`✅ Successfully added tap ${tap}`);
        return true;
      } else {
        console.log(`❌ Failed to add tap ${tap}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error adding tap ${tap}: ${error.message}`);
      return false;
    }
  }

  async isInstalled(packageName) {
    try {
      // Check if the package is installed via Homebrew
      const output = execSync(`${this.commands.list} --versions ${packageName}`, { encoding: 'utf8' });
      return output.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  async listAvailableVersions(packageName, options = {}) {
    try {
      // First check and install required taps
      if (options.taps && options.taps.brew) {
        console.log(`\n🔍 Checking required taps for ${packageName}...`);
        for (const tap of options.taps.brew) {
          console.log(`\n📋 Current taps:`);
          execSync('brew tap', { stdio: 'inherit' });
          
          const isTapInstalled = await this.isTapInstalled(tap);
          if (isTapInstalled) {
            console.log(`✅ Tap ${tap} is already installed`);
            continue;
          }

          console.log(`\n🚀 Adding tap: ${tap}`);
          const tapCommand = `${this.commands.tap} ${tap}`;
          console.log(`Executing: ${tapCommand}`);
          execSync(tapCommand, { stdio: 'inherit' });
          
          // Verify tap was added successfully
          console.log(`\n📋 Updated taps:`);
          execSync('brew tap', { stdio: 'inherit' });
          
          const tapSuccess = await this.isTapInstalled(tap);
          if (!tapSuccess) {
            console.log(`❌ Failed to add tap ${tap}`);
            return {
              success: false,
              versions: []
            };
          }
          console.log(`✅ Successfully added tap ${tap}`);
        }
      }

      // Get package info which includes available versions
      console.log(`\n🔍 Checking available versions for ${packageName}...`);
      const infoCommand = `brew info ${packageName}`;
      console.log(`Executing: ${infoCommand}`);
      const output = execSync(infoCommand, { encoding: 'utf8' });
      console.log(`\n📦 Package info:\n${output}`);
      
      // Extract versions from the output
      // Look for lines containing version numbers after "==>"
      const versions = output
        .split('\n')
        .filter(line => line.includes('==>'))
        .map(line => {
          const match = line.match(/(\d+\.\d+\.\d+)/);
          return match ? match[1] : null;
        })
        .filter(version => version !== null);

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

  async isServiceRunning(serviceName) {
    try {
      const output = execSync(this.commands.services.list, { encoding: 'utf8' });
      const serviceLine = output.split('\n').find(line => line.includes(serviceName));
      return serviceLine && serviceLine.includes('started');
    } catch (error) {
      return false;
    }
  }

  async startService(serviceName) {
    try {
      console.log(`\n🚀 Starting service: ${serviceName}`);
      execSync(`${this.commands.services.start} ${serviceName}`, { stdio: 'inherit' });
      
      // Wait a moment and verify the service is running
      await new Promise(resolve => setTimeout(resolve, 2000));
      const isRunning = await this.isServiceRunning(serviceName);
      
      if (isRunning) {
        console.log(`✅ Service ${serviceName} started successfully`);
        return true;
      } else {
        console.log(`❌ Service ${serviceName} failed to start`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error starting service ${serviceName}: ${error.message}`);
      return false;
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

      // Get available versions (this will handle taps)
      console.log(`Checking available versions for ${packageName}...`);
      const versions = await this.listAvailableVersions(packageName, options);
      if (!versions.success) {
        console.log(`❌ Failed to get available versions: ${versions.error}`);
        return false;
      }
      console.log(`Found versions: ${versions.versions.join(', ')}`);

      // Install the package
      const installCommand = `${this.commands.install} ${packageName}`;
      console.log(`\n🚀 Executing installation command: ${installCommand}`);
      execSync(installCommand, { stdio: 'inherit' });

      // Verify installation
      console.log(`\n🔍 Verifying installation...`);
      const installSuccess = await this.isInstalled(packageName);
      if (installSuccess) {
        console.log(`✅ Successfully installed ${packageName}`);
        
        // Check if this is a service that should be started
        if (options.startService) {
          await this.startService(packageName);
        }
        
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
      // First check if it's installed via Homebrew
      const isInstalled = await this.isInstalled(packageName);
      if (!isInstalled) {
        console.log(`${packageName} is not installed via Homebrew. Installing...`);
        return await this.install(packageName);
      }

      console.log(`Upgrading ${packageName}...`);
      execSync(`${this.commands.upgrade} ${packageName}`, { stdio: 'inherit' });
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
      // Get version from brew list --versions
      const output = execSync(`${this.commands.list} --versions ${packageName}`, { encoding: 'utf8' });
      const match = output.match(/(\d+\.\d+\.\d+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = BrewPackageManager; 
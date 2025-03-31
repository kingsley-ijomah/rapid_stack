const { execSync } = require('child_process');

class NPMPackageManager {
  constructor() {
    this.platform = process.platform;
    console.log(`Initializing npm package manager for platform: ${this.platform}`);
    this.commands = {
      install: 'npm install -g',
      uninstall: 'npm uninstall -g',
      list: 'npm list -g',
      info: 'npm info'
    };
  }

  async isManagerInstalled() {
    try {
      console.log('Checking if Node.js is installed...');
      // First check if ASDF Node.js is installed
      try {
        execSync('asdf which node', { stdio: 'ignore' });
        console.log('✅ ASDF Node.js is installed');
        return true;
      } catch (error) {
        console.log('ASDF Node.js not found, checking system Node.js...');
        // Fallback to system Node.js
        execSync('which node', { stdio: 'ignore' });
        console.log('✅ System Node.js is installed');
        return true;
      }
    } catch (error) {
      console.log(`Error checking Node.js installation: ${error.message}`);
      return false;
    }
  }

  async isInstalled(packageName) {
    try {
      console.log(`\n🔍 Checking if ${packageName} is installed...`);
      // Try with ASDF Node.js first
      try {
        const output = execSync(`asdf exec npm list -g ${packageName}`, { encoding: 'utf8' });
        const isNPMInstalled = output.includes(packageName) && output.includes('@');
        console.log(`Is ${packageName} installed? ${isNPMInstalled}`);
        return isNPMInstalled;
      } catch (error) {
        // Fallback to system npm
        const output = execSync(`npm list -g ${packageName}`, { encoding: 'utf8' });
        const isNPMInstalled = output.includes(packageName) && output.includes('@');
        console.log(`Is ${packageName} installed? ${isNPMInstalled}`);
        return isNPMInstalled;
      }
    } catch (error) {
      console.log(`\n❌ Error checking installation: ${error.message}`);
      return false;
    }
  }

  async listAvailableVersions(packageName) {
    try {
      console.log(`\n🔍 Checking available versions for ${packageName}...`);
      // Try with ASDF Node.js first
      try {
        const infoCommand = `asdf exec npm info ${packageName} versions`;
        console.log(`Executing: ${infoCommand}`);
        const output = execSync(infoCommand, { encoding: 'utf8' });
        
        // Extract versions from the output
        const versions = output
          .split('\n')
          .filter(line => line.includes('"'))
          .map(line => line.match(/"([^"]+)"/)[1])
          .filter(version => version !== 'latest');

        return {
          success: true,
          versions: versions.length > 0 ? versions : ['latest']
        };
      } catch (error) {
        // Fallback to system npm
        const infoCommand = `npm info ${packageName} versions`;
        console.log(`Executing: ${infoCommand}`);
        const output = execSync(infoCommand, { encoding: 'utf8' });
        
        const versions = output
          .split('\n')
          .filter(line => line.includes('"'))
          .map(line => line.match(/"([^"]+)"/)[1])
          .filter(version => version !== 'latest');

        return {
          success: true,
          versions: versions.length > 0 ? versions : ['latest']
        };
      }
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

      // Try installing with ASDF Node.js first
      try {
        console.log('\n🚀 Attempting installation with ASDF Node.js...');
        const installCommand = `asdf exec npm install -g ${packageName}`;
        console.log(`Executing: ${installCommand}`);
        execSync(installCommand, { stdio: 'inherit' });

        // Run asdf reshim nodejs to ensure executables are properly linked
        try {
          console.log('\n🔄 Running asdf reshim nodejs to update executable links...');
          execSync('asdf reshim nodejs', { stdio: 'inherit' });
        } catch (error) {
          console.log(`⚠️ Note: asdf reshim nodejs failed: ${error.message}`);
        }
      } catch (error) {
        console.log('\n⚠️ ASDF installation failed, falling back to system npm...');
        // Fallback to system npm
        const installCommand = `npm install -g ${packageName}`;
        console.log(`Executing: ${installCommand}`);
        execSync(installCommand, { stdio: 'inherit' });
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
      // Try with ASDF Node.js first
      try {
        execSync(`asdf exec npm install -g ${packageName}@latest`, { stdio: 'inherit' });
      } catch (error) {
        // Fallback to system npm
        execSync(`npm install -g ${packageName}@latest`, { stdio: 'inherit' });
      }
      return true;
    } catch (error) {
      console.log(`Error upgrading package: ${error.message}`);
      return false;
    }
  }

  async uninstall(packageName) {
    try {
      console.log(`Attempting to uninstall ${packageName}...`);
      // Try with ASDF Node.js first
      try {
        execSync(`asdf exec npm uninstall -g ${packageName}`, { stdio: 'inherit' });
      } catch (error) {
        // Fallback to system npm
        execSync(`npm uninstall -g ${packageName}`, { stdio: 'inherit' });
      }
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

      // Fallback to npm list if direct version check fails
      const npmOutput = execSync(`${this.commands.list} ${packageName}`, { encoding: 'utf8' });
      const match = npmOutput.match(/@([\d.]+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = NPMPackageManager; 
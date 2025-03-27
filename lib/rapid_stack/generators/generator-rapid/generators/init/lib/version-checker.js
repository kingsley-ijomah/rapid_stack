const { execSync } = require('child_process');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const os = require('os');

class VersionChecker {
  constructor() {
    // Define minimum version requirements
    this.minVersions = {
      git: '2.49.0',
      ruby: '3.3.0',
      rails: '8.0.0',
      node: '20.0.0',
      npm: '10.0.0',
      docker: '24.0.0',
      doctl: '1.94.0',
      terraform: '1.7.0',
      ionic: '7.0.0',
      angular: '17.0.0',
      mongodb: '6.0.0',
      gh: '2.45.0'
    };

    // Define minimum system requirements
    this.minSystemRequirements = {
      ram: 8, // GB
      diskSpace: 25 // GB
    };

    // Store platform-specific commands
    this.isWindows = process.platform === 'win32';
    this.commands = {
      checkCommand: this.isWindows ? 'where' : 'which',
      versionFlag: this.isWindows ? '/?' : '--version',
      diskSpace: this.isWindows ? 'wmic logicaldisk get size,freespace,caption' : 'df -h /'
    };
  }

  // Helper function to compare versions
  compareVersions(version1, version2) {
    if (version1 === 'N/A' || version2 === 'N/A') return false;
    
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;
      
      if (num1 > num2) return true;
      if (num1 < num2) return false;
    }
    
    return true;
  }

  // Helper function to extract version number from command output
  extractVersion(output, command) {
    if (output === 'N/A') return 'N/A';
    
    // Different commands have different version output formats
    switch (command) {
      case 'git':
        return output.match(/git version ([\d.]+)/)?.[1] || 'N/A';
      case 'ruby':
        return output.match(/ruby ([\d.]+)/)?.[1] || 'N/A';
      case 'rails':
        return output.match(/Rails ([\d.]+)/)?.[1] || 'N/A';
      case 'node':
        return output.match(/v([\d.]+)/)?.[1] || 'N/A';
      case 'docker':
        return output.match(/Docker version ([\d.]+)/)?.[1] || 'N/A';
      case 'doctl':
        return output.match(/doctl version ([\d.]+)/)?.[1] || 'N/A';
      case 'terraform':
        return output.match(/Terraform v([\d.]+)/)?.[1] || 'N/A';
      default:
        return output;
    }
  }

  // Helper function to check if a command exists
  commandExists(command) {
    try {
      if (this.isWindows) {
        // On Windows, 'where' returns 0 if command exists, 1 if not
        execSync(`${this.commands.checkCommand} ${command}`, { stdio: 'ignore' });
        return true;
      } else {
        execSync(`${this.commands.checkCommand} ${command}`, { stdio: 'ignore' });
        return true;
      }
    } catch (e) {
      return false;
    }
  }

  // Helper function to get version of a command
  getCommandVersion(command) {
    try {
      if (!this.commandExists(command)) {
        return 'N/A';
      }

      // Handle Windows-specific version commands
      if (this.isWindows) {
        switch (command) {
          case 'git':
            return execSync('git --version').toString().trim().match(/git version ([\d.]+)/)?.[1] || 'N/A';
          case 'node':
            return execSync('node --version').toString().trim().match(/v([\d.]+)/)?.[1] || 'N/A';
          case 'npm':
            return execSync('npm --version').toString().trim();
          case 'docker':
            return execSync('docker --version').toString().trim().match(/Docker version ([\d.]+)/)?.[1] || 'N/A';
          case 'terraform':
            return execSync('terraform --version').toString().trim().match(/Terraform v([\d.]+)/)?.[1] || 'N/A';
          case 'ruby':
            return execSync('ruby --version').toString().trim().match(/ruby ([\d.]+)/)?.[1] || 'N/A';
          case 'rails':
            return execSync('rails --version').toString().trim().match(/Rails ([\d.]+)/)?.[1] || 'N/A';
          case 'ionic':
            return execSync('ionic --version').toString().trim();
          case 'ng':
            return execSync('ng version').toString().trim().match(/Angular CLI: ([\d.]+)/)?.[1] || 'N/A';
          case 'mongod':
            return execSync('mongod --version').toString().trim().match(/db version v([\d.]+)/)?.[1] || 'N/A';
          default:
            return execSync(`${command} ${this.commands.versionFlag}`).toString().trim();
        }
      } else {
        // Unix-like systems
        const version = execSync(`${command} ${this.commands.versionFlag}`).toString().trim();
        return this.extractVersion(version, command);
      }
    } catch (e) {
      return 'N/A';
    }
  }

  // Helper function to get npm version
  getNpmVersion() {
    try {
      if (!this.commandExists('npm')) {
        return 'N/A';
      }
      const version = execSync('npm --version').toString().trim();
      return version;
    } catch (e) {
      return 'N/A';
    }
  }

  // Helper function to get Docker version
  getDockerVersion() {
    try {
      if (!this.commandExists('docker')) {
        return 'N/A';
      }
      const version = execSync('docker --version').toString().trim();
      return this.extractVersion(version, 'docker');
    } catch (e) {
      return 'N/A';
    }
  }

  // Helper function to get DO CLI version
  getDoVersion() {
    try {
      if (!this.commandExists('doctl')) {
        return 'N/A';
      }
      const version = execSync('doctl version').toString().trim();
      return this.extractVersion(version, 'doctl');
    } catch (e) {
      return 'N/A';
    }
  }

  // Helper function to get Terraform version
  getTerraformVersion() {
    try {
      if (!this.commandExists('terraform')) {
        return 'N/A';
      }
      const version = execSync('terraform --version').toString().trim();
      return this.extractVersion(version, 'terraform');
    } catch (e) {
      return 'N/A';
    }
  }

  // Helper function to get Rails version
  getRailsVersion() {
    try {
      if (!this.commandExists('rails')) {
        return 'N/A';
      }
      const version = execSync('rails --version').toString().trim();
      return this.extractVersion(version, 'rails');
    } catch (e) {
      return 'N/A';
    }
  }

  // Helper function to get RAM size in GB
  getRamSize() {
    const totalRam = os.totalmem();
    return (totalRam / (1024 * 1024 * 1024)).toFixed(1);
  }

  // Helper function to get free disk space in GB
  getFreeDiskSpace() {
    try {
      if (this.isWindows) {
        const output = execSync(this.commands.diskSpace).toString();
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes('C:')) {
            const [, freeSpace] = line.trim().split(/\s+/);
            return (parseInt(freeSpace) / (1024 * 1024 * 1024)).toFixed(1);
          }
        }
      } else {
        // Unix-like systems (macOS and Linux)
        const output = execSync(this.commands.diskSpace).toString();
        const match = output.match(/(\d+)%/);
        if (match) {
          const usedPercent = parseInt(match[1]);
          const totalSpace = parseFloat(output.split('\n')[1].split(/\s+/)[1]);
          return (totalSpace * (100 - usedPercent) / 100).toFixed(1);
        }
      }
      return 'N/A';
    } catch (e) {
      return 'N/A';
    }
  }

  // Function to check system requirements
  checkSystemRequirements() {
    const ram = parseFloat(this.getRamSize());
    const diskSpace = parseFloat(this.getFreeDiskSpace());
    
    return {
      ram: {
        current: ram,
        required: this.minSystemRequirements.ram,
        status: ram >= this.minSystemRequirements.ram ? '✅ OK' : '⚠️ Insufficient'
      },
      diskSpace: {
        current: diskSpace,
        required: this.minSystemRequirements.diskSpace,
        status: diskSpace >= this.minSystemRequirements.diskSpace ? '✅ OK' : '⚠️ Insufficient'
      }
    };
  }

  // Function to check if all requirements are met
  checkRequirements(versions) {
    const missing = [];
    const outdated = [];

    for (const [tool, version] of Object.entries(versions)) {
      if (version === 'N/A') {
        missing.push(tool);
      } else if (!this.compareVersions(version, this.minVersions[tool])) {
        outdated.push(`${tool} (current: ${version}, required: ${this.minVersions[tool]})`);
      }
    }

    return { missing, outdated };
  }

  // Helper function to get GitHub CLI version
  getGitHubCliVersion() {
    try {
      if (!this.commandExists('gh')) {
        return 'N/A';
      }
      const version = execSync('gh --version').toString().trim();
      const match = version.match(/gh version ([\d.]+)/);
      return match ? match[1] : 'N/A';
    } catch (e) {
      return 'N/A';
    }
  }

  // Display version comparison
  displayVersionComparison() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 Version Requirements Check');
    console.log('='.repeat(80));

    // Display system requirements
    console.log('\nSystem Requirements:');
    console.log('-'.repeat(80));
    console.log('Resource       Current        Required       Status');
    console.log('-'.repeat(80));

    const ramStatus = this.checkSystemRequirements().ram.status === '✅ OK' ? '✅ OK' : '❌ Insufficient';
    const diskStatus = this.checkSystemRequirements().diskSpace.status === '✅ OK' ? '✅ OK' : '❌ Insufficient';
    const osStatus = this.isWindows ? '❌ Not Supported' : '✅ OK';
    const osName = this.isWindows ? 'Windows' : 'Unix-like';

    console.log(`RAM            ${this.getRamSize()}           ${this.minSystemRequirements.ram}            ${ramStatus}`);
    console.log(`Disk Space     ${this.getFreeDiskSpace()}          ${this.minSystemRequirements.diskSpace}           ${diskStatus}`);
    console.log(`OS             ${osName.padEnd(12)} Unix-like      ${osStatus}`);
    console.log('-'.repeat(80));

    // Always display tool versions section
    console.log('\nTool Versions:');
    console.log('-'.repeat(80));
    console.log('Tool           Current        Required       Status');
    console.log('-'.repeat(80));

    // Get all versions
    const versions = {
      git: this.getCommandVersion('git'),
      ruby: this.getCommandVersion('ruby'),
      rails: this.getRailsVersion(),
      node: this.getCommandVersion('node'),
      npm: this.getNpmVersion(),
      docker: this.getDockerVersion(),
      doctl: this.getDoVersion(),
      terraform: this.getTerraformVersion(),
      ionic: this.getIonicVersion(),
      angular: this.getAngularVersion(),
      mongodb: this.getMongoVersion(),
      gh: this.getGitHubCliVersion()
    };

    // Check each tool version
    const issues = {
      missing: [],
      outdated: []
    };

    for (const [tool, version] of Object.entries(versions)) {
      const minVersion = this.minVersions[tool];
      let status = '✅ OK';
      
      if (version === 'N/A') {
        status = '❌ Not Installed';
        issues.missing.push(tool);
      } else if (!this.compareVersions(version, minVersion)) {
        status = '⚠️ Outdated';
        issues.outdated.push(tool);
      }

      // Pad the tool name to ensure alignment
      const paddedTool = tool.padEnd(12);
      console.log(`${paddedTool} ${version.padEnd(12)} ${minVersion.padEnd(12)} ${status}`);
    }

    console.log('-'.repeat(80));

    // Display issues if any
    if (issues.missing.length > 0 || issues.outdated.length > 0 || this.isWindows) {
      console.log('\n⚠️ Issues Found:');
      if (this.isWindows) {
        console.log('\nOperating System:');
        console.log('   - Windows is not supported. Please use a Unix-like system (macOS, Linux, or WSL)');
      }
      if (issues.missing.length > 0) {
        console.log('\nMissing Tools:');
        issues.missing.forEach(tool => {
          console.log(`   - ${tool}`);
        });
      }
      if (issues.outdated.length > 0) {
        console.log('\nOutdated Tools:');
        issues.outdated.forEach(tool => {
          console.log(`   - ${tool} (current: ${versions[tool]}, required: ${this.minVersions[tool]})`);
        });
      }
    } else {
      console.log('\n✅ All requirements met!');
    }

    console.log('\n' + '='.repeat(80));
    return issues;
  }

  // Helper function to get Ionic version
  getIonicVersion() {
    try {
      if (!this.commandExists('ionic')) {
        return 'N/A';
      }
      const version = execSync('ionic --version').toString().trim();
      return version;
    } catch (e) {
      return 'N/A';
    }
  }

  // Helper function to get Angular version
  getAngularVersion() {
    try {
      if (!this.commandExists('ng')) {
        return 'N/A';
      }
      const version = execSync('ng version').toString().trim();
      const match = version.match(/Angular CLI: ([\d.]+)/);
      return match ? match[1] : 'N/A';
    } catch (e) {
      return 'N/A';
    }
  }

  // Helper function to get MongoDB version
  getMongoVersion() {
    try {
      if (!this.commandExists('mongod')) {
        return 'N/A';
      }
      const version = execSync('mongod --version').toString().trim();
      const match = version.match(/db version v([\d.]+)/);
      return match ? match[1] : 'N/A';
    } catch (e) {
      return 'N/A';
    }
  }

  // Function to update requirements.yml
  updateRequirementsFile(rapidStackDir) {
    // Get all versions
    const versions = {
      git: this.getCommandVersion('git'),
      ruby: this.getCommandVersion('ruby'),
      rails: this.getRailsVersion(),
      node: this.getCommandVersion('node'),
      npm: this.getNpmVersion(),
      docker: this.getDockerVersion(),
      doctl: this.getDoVersion(),
      terraform: this.getTerraformVersion(),
      ionic: this.getIonicVersion(),
      angular: this.getAngularVersion(),
      mongodb: this.getMongoVersion(),
      gh: this.getGitHubCliVersion()
    };

    // Get system requirements
    const systemRequirements = this.checkSystemRequirements();
    
    // Create requirements object
    const requirements = {
      versions,
      minimum_versions: this.minVersions,
      system_requirements: {
        ram: systemRequirements.ram,
        disk_space: systemRequirements.diskSpace
      },
      status: this.checkRequirements(versions)
    };

    // Create requirements.yml file
    const requirementsPath = path.join(rapidStackDir, 'requirements.yml');
    const yamlContent = yaml.dump(requirements, { lineWidth: -1 });
    
    fs.writeFileSync(requirementsPath, yamlContent);

    // Return both the path and the versions for display
    return {
      path: requirementsPath,
      status: requirements.status,
      versions: versions // Make sure we return the versions object
    };
  }
}

module.exports = VersionChecker; 
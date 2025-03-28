const { execSync } = require('child_process');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const os = require('os');
const packages = require('./packages');

class VersionChecker {
  constructor() {
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
      case 'gh':
        return output.match(/gh version ([\d.]+)/)?.[1] || 'N/A';
      case 'mongod':
        return output.match(/db version v([\d.]+)/)?.[1] || 'N/A';
      case 'ansible':
        // Extract version from ansible's verbose output
        const match = output.match(/ansible \[core ([\d.]+)\]/);
        return match ? match[1] : 'N/A';
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

      let version;
      switch (command) {
        case 'doctl':
          version = execSync('doctl version').toString().trim();
          break;
        case 'gh':
          version = execSync('gh --version').toString().trim();
          break;
        case 'mongod':
          version = execSync('mongod --version').toString().trim();
          // Extract just the version number from MongoDB's output
          const match = version.match(/db version v([\d.]+)/);
          return match ? match[1] : 'N/A';
        case 'ansible':
          version = execSync('ansible --version').toString().trim();
          break;
        default:
          version = execSync(`${command} ${this.commands.versionFlag}`).toString().trim();
      }

      return this.extractVersion(version, command);
    } catch (e) {
      return 'N/A';
    }
  }

  // Helper function to show progress
  showProgress(current, total, tool) {
    const percentage = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
    process.stdout.write(`\rChecking ${tool}... [${progressBar}] ${percentage}%`);
  }

  // Display version comparison
  displayVersionComparison() {
    console.log('\n🔍 Checking Tool Versions...\n');
    
    const versions = {};
    const totalTools = Object.keys(packages).length;
    let currentTool = 0;

    // Check each tool version with progress
    for (const [tool, packageInfo] of Object.entries(packages)) {
      currentTool++;
      this.showProgress(currentTool, totalTools, tool);
      
      versions[tool] = this.getCommandVersion(packageInfo.command);
    }

    // Clear the progress line
    process.stdout.write('\r' + ' '.repeat(100) + '\r');

    // Display system requirements
    console.log('\n📊 System Requirements:');
    console.log('--------------------------------------------------------------------------------');
    console.log('Resource       Current        Required       Status');
    console.log('--------------------------------------------------------------------------------');
    
    const systemRequirements = this.checkSystemRequirements();
    console.log(`RAM            ${systemRequirements.ram.current}            ${systemRequirements.ram.required}           ${systemRequirements.ram.status}`);
    console.log(`Disk Space     ${systemRequirements.diskSpace.current}            ${systemRequirements.diskSpace.required}           ${systemRequirements.diskSpace.status}`);
    console.log(`OS             Unix-like      Unix-like      ✅ OK`);
    console.log('--------------------------------------------------------------------------------');

    // Display tool versions
    console.log('\n🛠️  Tool Versions:');
    console.log('--------------------------------------------------------------------------------');
    console.log('Tool           Current        Required       Status');
    console.log('--------------------------------------------------------------------------------');

    const issues = {
      missing: [],
      outdated: []
    };

    for (const [tool, version] of Object.entries(versions)) {
      const packageInfo = packages[tool];
      const minVersion = packageInfo.minVersion;
      const status = version === 'N/A' 
        ? '❌ Missing' 
        : this.compareVersions(version, minVersion) 
          ? '✅ OK' 
          : '⚠️ Outdated';
      
      console.log(`${tool.padEnd(12)} ${version.padEnd(12)} ${minVersion.padEnd(12)} ${status}`);

      if (version === 'N/A') {
        issues.missing.push(tool);
      } else if (!this.compareVersions(version, minVersion)) {
        issues.outdated.push(tool);
      }
    }

    console.log('--------------------------------------------------------------------------------');

    // Display issues if any
    if (issues.missing.length > 0 || issues.outdated.length > 0) {
      console.log('\n⚠️ Issues Found:');
      if (issues.missing.length > 0) {
        console.log(`Missing tools: ${issues.missing.join(', ')}`);
      }
      if (issues.outdated.length > 0) {
        console.log(`Outdated tools: ${issues.outdated.join(', ')}`);
      }
    }

    return issues;
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
      const packageInfo = packages[tool];
      if (version === 'N/A') {
        missing.push(tool);
      } else if (!this.compareVersions(version, packageInfo.minVersion)) {
        outdated.push(`${tool} (current: ${version}, required: ${packageInfo.minVersion})`);
      }
    }

    return { missing, outdated };
  }

  // Function to update requirements.yml
  updateRequirementsFile(rapidStackDir) {
    // Get all versions
    const versions = {};
    for (const [tool, packageInfo] of Object.entries(packages)) {
      versions[tool] = this.getCommandVersion(packageInfo.command);
    }

    // Get system requirements
    const systemRequirements = this.checkSystemRequirements();
    
    // Create requirements object
    const requirements = {
      versions,
      minimum_versions: Object.fromEntries(
        Object.entries(packages).map(([tool, info]) => [tool, info.minVersion])
      ),
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
      versions: versions
    };
  }
}

module.exports = VersionChecker; 
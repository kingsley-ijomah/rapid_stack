const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class ShellManager {
  constructor() {
    this.shell = process.env.SHELL || '/bin/bash';
    this.homeDir = os.homedir();
    this.shellConfigFile = this.getShellConfigFile();
  }

  // Get the appropriate shell config file based on the user's shell
  getShellConfigFile() {
    const shellName = path.basename(this.shell);
    switch (shellName) {
      case 'zsh':
        return path.join(this.homeDir, '.zshrc');
      case 'bash':
        return path.join(this.homeDir, '.bashrc');
      default:
        return path.join(this.homeDir, `.${shellName}rc`);
    }
  }

  // Check if the shell config file exists
  configFileExists() {
    return fs.existsSync(this.shellConfigFile);
  }

  // Read the current content of the shell config file
  readConfigFile() {
    if (!this.configFileExists()) {
      return '';
    }
    return fs.readFileSync(this.shellConfigFile, 'utf8');
  }

  // Helper method to update PATH in shell config
  async updatePathInConfig(newPaths) {
    try {
      if (!this.configFileExists()) {
        console.log('[DEBUG] Config file does not exist');
        return false;
      }
  
      let content = this.readConfigFile();
  
      let lines = content.split('\n');
      let activePathIndex = -1;
      let newPathLine = '';
  
      // Look for an active (non-commented) PATH line.
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('export PATH=')) {
          activePathIndex = i;
          let currentValue = trimmed.split('=')[1].replace(/"/g, '');
          let parts = currentValue.split(':');
          // Check if any part contains a '$' and is not exactly "$PATH"
          const hasExtraVariables = parts.some(p => p.includes('$') && p.trim() !== '$PATH');
          if (hasExtraVariables) {
            // Remove this unsuitable line entirely.
            lines.splice(i, 1);
            activePathIndex = -1; // Force insertion of a new PATH line
            newPathLine = `export PATH="${newPaths.join(':')}:$PATH"`;
            break;
          } else {
            // Clean PATH line; update it by filtering out any duplicate paths and prepending them.
            parts = parts.filter(p => !newPaths.includes(p));
            newPathLine = `export PATH="${newPaths.join(':')}:${parts.join(':')}"`;
            break;
          }
        }
      }
  
      // If no active PATH line was found, insert a new one.
      if (activePathIndex === -1) {
        newPathLine = newPathLine || `export PATH="${newPaths.join(':')}:$PATH"`;
        const firstExportIndex = lines.findIndex(line => {
          const t = line.trim();
          return t.startsWith('export ') && !t.startsWith('#');
        });
        if (firstExportIndex !== -1) {
          lines.splice(firstExportIndex, 0, newPathLine);
        } else {
          lines.unshift(newPathLine);
        }
      } else {
        // Otherwise, update the found PATH line.
        lines[activePathIndex] = newPathLine;
      }
  
      const updatedContent = lines.join('\n') + '\n';
      fs.writeFileSync(this.shellConfigFile, updatedContent);
      return true;
    } catch (error) {
      console.error('[DEBUG] Error updating shell configuration:', error.message);
      return false;
    }
  }

  // Add Homebrew paths to the beginning of the PATH
  async addHomebrewPaths() {
    const homebrewPaths = ['/opt/homebrew/bin', '/opt/homebrew/sbin'];
    return this.updatePathInConfig(homebrewPaths);
  }

  // Add Nix paths to the beginning of the PATH
  async addNixPaths() {
    const nixPaths = [
      `${this.homeDir}/.nix-profile/bin`,
      `${this.homeDir}/.nix-profile/sbin`
    ];
    return this.updatePathInConfig(nixPaths);
  }

  // Add ASDF paths to the beginning of the PATH
  async addASDFPaths() {
    const asdfPaths = [
      `${this.homeDir}/.asdf/shims`,
      `${this.homeDir}/.asdf/bin`
    ];
    return this.updatePathInConfig(asdfPaths);
  }

  // Add ASDF shell completions
  async addASDFCompletions() {
    try {
      const content = fs.readFileSync(this.shellConfigFile, 'utf8');
      const lines = content.split('\n');

      // Check if ASDF completions are already added
      if (lines.some(line => line.includes('asdf.sh'))) {
        return true;
      }

      // Add ASDF completions based on platform
      const platform = process.platform;
      if (platform !== 'darwin' && platform !== 'linux') {
        console.error('[DEBUG] ASDF is not supported on this platform');
        return false;
      }

      let asdfCompletionLine;
      if (platform === 'darwin') {
        // macOS: Use Homebrew's asdf.sh
        asdfCompletionLine = '. $(brew --prefix asdf)/libexec/asdf.sh';
      } else {
        // Linux: Use the system-wide asdf.sh
        asdfCompletionLine = '. /opt/asdf-vm/asdf.sh';
      }

      if (asdfCompletionLine) {
        lines.push(asdfCompletionLine);
        fs.writeFileSync(this.shellConfigFile, lines.join('\n') + '\n');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[DEBUG] Error adding ASDF completions:', error.message);
      return false;
    }
  }
  
  // Reload the shell configuration
  async reloadConfig() {
    console.log('\nShell configuration has been updated.');
    console.log('Please run the following command to apply the changes:');
    
    const shellName = path.basename(this.shell);
    const sourceCommand = shellName === 'zsh' ? 'source ~/.zshrc' : 
                         shellName === 'bash' ? 'source ~/.bashrc' : 
                         `source ~/.${shellName}rc`;
    
    console.log(`\n  ${sourceCommand}\n`);
    return true;
  }
}

module.exports = ShellManager; 
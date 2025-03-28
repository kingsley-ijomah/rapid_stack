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

  // Add Homebrew paths to the beginning of the PATH
  async addHomebrewPaths() {
    try {
      console.log(`\n[DEBUG] Configuring Homebrew paths in ${this.shellConfigFile}...`);
  
      if (!this.configFileExists()) {
        console.log('[DEBUG] Config file does not exist');
        return false;
      }
  
      let content = this.readConfigFile();
      console.log('[DEBUG] Current file content:', content ? content : 'File is empty');
  
      const homebrewPaths = ['/opt/homebrew/bin', '/opt/homebrew/sbin'];
      let lines = content.split('\n');
      let activePathIndex = -1;
      let newPathLine = '';
  
      // Look for an active (non-commented) PATH line.
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        console.log(`[DEBUG] Examining line ${i}: "${trimmed}"`);
        if (trimmed.startsWith('export PATH=')) {
          activePathIndex = i;
          let currentValue = trimmed.split('=')[1].replace(/"/g, '');
          console.log(`[DEBUG] Found PATH value: "${currentValue}"`);
          let parts = currentValue.split(':');
          console.log(`[DEBUG] PATH parts: ${JSON.stringify(parts)}`);
          // Check if any part contains a '$' and is not exactly "$PATH"
          const hasExtraVariables = parts.some(p => p.includes('$') && p.trim() !== '$PATH');
          console.log(`[DEBUG] hasExtraVariables: ${hasExtraVariables}`);
          if (hasExtraVariables) {
            // Remove this unsuitable line entirely.
            console.log(`[DEBUG] Extra variables detected. Removing line ${i}.`);
            lines.splice(i, 1);
            activePathIndex = -1; // Force insertion of a new PATH line
            newPathLine = `export PATH="${homebrewPaths.join(':')}:$PATH"`;
            break;
          } else {
            // Clean PATH line; update it by filtering out any duplicate Homebrew paths and prepending them.
            parts = parts.filter(p => !homebrewPaths.includes(p));
            newPathLine = `export PATH="${homebrewPaths.join(':')}:${parts.join(':')}"`;
            console.log(`[DEBUG] Clean PATH line detected. New PATH line: "${newPathLine}"`);
            break;
          }
        }
      }
  
      // If no active PATH line was found, insert a new one.
      if (activePathIndex === -1) {
        newPathLine = newPathLine || `export PATH="${homebrewPaths.join(':')}:$PATH"`;
        console.log(`[DEBUG] No active PATH line found. Inserting new PATH line: "${newPathLine}"`);
        const firstExportIndex = lines.findIndex(line => {
          const t = line.trim();
          return t.startsWith('export ') && !t.startsWith('#');
        });
        console.log(`[DEBUG] First export statement index: ${firstExportIndex}`);
        if (firstExportIndex !== -1) {
          lines.splice(firstExportIndex, 0, newPathLine);
        } else {
          lines.unshift(newPathLine);
        }
      } else {
        // Otherwise, update the found PATH line.
        console.log(`[DEBUG] Updating active PATH line at index ${activePathIndex} with "${newPathLine}"`);
        lines[activePathIndex] = newPathLine;
      }
  
      const updatedContent = lines.join('\n') + '\n';
      console.log('[DEBUG] Updated file content:\n', updatedContent);
      fs.writeFileSync(this.shellConfigFile, updatedContent);
      console.log('[DEBUG] Successfully updated shell configuration');
      return true;
    } catch (error) {
      console.error('[DEBUG] Error updating shell configuration:', error.message);
      return false;
    }
  }
  
  
  // Reload the shell configuration
  async reloadConfig() {
    console.log('\nShell configuration has been updated.');
    console.log('Please run the following command to apply the changes:');
    console.log('\n  source ~/.zshrc\n');
    return true;
  }
}

module.exports = ShellManager; 
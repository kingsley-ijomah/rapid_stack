const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Skip the check for the init generator
    if (this.options.namespace === 'rapid:init') {
      return;
    }

    // Check for .rapidrc
    const currentDir = process.cwd();
    const rapidrcPath = path.join(currentDir, '.rapidrc');
    
    if (!fs.existsSync(rapidrcPath)) {
      console.log('\n' + '='.repeat(80));
      console.log('❌ Not a Rapid Stack Project!');
      console.log('='.repeat(80));
      console.log('\nThis directory is not a Rapid Stack project.');
      console.log('\nChange into project root outside of frontend, backend, devops etc.');
      console.log('or run "rapid init" first to initialize a new project.');
      console.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }
  }
}; 
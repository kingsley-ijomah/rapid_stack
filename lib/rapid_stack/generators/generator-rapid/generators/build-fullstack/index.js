const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add debug option
    this.option('debug', {
      desc: 'Enable debug mode',
      type: Boolean,
      default: false
    });
  }

  async writing() {
    this.log('Creating frontend...');
    try {
      execSync('rapid build:frontend --yes', { stdio: 'inherit' });
      this.log('✓ Frontend created successfully');
    } catch (error) {
      this.log.error('Failed to create frontend:', error);
      process.exit(1);
    }

    this.log('\nCreating backend...');
    try {
      execSync('rapid build:backend --yes', { stdio: 'inherit' });
      this.log('✓ Backend created successfully');
    } catch (error) {
      this.log.error('Failed to create backend:', error);
      process.exit(1);
    }

    this.log('\n✓ Fullstack application created successfully!');
  }

  _debugLog(message) {
    if (this.options.debug) {
      this.log(message);
    }
  }
}; 
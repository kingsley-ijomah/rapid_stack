'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const BaseGenerator = require('../base');

module.exports = class extends BaseGenerator {
  constructor(args, opts) {
    super(args, opts);
    this.originalDir = process.cwd();
  }

  async initializing() {
    // Check if frontend and backend directories exist
    const frontendDir = path.join(this.originalDir, 'frontend');
    const backendDir = path.join(this.originalDir, 'backend');

    if (!fs.existsSync(frontendDir)) {
      this.log('\n' + '='.repeat(80));
      this.log('❌ Frontend directory not found!');
      this.log('='.repeat(80));
      this.log('\nPlease run "rapid build:frontend" first to create the frontend directory.');
      this.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }

    if (!fs.existsSync(backendDir)) {
      this.log('\n' + '='.repeat(80));
      this.log('❌ Backend directory not found!');
      this.log('='.repeat(80));
      this.log('\nPlease run "rapid build:backend" first to create the backend directory.');
      this.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }
  }

  async prompting() {
    // Ask if user wants to start both servers
    const answers = await this.prompt([
      {
        type: 'confirm',
        name: 'startServers',
        message: 'Would you like to start both frontend and backend servers?',
        default: true
      }
    ]);

    if (!answers.startServers) {
      this.log('\nExiting without starting servers...\n');
      process.exit(0);
    }
  }

  async install() {
    try {
      // Start backend server
      this.log('\nStarting backend server...');
      const backendDir = path.join(this.originalDir, 'backend');
      const backendProcess = spawn('rails', ['s'], {
        cwd: backendDir,
        stdio: 'inherit',
        shell: true
      });

      // Start frontend server
      this.log('\nStarting frontend server...');
      const frontendDir = path.join(this.originalDir, 'frontend');
      const frontendProcess = spawn('ionic', ['s'], {
        cwd: frontendDir,
        stdio: 'inherit',
        shell: true
      });

      // Handle process termination
      process.on('SIGINT', () => {
        backendProcess.kill();
        frontendProcess.kill();
        process.exit(0);
      });

      // Wait for both processes to exit
      await Promise.all([
        new Promise((resolve) => backendProcess.on('exit', resolve)),
        new Promise((resolve) => frontendProcess.on('exit', resolve))
      ]);
    } catch (error) {
      this.log('\n❌ Error starting servers:');
      this.log(error.message);
      process.exit(1);
    }
  }
}; 
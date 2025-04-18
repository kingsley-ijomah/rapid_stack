'use strict';
const { execSync } = require('child_process');
const BaseGenerator = require('../base');
const path = require('path');
const fs = require('fs');

module.exports = class extends BaseGenerator {
  constructor(args, opts) {
    super(args, opts);
  }

  async initializing() {
    this.log('\n' + '='.repeat(80));
    this.log('📱 iOS Project Setup');
    this.log('='.repeat(80));

    // Check if frontend directory exists
    const frontendDir = path.join(process.cwd(), 'frontend');
    if (!fs.existsSync(frontendDir)) {
      this.log('\n❌ Frontend directory not found!');
      this.log('='.repeat(80));
      this.log('\nPlease ensure you have generated a frontend project and it is in the current directory.');
      this.log('\nTo generate a frontend project, run:');
      this.log('  rapid build:frontend');
      this.log('\nAfter generating the frontend project, run this command again.');
      this.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }

    // Check for Xcode installation
    try {
      execSync('xcode-select -p', { stdio: 'ignore' });
      const xcodeVersion = execSync('xcodebuild -version', { encoding: 'utf8' }).trim();
      this.log(`\n✓ Xcode is installed: ${xcodeVersion}`);
    } catch (error) {
      this.log('\n❌ Xcode is not installed or not properly configured!');
      
      const installAnswer = await this.prompt([
        {
          type: 'confirm',
          name: 'installXcode',
          message: 'Would you like to install Xcode now?',
          default: true
        }
      ]);

      if (installAnswer.installXcode) {
        this.log('\n⚠️  Xcode must be installed from the Mac App Store.');
        this.log('Please follow these steps:');
        this.log('1. Open the Mac App Store');
        this.log('2. Search for "Xcode"');
        this.log('3. Click "Get" to download and install');
        this.log('4. After installation, open Xcode once to accept the license agreement');
        this.log('5. Run this command again');
        this.log('\n' + '='.repeat(80) + '\n');
        process.exit(1);
      } else {
        this.log('\n⚠️  Xcode installation skipped.');
        this.log('Please install Xcode manually and run this command again.');
        this.log('\n' + '='.repeat(80) + '\n');
        process.exit(1);
      }
    }

    // Check for Command Line Tools
    try {
      execSync('xcode-select --install', { stdio: 'ignore' });
      this.log('\n⚠️  Xcode Command Line Tools are not installed!');
      
      const installAnswer = await this.prompt([
        {
          type: 'confirm',
          name: 'installCLT',
          message: 'Would you like to install Xcode Command Line Tools now?',
          default: true
        }
      ]);

      if (installAnswer.installCLT) {
        this.log('\nInstalling Command Line Tools...');
        this.log('A dialog will appear. Click "Install" to continue.');
        execSync('xcode-select --install', { stdio: 'inherit' });
        this.log('\nAfter installation completes, run this command again.');
        this.log('\n' + '='.repeat(80) + '\n');
        process.exit(1);
      } else {
        this.log('\n⚠️  Command Line Tools installation skipped.');
        this.log('Please install Command Line Tools manually and run this command again.');
        this.log('\n' + '='.repeat(80) + '\n');
        process.exit(1);
      }
    } catch (error) {
      // If the command fails, it means CLT is already installed
      this.log('\n✓ Xcode Command Line Tools are installed');
    }

    // Check if CocoaPods is installed
    try {
      const podVersion = execSync('pod --version', { encoding: 'utf8' }).trim();
      this.log(`\n✓ CocoaPods ${podVersion} is installed`);
    } catch (error) {
      this.log('\n❌ CocoaPods is not installed!');
      
      const installAnswer = await this.prompt([
        {
          type: 'confirm',
          name: 'installCocoaPods',
          message: 'Would you like to install CocoaPods now?',
          default: true
        }
      ]);

      if (installAnswer.installCocoaPods) {
        this.log('\nInstalling CocoaPods...');
        try {
          execSync('sudo gem install cocoapods', { stdio: 'inherit' });
          this.log('\n✓ CocoaPods installed successfully!');
        } catch (installError) {
          this.log('\n❌ Failed to install CocoaPods:');
          this.log(installError.message);
          this.log('\nPlease try installing manually:');
          this.log('  sudo gem install cocoapods');
          this.log('\nAfter installation, run this command again.');
          this.log('\n' + '='.repeat(80) + '\n');
          process.exit(1);
        }
      } else {
        this.log('\n⚠️  CocoaPods installation skipped.');
        this.log('Please install CocoaPods manually and run this command again.');
        this.log('\n' + '='.repeat(80) + '\n');
        process.exit(1);
      }
    }
  }

  async prompting() {
    // Placeholder for future prompts
    this.log('\n🚧 iOS generator is under development');
    this.log('More features will be added soon!');
  }

  async install() {
    this.log('\n' + '='.repeat(80));
    this.log('🛠️  Setting up iOS project');
    this.log('='.repeat(80));

    // Store the original directory
    const originalDir = process.cwd();
    const frontendDir = path.join(originalDir, 'frontend');

    try {
      // Check if frontend directory exists
      if (!fs.existsSync(frontendDir)) {
        throw new Error('Frontend directory not found. Please run this command from the root of your Rapid Stack project.');
      }

      // Change to frontend directory
      process.chdir(frontendDir);
      this.log(`\n📁 Working in: ${frontendDir}`);

      // Remove existing ios directory
      this.log('\n🗑️  Removing existing iOS directory...');
      execSync('rm -rf ios', { stdio: 'inherit' });
      this.log('✓ iOS directory removed');

      // Add iOS platform
      this.log('\n📱 Adding iOS platform...');
      execSync('npx cap add ios', { stdio: 'inherit' });
      this.log('✓ iOS platform added');

      // Build the project
      this.log('\n🏗️  Building project...');
      execSync('npm run build', { stdio: 'inherit' });
      this.log('✓ Project built successfully');

      // Sync iOS project
      this.log('\n🔄 Syncing iOS project...');
      execSync('npx cap sync ios', { stdio: 'inherit' });
      this.log('✓ iOS project synced');

      // Return to original directory
      process.chdir(originalDir);

      this.log('\n' + '='.repeat(80));
      this.log('🎉 iOS setup completed successfully!');
      this.log('='.repeat(80));

      // Ask if user wants to open the project in Xcode
      const openAnswer = await this.prompt([
        {
          type: 'confirm',
          name: 'openXcode',
          message: 'Would you like to open the project in Xcode now?',
          default: true
        }
      ]);

      if (openAnswer.openXcode) {
        await this._openXcodeProject(frontendDir);
      } else {
        this.log('\nNext steps:');
        this.log('\n1. Configure your signing certificates in Xcode');
        this.log('2. Build and run your app');
      }
      this.log('\n' + '='.repeat(80) + '\n');
    } catch (error) {
      // Ensure we return to original directory even if there's an error
      process.chdir(originalDir);

      this.log('\n' + '='.repeat(80));
      this.log('❌ Error setting up iOS project:');
      this.log('='.repeat(80));
      this.log('\nError details:');
      this.log(error.message);
      this.log('\nPlease check the error above and try again.');
      this.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }
  }

  async _openXcodeProject(frontendDir) {
    try {
      this.log('\n🚀 Opening project in Xcode...');
      process.chdir(frontendDir);
      execSync('npx cap open ios', { stdio: 'inherit' });
      this.log('✓ Project opened in Xcode');
    } catch (error) {
      this.log('\n⚠️  Could not open project in Xcode:');
      this.log(error.message);
      this.log('\nYou can try opening it manually with:');
      this.log('  npx cap open ios');
    }
  }
}; 
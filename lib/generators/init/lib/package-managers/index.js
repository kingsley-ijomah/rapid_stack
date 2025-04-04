const os = require('os');
const BrewPackageManager = require('./brew');
const NixPackageManager = require('./nix');
const ASDFPackageManager = require('./asdf');
const GemPackageManager = require('./gem');
const NPMPackageManager = require('./npm');

class PackageManagerFactory {
  static getManager(packageInfo) {
    const platform = os.platform();
    const managerType = packageInfo.packageManager[platform];

    switch (managerType) {
      case 'brew':
        return new BrewPackageManager();
      case 'nix':
        return new NixPackageManager();
      case 'asdf':
        return new ASDFPackageManager();
      case 'gem':
        return new GemPackageManager();
      case 'npm':
        return new NPMPackageManager();
      // Add other package managers here as they are implemented
      default:
        throw new Error(`Unsupported package manager: ${managerType} for platform: ${platform}`);
    }
  }
}

module.exports = PackageManagerFactory; 
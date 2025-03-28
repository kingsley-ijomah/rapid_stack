const os = require('os');
const BrewPackageManager = require('./brew');
const NixPackageManager = require('./nix');

class PackageManagerFactory {
  static getManager(packageInfo) {
    const platform = os.platform();
    const managerType = packageInfo.packageManager[platform];

    switch (managerType) {
      case 'brew':
        return new BrewPackageManager();
      case 'nix':
        return new NixPackageManager();
      // Add other package managers here as they are implemented
      default:
        throw new Error(`Unsupported package manager: ${managerType} for platform: ${platform}`);
    }
  }
}

module.exports = PackageManagerFactory; 
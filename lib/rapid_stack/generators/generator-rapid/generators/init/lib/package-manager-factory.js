const BrewPackageManager = require('./package-managers/brew');
const NixPackageManager = require('./package-managers/nix');

class PackageManagerFactory {
  static getManager(packageInfo) {
    const platform = process.platform;
    const packageManager = packageInfo.packageManager[platform];

    switch (packageManager) {
      case 'brew':
        return new BrewPackageManager();
      case 'nix':
        return new NixPackageManager();
      // Add other package managers here as needed
      default:
        throw new Error(`Unsupported package manager: ${packageManager}`);
    }
  }
}

module.exports = PackageManagerFactory; 
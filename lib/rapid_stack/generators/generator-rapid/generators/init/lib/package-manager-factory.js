const BrewPackageManager = require('./package-managers/brew');

class PackageManagerFactory {
  static getManager(packageInfo) {
    const platform = process.platform;
    const packageManager = packageInfo.packageManager[platform];

    switch (packageManager) {
      case 'brew':
        return new BrewPackageManager();
      // Add other package managers here as needed
      default:
        throw new Error(`Unsupported package manager: ${packageManager}`);
    }
  }
}

module.exports = PackageManagerFactory; 
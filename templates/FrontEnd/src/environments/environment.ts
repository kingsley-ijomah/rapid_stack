// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  appName: 'Dog Walker',
  supportEmail: 'support@dogwalker.com',
  companyInfo: {
    year: new Date().getFullYear(),
    website: 'dogwalker.com',
    socialLinks: {
      facebook: 'https://facebook.com/dogwalker',
      twitter: 'https://twitter.com/dogwalker',
      instagram: 'https://instagram.com/dogwalker'
    }
  },
  assetPaths: {
    heroImage: 'assets/images/dog-walking-hero.jpg'
  },
  backendEndpoint: 'http://127.0.0.1:3000/graphql',
  // generated with: openssl rand -hex 32
  encryptionKey: 'bd4ddd18c1849b59f8f49d1a8a31d13f4d7b891169a288aefd098d0882ee7075',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

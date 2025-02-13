export const environment = {
  production: true,
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
  backendEndpoint: '/graphql',
  // generated with: openssl rand -hex 32
  encryptionKey: 'bd4ddd18c1849b59f8f49d1a8a31d13f4d7b891169a288aefd098d0882ee7075',
};

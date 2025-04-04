const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const { handlePrompt } = require('../../lib/utils');

// Icon mapping for common page names (using standard Ionicons names)
const PAGE_ICON_MAP = {
  home: 'home',
  about: 'information-circle',
  contact: 'call',
  profile: 'person',
  settings: 'settings',
  search: 'search',
  notifications: 'notifications',
  messages: 'mail',
  chat: 'chatbubbles',
  dashboard: 'grid',
  calendar: 'calendar',
  work: 'briefcase',
  projects: 'folder',
  tasks: 'list',
  users: 'people',
  team: 'people-circle',
  blog: 'newspaper',
  gallery: 'images',
  photos: 'camera',
  videos: 'videocam',
  music: 'musical-notes',
  shop: 'cart',
  store: 'cart',
  products: 'pricetag',
  orders: 'receipt',
  favorites: 'heart',
  bookmarks: 'bookmark',
  location: 'location',
  map: 'map',
  help: 'help-circle',
  support: 'help-buoy',
  feedback: 'chatbox',
  stats: 'stats-chart',
  analytics: 'bar-chart',
  reports: 'document-text',
  documents: 'document',
  files: 'folder',
  upload: 'cloud-upload',
  download: 'cloud-download',
  share: 'share',
  social: 'share-social',
  login: 'log-in',
  logout: 'log-out',
  register: 'person-add',
  admin: 'shield',
  security: 'lock-closed',
  dance: 'musical-notes',
  fitness: 'fitness',
  sports: 'basketball',
  games: 'game-controller',
  default: 'apps'
};

module.exports = class extends Generator {
  _toKebabCase(str) {
    return str
      // Convert camelCase to kebab-case
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      // Replace any non-alphanumeric characters with hyphens
      .replace(/[^a-zA-Z0-9]+/g, '-')
      // Convert to lowercase
      .toLowerCase()
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '');
  }

  _toCamelCase(str) {
    // First convert to kebab case (handle spaces, underscores, etc)
    const kebabCase = str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
    
    // Then ensure first character is lowercase
    return kebabCase.charAt(0).toLowerCase() + kebabCase.slice(1);
  }

  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Prompting
  async prompting() {
    this.answers = await handlePrompt(this, [
      {
        type: 'confirm',
        name: 'isTabSection',
        message: 'Do you want to create a new tab section?',
        default: true
      },
      {
        type: 'input',
        name: 'sectionName',
        message: 'What is the name of your section?',
        when: (answers) => answers.isTabSection,
        default: 'my-section',
        filter: (input) => this._toCamelCase(input)
      },
      {
        type: 'input',
        name: 'pages',
        message: 'Enter page names (comma separated, e.g.: home,about,contact):',
        when: (answers) => answers.isTabSection,
        default: 'home,about,contact',
        filter: (input) => {
          // Ensure input is a string and convert to array
          const pagesStr = String(input);
          return pagesStr
            .split(',')
            .map(page => this._toCamelCase(page.trim()))
            .filter(page => page);
        }
      },
      {
        type: 'list',
        name: 'role',
        message: 'Select the role required for this section:',
        when: (answers) => answers.isTabSection,
        choices: ['none', 'user', 'admin', 'guest'],
        default: 'none'
      }
    ]);

    // Ensure pages is always an array
    if (this.answers.pages) {
      this.answers.pages = Array.isArray(this.answers.pages) 
        ? this.answers.pages 
        : String(this.answers.pages)
            .split(',')
            .map(page => this._toCamelCase(page.trim()))
            .filter(page => page);
    }
  }

  // Writing
  writing() {
    if (!this.answers.isTabSection) {
      return;
    }

    // Ensure pages is an array before proceeding
    if (!Array.isArray(this.answers.pages)) {
      this.log.error('Invalid pages format. Expected an array of page names.');
      return;
    }

    const templateData = {
      sectionName: this.answers.sectionName,
      className: this._capitalize(this.answers.sectionName),
      pages: this.answers.pages,
      pageClasses: this.answers.pages.map(page => this._capitalize(page) + 'Page'),
      _capitalize: this._capitalize,
      role: this.answers.role
    };

    const basePath = path.join('frontend/src/app/platforms', this.answers.sectionName);

    // Create the main component files with icons
    this._createMainComponentWithIcons(basePath, templateData);
    
    // Create pages
    this._createPages(basePath, templateData);
    
    // Update app.routes.ts with the new platform route
    this._updateAppRoutes(templateData);
  }

  _createMainComponentWithIcons(basePath, templateData) {
    // Get unique icons needed for the pages
    const pageIcons = templateData.pages.map(page => PAGE_ICON_MAP[page.toLowerCase()] || PAGE_ICON_MAP.default);
    const uniqueIcons = [...new Set(pageIcons)];
    
    // Convert icon names to camelCase for imports
    const iconImportNames = uniqueIcons.map(icon => 
      icon.split('-').map((part, i) => 
        i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
      ).join('')
    );
    
    // Component TypeScript with icons
    const componentTs = `import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { ${iconImportNames.map(icon => `${icon}Outline`).join(', ')} } from 'ionicons/icons';
import { RouterLink } from '@angular/router';
import { TopBannerComponent } from 'src/app/shared/components/top-banner/top-banner.component';

@Component({
  selector: 'app-${templateData.sectionName}',
  templateUrl: './${templateData.sectionName}.component.html',
  styleUrls: ['./${templateData.sectionName}.component.scss'],
  standalone: true,
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonRouterOutlet,
    RouterLink,
    TopBannerComponent
  ]
})
export class ${templateData.className}Component {
  constructor() {
    addIcons({ ${iconImportNames.map(icon => `${icon}Outline`).join(', ')} });
  }
}`;

    this.fs.write(
      this.destinationPath(`${basePath}/${templateData.sectionName}.component.ts`),
      componentTs
    );

    // Component HTML with tab buttons and appropriate icons
    const componentHtml = `<app-top-banner></app-top-banner>

<ion-tabs>
  <ion-tab-bar slot="bottom">
${templateData.pages.map(page => {
  const iconName = PAGE_ICON_MAP[page.toLowerCase()] || PAGE_ICON_MAP.default;
  return `    <ion-tab-button tab="${page}" [routerLink]="['${page}']">
      <ion-icon name="${iconName}-outline"></ion-icon>
      <ion-label>${this._capitalize(page)}</ion-label>
    </ion-tab-button>`;
}).join('\n')}
  </ion-tab-bar>
</ion-tabs>`;

    this.fs.write(
      this.destinationPath(`${basePath}/${templateData.sectionName}.component.html`),
      componentHtml
    );

    // Component SCSS
    this.fs.copyTpl(
      this.templatePath('section.component.scss'),
      this.destinationPath(`${basePath}/${templateData.sectionName}.component.scss`),
      templateData
    );

    // Route TypeScript
    this.fs.copyTpl(
      this.templatePath('section.route.ts'),
      this.destinationPath(`${basePath}/${templateData.sectionName}.route.ts`),
      templateData
    );
  }

  _createPages(basePath, templateData) {
    templateData.pages.forEach(page => {
      const pageData = {
        ...templateData,
        pageName: page,
        pageClassName: this._capitalize(page) + 'Page'
      };

      const pagePath = path.join(basePath, 'pages', page);

      // Create the directory if it doesn't exist
      if (!fs.existsSync(pagePath)) {
        fs.mkdirSync(pagePath, { recursive: true });
      }

      // Page HTML
      this.fs.copyTpl(
        this.templatePath('page.html'),
        this.destinationPath(`${pagePath}/${page}.page.html`),
        pageData
      );

      // Page TypeScript
      this.fs.copyTpl(
        this.templatePath('page.ts'),
        this.destinationPath(`${pagePath}/${page}.page.ts`),
        pageData
      );

      // Page SCSS
      this.fs.copyTpl(
        this.templatePath('page.scss'),
        this.destinationPath(`${pagePath}/${page}.page.scss`),
        pageData
      );
    });
  }

  _updateAppRoutes(templateData) {
    const appRoutesPath = path.join(process.cwd(), 'frontend/src/app/app.routes.ts');
    
    if (!fs.existsSync(appRoutesPath)) {
      this.log.error('app.routes.ts not found');
      return;
    }

    try {
      let content = fs.readFileSync(appRoutesPath, 'utf8');
      
      // Convert section name to kebab case for the route path
      const routePath = this._toKebabCase(templateData.sectionName);
      
      // Check if route already exists (using kebab-case path)
      const routeRegex = new RegExp(
        `{\\s*path:\\s*['"]${routePath}['"]\\s*,\\s*` +
        `loadComponent:\\s*\\(\\)\\s*=>\\s*import\\(['"]\\.\\/platforms\\/${templateData.sectionName}\\/${templateData.sectionName}\\.component['"]\\)`
      );

      if (content.match(routeRegex)) {
        this.log.ok(`Route for ${routePath} already exists in app.routes.ts`);
        return;
      }
      
      // Find the last route in the array
      const lastRouteIndex = content.lastIndexOf('}');
      if (lastRouteIndex === -1) {
        this.log.error('Could not find position to insert new route');
        return;
      }

      // Create the new route entry (using kebab-case for path, camelCase for imports)
      const newRoute = `  {
    path: '${routePath}',
    loadComponent: () => import('./platforms/${templateData.sectionName}/${templateData.sectionName}.component').then(m => m.${templateData.className}Component),
    loadChildren: () => import('./platforms/${templateData.sectionName}/${templateData.sectionName}.route').then(m => m.routes),
  }`;

      // Insert the new route before the closing bracket
      const beforeRoute = content.substring(0, lastRouteIndex + 1);
      const afterRoute = content.substring(lastRouteIndex + 1);
      
      // Add the new route with proper comma handling
      const updatedContent = beforeRoute + ',\n' + newRoute + afterRoute;
      
      // Write the updated content back to the file
      fs.writeFileSync(appRoutesPath, updatedContent, 'utf8');
      this.log.ok(`Updated app.routes.ts with ${routePath} platform route`);
    } catch (error) {
      this.log.error(`Error updating app.routes.ts: ${error.message}`);
    }
  }
}; 
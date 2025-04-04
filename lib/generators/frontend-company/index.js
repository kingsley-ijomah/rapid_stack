const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.frontendPath = 'frontend';
  }

  async writing() {
    const targetPath = path.join(this.frontendPath, 'src/app/company');

    // Copy the template files
    this.fs.copyTpl(
      this.templatePath('src/app/company/company-registration.page.html'),
      this.destinationPath(path.join(targetPath, 'company-registration.page.html'))
    );

    this.fs.copyTpl(
      this.templatePath('src/app/company/company-registration.page.scss'),
      this.destinationPath(path.join(targetPath, 'company-registration.page.scss'))
    );

    this.fs.copyTpl(
      this.templatePath('src/app/company/company-registration.page.ts'),
      this.destinationPath(path.join(targetPath, 'company-registration.page.ts'))
    );

    // Update app.routes.ts
    const routesPath = path.join(this.frontendPath, 'src/app/app.routes.ts');
    if (fs.existsSync(routesPath)) {
      let routesContent = fs.readFileSync(routesPath, 'utf8');
      
      // Check if the route already exists
      if (routesContent.includes('path: \'company-registration\'')) {
        this.log('Company registration route already exists in app.routes.ts');
        return;
      }
      
      // Find the routes array
      const routesArrayMatch = routesContent.match(/export const routes:\s*Routes\s*=\s*\[([\s\S]*?)\];/);
      
      if (routesArrayMatch) {
        const existingRoutes = routesArrayMatch[1];
        const newRoute = `
  {
    path: 'company-registration',
    loadComponent: () => import('./company/company-registration.page').then((m) => m.CompanyRegistrationPage),
  },`;

        // Insert the new route at the beginning of the routes array
        const updatedRoutes = routesContent.replace(
          /export const routes:\s*Routes\s*=\s*\[/,
          `export const routes: Routes = [${newRoute}`
        );

        // Write the updated content back to the file
        fs.writeFileSync(routesPath, updatedRoutes);
        this.log('Updated app.routes.ts with company registration route');
      } else {
        this.log('Could not find routes array in app.routes.ts');
      }
    } else {
      this.log('app.routes.ts not found');
    }
  }
}; 
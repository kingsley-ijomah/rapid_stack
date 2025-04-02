const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
  }

  async prompting() {
    // Set default project name to 'frontend'
    this.answers = {
      projectName: 'frontend'
    };
  }

  async writing() {
    const { projectName } = this.answers;
    const projectPath = path.join(process.cwd(), projectName);

    // Copy home page files
    this.fs.copyTpl(
      this.templatePath('src/app/home/home.page.html'),
      path.join(projectPath, 'src/app/home/home.page.html')
    );

    this.fs.copyTpl(
      this.templatePath('src/app/home/home.page.scss'),
      path.join(projectPath, 'src/app/home/home.page.scss')
    );

    this.fs.copyTpl(
      this.templatePath('src/app/home/home.page.ts'),
      path.join(projectPath, 'src/app/home/home.page.ts')
    );
  }
}; 
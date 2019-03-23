const path = require('path');
const globby = require('globby');
module.exports = class Compiler {
  constructor() {
    this.packages = [];
    this.stacks = [];
  }

  addPackage(cwd, name = '_') {
    this.packages.push({ cwd, name });
    return this;
  }

  addCompiler(options = {}) {
    const matches = options.match ? (Array.isArray(options.match) ? options.match : [options.match]): [];
    const ignores = options.ignore ? (Array.isArray(options.ignore) ? options.ignore : [options.ignore]): [];
    const conditions = matches.concat(ignores.map(ignore => '!' + ignore));
    this.stacks.push({ conditions, handler: options.handler });
    return this;
  }

  async compile() {
    for (let x = 0; x < this.stacks.length; x++) {
      const { conditions, handler } = this.stacks[x];
      for (let y = 0; y < this.packages.length; y++) {
        const { cwd, name } = this.packages[y];
        const files = await globby(conditions, { cwd });
        for (let z = 0; z < files.length; z++) {
          const file = files[z];
          await handler(path.resolve(cwd, file), name, cwd);
        }
      }
    }
  }
}
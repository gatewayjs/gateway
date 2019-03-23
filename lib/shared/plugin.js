module.exports = class Plugin {
  constructor(app, configs = {}) {
    this.$app = app;
    this.$config = configs;
    this.$name = null;
    this.$file = null;
    this.$cwd = null;
  }
}
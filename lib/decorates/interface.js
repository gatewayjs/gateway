module.exports = class Interface {
  set(target, value) {
    Reflect.defineMetadata(this.name, value, target);
  }

  get(target) {
    return Reflect.getMetadata(this.name, target);
  }
}
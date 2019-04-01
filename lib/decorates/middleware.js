module.exports = function Middleware(...args) {
  return (target, propertyKey, descriptor) => {
    const source = !propertyKey && !descriptor ? target : descriptor.value;
    let parentMiddlewares = Reflect.getMetadata('Middleware', source);
    if (!parentMiddlewares) parentMiddlewares = [];
    parentMiddlewares.unshift(...args);
    Reflect.defineMetadata('Middleware', parentMiddlewares, source);
  }
}
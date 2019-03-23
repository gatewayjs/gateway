const isClass = require('is-class');

module.exports = (...clazz) => {
  return (target, propertyKey, descriptor) => {
    if (!propertyKey && !descriptor) throw new Error(`You can not use '@Service' on class.file: ${target.__file__}`);
    let services = Reflect.getMetadata('Service', descriptor.value);
    if (!services) services = [];
    clazz.forEach(cls => {
      if (!isClass(cls)) throw new Error(`Service required classify arguments. file: ${cls.__file__}`);
      if (!cls.name) throw new Error('service need a name of class. file: ' + cls.__file__);
      if (!cls.__is_service__) throw new Error('it is not a service target. file: ' + cls.__file__);
      services.push(cls);
    });
    Reflect.defineMetadata('Service', services, descriptor.value);
  }
}
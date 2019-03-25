const isClass = require('is-class');
const Websocket = module.exports = {};

Websocket.Room = function(prefix) {
  if (isClass(prefix)) {
    return Reflect.defineMetadata('WebsocketRoom', '/', prefix);
  }
  return target => {
    Reflect.defineMetadata('WebsocketRoom', prefix, target);
  }
}

Websocket.Event = function(target, key, descriptor) {
  if (!key && !descriptor) return;
  Reflect.defineMetadata('WebsocketEvent', key, descriptor.value);
}
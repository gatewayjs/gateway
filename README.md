# Microservice Architecture of Process Gateway

进程网关的微服务架构，简称 `MAPG`。它可以驱使服务动态创建辅助进程服务，同时管理整个进程树的整套生命周期，提供完整的微服务调用链，支持`HTTP` `TCP` `IPC` 以及 `WEBSOCKET`。

Microservice architecture of process gateway, referred to as `MAPG`. It can drive services to dynamically create ancillary process services, manage the whole life cycle of the process tree, provide a complete micro-service call chain, support `HTTP` `TCP` `IPC` and `WEBSOCKET`.

## Usage

```bash
$ npm i -g @evio/cli
$ cli install @gatewayjs/cli
$ cli gw:new
$ cd <project>
$ npm run dev
# --------------------------
$ npm run start
$ npm run restart
$ npm run stop
```

## License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2018-present, yunjie (Evio) shen
const { Controller, Interface, Middleware, Http, Validator, Response } = require('../../../');
const custom = require('../middleware/custom');
@Controller
@Middleware(custom)
class ABC {
  @Http.GET
  async Welcome(req, res) {
    return 'hello world' + req.state.custom.abc;
  }

  @Http.POST
  @Middleware(Http.File())
  // @Validator.QueryString({
  //   a: {
  //     type: 'string',
  //   },
  //   b: {
  //     type: 'array',
  //     items: {
  //       type: 'string'
  //     }
  //   }
  // })
  // @Validator.Body({
  //   abc: {
  //     type: 'number',
  //   },
  //   def: {
  //     type: 'string'
  //   }
  // })
  // @Response({
  //   type: 'object',
  //   properties: {
  //     protocol: {
  //       type: 'string'
  //     },
  //     query: {
  //       type: 'object',
  //       properties: {
  //         a: {
  //           type: 'string',
  //         },
  //         b: {
  //           type: 'array',
  //           items: {
  //             type: 'string'
  //           }
  //         }
  //       }
  //     }
  //   }
  // })
  async Home(req, res) {
    return req.location;
  }
}

module.exports = ABC
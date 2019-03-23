const { Controller, Interface, Middleware, Http, Validator, Response } = require('../../../');
const path = require('path');
@Controller
@Middleware(Interface.Middlewares.TextMiddleware)
class ABC {
  @Http.GET
  async Welcome(req, res) {
    return 'hello world';
  }

  @Http.POST
  @Middleware(Http.Body)
  @Validator.QueryString({
    a: {
      type: 'string',
    },
    b: {
      type: 'array',
      items: {
        type: 'string'
      }
    }
  })
  @Validator.Body({
    abc: {
      type: 'number',
    },
    def: {
      type: 'string'
    }
  })
  @Response({
    type: 'object',
    properties: {
      protocol: {
        type: 'string'
      },
      query: {
        type: 'object',
        properties: {
          a: {
            type: 'string',
          },
          b: {
            type: 'array',
            items: {
              type: 'string'
            }
          }
        }
      }
    }
  })
  async Home(req, res) {
    return req.location;
  }
}

module.exports = ABC
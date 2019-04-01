module.exports = async function middleware(ctx, next) {
  ctx.state.custom = {
    abc: 123
  };
  await next();
};
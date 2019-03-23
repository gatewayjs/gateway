module.exports = $plugin => {
  const app = $plugin.$app;
  ['connect', 'create', 'start', 'disconnect', 'close', 'end'].forEach(event => {
    app.on(event, () => console.log(event));
  });
}
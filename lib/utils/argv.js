module.exports = argv => {
  const result = {};
  argv.forEach(arg => {
    let exec = /^\-\-([^\=]+)(\=(.+))?$/.exec(arg);
    if (exec) {
      if (exec[3]) {
        if (result[exec[1]] && !Array.isArray(result[exec[1]])) {
          result[exec[1]] = [result[exec[1]]];
        }
        if (Array.isArray(result[exec[1]])) {
          result[exec[1]].push(exec[3]);
        } else {
          result[exec[1]] = exec[3];
        }
      } else {
        result[exec[1]] = true;
      }
    }
    exec = /^\-([a-zA-Z]+)$/.exec(arg);
    if (exec) {
      result[exec[1]] = true;
    }
  });
  return result;
}
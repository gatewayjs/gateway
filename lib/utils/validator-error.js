module.exports = function error(name, errors, path) {
  if (errors && Array.isArray(errors)) {
    const messages = errors.map((err, index) => ` ${index + 1}. ${err.schemaPath} ${err.message}`);
    messages.unshift(name + ' check failed: ' + path);
    throw new Error(messages.join('\n'));
  }
}
const path = require('path')
const fs = require('fs');
const compile = require('../../utils/test-utils/compile');

const dir = path.join(__dirname, '..', '..', 'contracts');

function compileBase(override = false) {
  const _path = path.join(__dirname, './standard.json');
  if (!override && fs.existsSync(_path)) return require(_path);
  const code = compile(dir, 'DharmaPeg.sol');
  fs.writeFileSync(_path, JSON.stringify(code, null, 2));
  return code;
}

function compileBaseMock(override = false) {
  const _path = path.join(__dirname, './standard-mock.json');
  if (!override && fs.existsSync(_path)) return require(_path);
  const code = compile(path.join(dir, 'mocks'), 'MockDharmaPeg.sol');
  fs.writeFileSync(_path, JSON.stringify(code, null, 2));
  return code;
}

module.exports = {
  compileBase,
  compileBaseMock
};
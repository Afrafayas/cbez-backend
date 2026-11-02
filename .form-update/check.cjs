const fs = require('fs');
const path = require('path');
const stage = __dirname;
let failed = false;
for (const app of ['cbez-admin', 'cbez-frontend']) {
  const root = path.resolve(stage, '../..', app);
  const ts = require(path.join(root, 'node_modules/typescript'));
  const configPath = path.join(root, app === 'cbez-admin' ? 'tsconfig.json' : 'tsconfig.app.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const host = ts.createCompilerHost(parsed.options);
  host.getCurrentDirectory = () => root;
  const read = host.readFile.bind(host);
  host.readFile = file => {
    const relative = path.relative(root, file);
    const overlay = path.join(stage, app, relative);
    return fs.existsSync(overlay) && fs.statSync(overlay).isFile() ? fs.readFileSync(overlay, 'utf8') : read(file);
  };
  const exists = host.fileExists.bind(host);
  host.fileExists = file => fs.existsSync(path.join(stage, app, path.relative(root, file))) || exists(file);
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true, incremental: false }, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  console.log(app + ': ' + diagnostics.length + ' diagnostics');
  if (diagnostics.length) {
    failed = true;
    console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => root, getCanonicalFileName: f => f, getNewLine: () => '\n' }));
  }
}
process.exitCode = failed ? 1 : 0;

const path = require('path');
const fs = require('fs');
const esbuild = require('../../cbez-admin/node_modules/esbuild');
esbuild.buildSync({ entryPoints: [path.join(__dirname, 'preview.tsx')], bundle: true, outfile: path.join(__dirname, 'preview.js'), jsx: 'automatic', nodePaths: [path.resolve(__dirname, '../../cbez-admin/node_modules')], define: { 'process.env.NODE_ENV': '"development"' } });
fs.writeFileSync(path.join(__dirname, 'preview.html'), '<!doctype html><html><body><div id="root"></div><script src="preview.js"></script><script src="browser-check.js"></script></body></html>');
console.log('Built local form fixture.');

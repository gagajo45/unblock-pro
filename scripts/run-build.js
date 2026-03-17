#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const path = require('path');
const pkg = require('../package.json');

const versionSonic = pkg.versionSonic || pkg.version;
const env = { ...process.env, VERSION_SONIC: versionSonic };
const args = process.argv.slice(2).join(' ');
const cmd = `npx electron-builder ${args}`.trim();

execSync(cmd, { stdio: 'inherit', env, cwd: path.join(__dirname, '..') });

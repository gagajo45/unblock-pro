#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');

const ELECTRON_WIN7_VERSION = '22.3.27';

const versionSonic = pkg.versionSonic || pkg.version;
const env = { ...process.env, VERSION_SONIC: versionSonic };
const argv = process.argv.slice(2);
const isWin7 = argv.includes('--win7');
const filteredArgs = argv.filter((a) => a !== '--win7');

let extraConfig = '';
if (isWin7) {
  const b = pkg.build;
  const win7Build = {
    ...b,
    electronVersion: ELECTRON_WIN7_VERSION,
    appId: 'com.sonic.unblockpro.win7',
    extraMetadata: {
      ...(b.extraMetadata || {}),
      win7Build: true
    },
    directories: {
      ...b.directories,
      output: process.env.UNBLOCKPRO_WIN7_DIST || 'dist-win7'
    },
    nsis: {
      ...b.nsis,
      artifactName: 'UnblockPro-sonic${env.VERSION_SONIC}-v${version}-win7-setup.${ext}'
    },
    portable: {
      ...b.portable,
      artifactName: 'UnblockPro-sonic${env.VERSION_SONIC}-v${version}-win7-portable.${ext}'
    },
    publish: {
      ...b.publish,
      channel: 'win7'
    }
  };
  const cfgPath = path.join(__dirname, '..', '.electron-builder-win7.json');
  fs.writeFileSync(cfgPath, JSON.stringify(win7Build, null, 2), 'utf8');
  extraConfig = `--config "${cfgPath}"`;
}

const cmd = ['npx', 'electron-builder', ...filteredArgs, extraConfig].filter(Boolean).join(' ');

execSync(cmd, { stdio: 'inherit', env, cwd: path.join(__dirname, '..'), shell: true });

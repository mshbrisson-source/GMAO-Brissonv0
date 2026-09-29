#!/usr/bin/env node

const { spawnSync } = require('child_process');

const args = process.argv.slice(2);

function run(cmd, cmdArgs) {
  return spawnSync(cmd, cmdArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

// Prefer modern Docker Compose plugin, fallback to legacy docker-compose.
let result = run('docker', ['compose', ...args]);

if (result.error && result.error.code === 'ENOENT') {
  result = run('docker-compose', args);
}

if (result.error) {
  console.error('Unable to run Docker Compose. Install Docker Desktop and restart your terminal.');
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);

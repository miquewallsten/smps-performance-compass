// SMPS Performance Compass - Production Entry Point for Hostinger
// Uses CommonJS to load tsx, then runs the TypeScript server
//
// Start command: node server.cjs
// Or: npx tsx server/index.ts

const { execSync } = require('child_process');
const path = require('path');

// Run the server using tsx - this keeps the process alive
execSync('npx tsx server/index.ts', {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env }
});

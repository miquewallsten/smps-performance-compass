import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';

console.log('Building server bundle with esbuild...');

try {
  execSync(
    'npx esbuild server/index.ts --bundle --platform=node --target=node18 --outfile=server.cjs --format=cjs --external:multer',
    { stdio: 'inherit', cwd: process.cwd() }
  );
  
  if (existsSync('server.cjs')) {
    const stats = statSync('server.cjs');
    console.log(`✓ server.cjs created (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.error('server.cjs was not created');
    process.exit(1);
  }
} catch (err) {
  console.error('Failed to build server.cjs:', err.message);
  process.exit(1);
}

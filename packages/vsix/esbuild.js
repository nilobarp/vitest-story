const esbuild = require("esbuild");
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');
const bumpMinor = process.argv.includes('--minor');
const bumpMajor = process.argv.includes('--major');

function bumpVersion() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const [major, minor, patch] = packageJson.version.split('.').map(Number);
  
  if (bumpMajor) {
    packageJson.version = `${major + 1}.0.0`;
  } else if (bumpMinor) {
    packageJson.version = `${major}.${minor + 1}.0`;
  } else {
    // Default: bump patch
    packageJson.version = `${major}.${minor}.${patch + 1}`;
  }
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`Version bumped to ${packageJson.version}`);
  
  return packageJson.version;
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd(result => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  },
};

async function main() {
  // Bump version if not in watch mode
  if (!watch) {
    bumpVersion();
  }
  const ctx = await esbuild.context({
    entryPoints: [
      'src/extension.ts'
    ],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'out/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [
      esbuildProblemMatcherPlugin
    ],
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

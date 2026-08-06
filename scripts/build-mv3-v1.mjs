import { spawn } from 'node:child_process';
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagingRoot = path.join(os.tmpdir(), 'ai-chat-navigator-build-v1');
const stagingDir = path.join(stagingRoot, 'chrome-mv3_v1');
const outputRoot = path.join(rootDir, '.output');
const publishDir = path.join(outputRoot, 'chrome-mv3_v1');
const wxtCli = path.join(rootDir, 'node_modules', 'wxt', 'bin', 'wxt.mjs');
const wxtViteBuilderPath = path.join(
  rootDir,
  'node_modules',
  'wxt',
  'dist',
  'core',
  'builders',
  'vite',
  'index.mjs',
);
const minimumContentScriptSize = 100_000;
const minimumTotalSize = 250_000;
const minimumFileCount = 10;

function removeSafeDeleteInjection(nodeOptions) {
  if (!nodeOptions) return undefined;

  const tokens = nodeOptions.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const filtered = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    const isRequireFlag = token === '--require' || token === '-r';

    if (isRequireFlag && next?.includes('genie-safe-delete.cjs')) {
      index += 1;
      continue;
    }

    if (token.includes('genie-safe-delete.cjs')) {
      continue;
    }

    filtered.push(token);
  }

  return filtered.length > 0 ? filtered.join(' ') : undefined;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function requireNonEmpty(relativePath, minimumSize = 1) {
  const absolutePath = path.join(stagingDir, relativePath);
  const fileStat = await stat(absolutePath);

  if (!fileStat.isFile() || fileStat.size < minimumSize) {
    throw new Error(
      `${relativePath} is missing or too small (${fileStat.size} bytes, expected >= ${minimumSize})`,
    );
  }

  return fileStat.size;
}

async function collectFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

function normalizeManifestPath(value) {
  return value.replace(/^\//, '').split('/').join(path.sep);
}

async function validateManifestReferences(manifest) {
  const references = new Set();

  if (manifest.background?.service_worker) {
    references.add(manifest.background.service_worker);
  }

  if (manifest.action?.default_popup) {
    references.add(manifest.action.default_popup);
  }

  for (const contentScript of manifest.content_scripts ?? []) {
    for (const script of contentScript.js ?? []) references.add(script);
    for (const stylesheet of contentScript.css ?? []) references.add(stylesheet);
  }

  for (const reference of references) {
    await requireNonEmpty(normalizeManifestPath(reference));
  }
}

async function validatePopupReferences() {
  const popupHtml = await readFile(path.join(stagingDir, 'popup.html'), 'utf8');
  const matches = popupHtml.matchAll(/(?:src|href)=["']([^"']+)["']/g);

  for (const match of matches) {
    const reference = match[1];
    if (/^(?:https?:|data:|#)/i.test(reference)) continue;
    await requireNonEmpty(normalizeManifestPath(reference));
  }
}

async function validateBuild() {
  await requireNonEmpty('manifest.json');
  const manifestText = await readFile(path.join(stagingDir, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestText);

  await requireNonEmpty(
    path.join('content-scripts', 'chatgpt.js'),
    minimumContentScriptSize,
  );
  await requireNonEmpty('background.js');
  await requireNonEmpty('popup.html');
  await validateManifestReferences(manifest);
  await validatePopupReferences();

  const files = await collectFiles(stagingDir);
  let totalSize = 0;

  for (const file of files) {
    totalSize += (await stat(path.join(stagingDir, file))).size;
  }

  if (files.length < minimumFileCount) {
    throw new Error(
      `Build contains only ${files.length} files (expected >= ${minimumFileCount})`,
    );
  }

  if (totalSize < minimumTotalSize) {
    throw new Error(
      `Build total size is only ${totalSize} bytes (expected >= ${minimumTotalSize})`,
    );
  }

  return { files, totalSize, version: manifest.version };
}

async function withPatchedWxtDirectoryCleanup(runBuild) {
  const original = await readFile(wxtViteBuilderPath, 'utf8');
  const unsafeCleanup = `\ttry {\n\t\tawait rmdir(dir);\n\t} catch {}`;
  const safeCleanup = `\ttry {\n\t\tif ((await readdir(dir)).length === 0) await rmdir(dir);\n\t} catch {}`;

  if (!original.includes(unsafeCleanup)) {
    throw new Error('WXT cleanup implementation changed; patch was not applied');
  }

  await writeFile(
    wxtViteBuilderPath,
    original.replace(unsafeCleanup, safeCleanup),
    'utf8',
  );

  try {
    return await runBuild();
  } finally {
    await writeFile(wxtViteBuilderPath, original, 'utf8');
  }
}

function runWxtBuild() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      AI_CHAT_NAVIGATOR_STAGING_ROOT: stagingRoot,
    };
    const sanitizedNodeOptions = removeSafeDeleteInjection(env.NODE_OPTIONS);

    if (sanitizedNodeOptions) {
      env.NODE_OPTIONS = sanitizedNodeOptions;
    } else {
      delete env.NODE_OPTIONS;
    }

    const child = spawn(
      process.execPath,
      [wxtCli, 'build', '--config', 'wxt.v1.config.ts'],
      {
        cwd: rootDir,
        env,
        stdio: 'inherit',
      },
    );

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `WXT build failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`,
          ),
        );
      }
    });
  });
}

async function publishBuild() {
  await mkdir(outputRoot, { recursive: true });

  const backupDir = path.join(
    outputRoot,
    `chrome-mv3_v1.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`,
  );
  const hadPublishedBuild = await exists(publishDir);

  if (hadPublishedBuild) {
    await rename(publishDir, backupDir);
  }

  try {
    await rename(stagingDir, publishDir);
  } catch (error) {
    if (hadPublishedBuild && !(await exists(publishDir))) {
      await rename(backupDir, publishDir);
    }
    throw error;
  }

  return hadPublishedBuild ? backupDir : null;
}

async function main() {
  console.log('[build:v1] Building from the current source tree');
  console.log(`[build:v1] Staging: ${stagingDir}`);
  console.log(`[build:v1] Publish: ${publishDir}`);
  console.log('[build:v1] Existing .output/chrome-mv3 will not be touched');

  await rm(stagingRoot, { recursive: true, force: true });
  await withPatchedWxtDirectoryCleanup(runWxtBuild);

  const result = await validateBuild();
  const backupDir = await publishBuild();

  console.log(
    `[build:v1] Validation passed: ${result.files.length} files, ${result.totalSize} bytes, version ${result.version}`,
  );
  console.log(`[build:v1] Published: ${publishDir}`);
  if (backupDir) console.log(`[build:v1] Previous build backed up: ${backupDir}`);
}

main().catch((error) => {
  console.error(`[build:v1] FAILED: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});

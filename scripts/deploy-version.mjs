#!/usr/bin/env node
/**
 * Deploy wrapper for `pnpm frontend:prod` and `pnpm backend:prod`.
 *
 * Version bump rule (MAJOR.MINOR.PATCH):
 * - PATCH cycles 0..9. When PATCH reaches 9, it wraps to 0 and MINOR increments (+1).
 * - MINOR can grow arbitrarily large (e.g. 0.9.9 -> 0.10.0).
 * - MAJOR is never auto-incremented (manual only).
 * - Versions are only retained when the deploy succeeds.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const VERSION_PATH = path.join(ROOT_DIR, 'src', 'lib', 'version.json');
const PACKAGE_PATH = path.join(ROOT_DIR, 'package.json');

export function bumpVersion(version) {
	const match = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!match) {
		throw new Error(`Invalid version format "${version}". Expected MAJOR.MINOR.PATCH.`);
	}
	const major = Number(match[1]);
	let minor = Number(match[2]);
	let patch = Number(match[3]);

	if (patch >= 9) {
		patch = 0;
		minor += 1;
	} else {
		patch += 1;
	}
	return `${major}.${minor}.${patch}`;
}

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function loadEnvFile(filePath) {
	if (!fs.existsSync(filePath)) return;
	for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
		const idx = trimmed.indexOf('=');
		const key = trimmed.slice(0, idx).trim();
		let val = trimmed.slice(idx + 1).trim();
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1).trim();
		}
		if (val.length > 0 && !process.env[key]) {
			process.env[key] = val;
		}
	}
}

function ensureCloudflareAuth() {
	if (process.env.CLOUDFLARE_API_TOKEN) return;
	try {
		execSync('wrangler whoami', { stdio: 'ignore', cwd: ROOT_DIR });
	} catch {
		run('wrangler login');
	}
}

function run(cmd) {
	execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR });
}

function deployFrontend() {
	const prevVersionRaw = fs.readFileSync(VERSION_PATH, 'utf8');
	const prevPkgRaw = fs.readFileSync(PACKAGE_PATH, 'utf8');

	const versions = JSON.parse(prevVersionRaw);
	const pkg = JSON.parse(prevPkgRaw);
	const oldVer = versions.frontend;
	const newVer = bumpVersion(oldVer);

	versions.frontend = newVer;
	pkg.version = newVer;
	writeJson(VERSION_PATH, versions);
	fs.writeFileSync(PACKAGE_PATH, JSON.stringify(pkg, null, '\t') + '\n', 'utf8');

	try {
		run('pnpm env:prod');
		loadEnvFile(path.join(ROOT_DIR, '.env.local'));
		loadEnvFile(path.join(ROOT_DIR, '.env'));
		ensureCloudflareAuth();
		run(
			'pnpm build && wrangler pages deploy .svelte-kit/cloudflare --project-name=the-commons --branch=main --commit-dirty=true'
		);
		console.log(`\nFrontend deploy succeeded: v${oldVer} -> v${newVer}`);
	} catch (err) {
		fs.writeFileSync(VERSION_PATH, prevVersionRaw, 'utf8');
		fs.writeFileSync(PACKAGE_PATH, prevPkgRaw, 'utf8');
		console.error(`\nFrontend deploy failed; reverted version to v${oldVer}.`);
		process.exit(err?.status ?? 1);
	}
}

function deployBackend() {
	run('pnpm env:prod && node scripts/deploy-migrations.mjs');

	const versions = readJson(VERSION_PATH);
	const oldVer = versions.backend;
	const newVer = bumpVersion(oldVer);
	versions.backend = newVer;
	writeJson(VERSION_PATH, versions);
	console.log(`\nBackend deploy succeeded: v${oldVer} -> v${newVer}`);
}

const targetArg = process.argv.find((a) => a.startsWith('--target='));
const target = targetArg?.split('=')[1];

if (target === 'frontend') {
	deployFrontend();
} else if (target === 'backend') {
	deployBackend();
} else {
	console.error('Usage: node scripts/deploy-version.mjs --target=frontend|backend');
	process.exit(1);
}

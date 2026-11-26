#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

const isTTY = Boolean(process.stdout.isTTY);
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const BAR_WIDTH = 30;

const C = {
	reset: isTTY ? '\x1b[0m' : '',
	bold: isTTY ? '\x1b[1m' : '',
	dim: isTTY ? '\x1b[2m' : '',
	green: isTTY ? '\x1b[32m' : '',
	red: isTTY ? '\x1b[31m' : '',
	yellow: isTTY ? '\x1b[33m' : '',
	cyan: isTTY ? '\x1b[36m' : ''
};

/**
 * @typedef {{
 *   id: string;
 *   label: string;
 *   cmd: string;
 *   args: string[];
 *   status: 'pending' | 'running' | 'passed' | 'failed';
 *   startTime: number | null;
 *   endTime: number | null;
 *   exitCode: number | null;
 *   output: string;
 * }} Task
 */

/** @type {Task[]} */
const tasks = [
	{
		id: 'sync',
		label: 'svelte-kit sync',
		cmd: 'pnpm',
		args: ['exec', 'svelte-kit', 'sync'],
		status: 'pending',
		startTime: null,
		endTime: null,
		exitCode: null,
		output: ''
	},
	{
		id: 'check',
		label: 'svelte-check',
		cmd: 'pnpm',
		args: ['exec', 'svelte-check', '--tsconfig', './tsconfig.json', '--incremental'],
		status: 'pending',
		startTime: null,
		endTime: null,
		exitCode: null,
		output: ''
	},
	{
		id: 'test',
		label: 'vitest',
		cmd: 'pnpm',
		args: ['exec', 'vitest', 'run'],
		status: 'pending',
		startTime: null,
		endTime: null,
		exitCode: null,
		output: ''
	},
	{
		id: 'build',
		label: 'vite build',
		cmd: 'pnpm',
		args: ['exec', 'vite', 'build'],
		status: 'pending',
		startTime: null,
		endTime: null,
		exitCode: null,
		output: ''
	}
];

const totalStart = Date.now();
const children = new Set();
let spinnerIdx = 0;
let renderedLines = 0;

function formatDuration(ms) {
	const totalSeconds = ms / 1000;
	if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
	const mins = Math.floor(totalSeconds / 60);
	const secs = Math.floor(totalSeconds % 60);
	return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function renderProgressBar(doneCount, totalCount) {
	const ratio = totalCount === 0 ? 1 : doneCount / totalCount;
	const filled = Math.round(ratio * BAR_WIDTH);
	const empty = BAR_WIDTH - filled;
	const pct = Math.round(ratio * 100);
	return `${C.cyan}[${'█'.repeat(filled)}${C.dim}${'░'.repeat(empty)}${C.reset}${C.cyan}]${C.reset} ${String(pct).padStart(3)}% (${doneCount}/${totalCount})`;
}

function renderTTY() {
	if (!isTTY) return;
	if (renderedLines > 0) {
		process.stdout.write(`\x1b[${renderedLines}A\x1b[0J`);
	}

	const now = Date.now();
	const doneCount = tasks.filter((t) => t.status === 'passed' || t.status === 'failed').length;
	const elapsed = formatDuration(now - totalStart);
	const spin = SPINNER[spinnerIdx++ % SPINNER.length];

	const lines = [
		`${C.bold}check:all${C.reset}  ${renderProgressBar(doneCount, tasks.length)}  ${C.dim}elapsed ${elapsed}${C.reset}`,
		''
	];

	for (const task of tasks) {
		const name = task.label.padEnd(18);
		if (task.status === 'pending') {
			lines.push(`  ${C.dim}○  ${name} pending${C.reset}`);
		} else if (task.status === 'running') {
			const dur = formatDuration(now - (task.startTime ?? now));
			lines.push(`  ${C.yellow}${spin}${C.reset}  ${name} ${C.yellow}running${C.reset}  ${C.dim}${dur}${C.reset}`);
		} else if (task.status === 'passed') {
			const dur = formatDuration((task.endTime ?? now) - (task.startTime ?? now));
			lines.push(`  ${C.green}✔${C.reset}  ${name} ${C.green}passed${C.reset}   ${C.dim}${dur}${C.reset}`);
		} else {
			const dur = formatDuration((task.endTime ?? now) - (task.startTime ?? now));
			lines.push(`  ${C.red}✖${C.reset}  ${name} ${C.red}failed${C.reset}   ${C.dim}${dur}${C.reset}`);
		}
	}

	const frame = lines.join('\n') + '\n';
	process.stdout.write(frame);
	renderedLines = lines.length;
}

/**
 * @param {Task} task
 * @returns {Promise<number>}
 */
function runTask(task) {
	return new Promise((resolve) => {
		task.status = 'running';
		task.startTime = Date.now();
		if (!isTTY) {
			console.log(`==> Starting ${task.label}...`);
		}

		const child = spawn(task.cmd, task.args, {
			stdio: ['ignore', 'pipe', 'pipe'],
			env: { ...process.env, FORCE_COLOR: isTTY ? '1' : '0' }
		});
		children.add(child);

		child.stdout.on('data', (chunk) => {
			task.output += chunk.toString();
		});
		child.stderr.on('data', (chunk) => {
			task.output += chunk.toString();
		});

		child.on('close', (code) => {
			children.delete(child);
			task.endTime = Date.now();
			task.exitCode = code ?? 1;
			task.status = task.exitCode === 0 ? 'passed' : 'failed';
			if (!isTTY) {
				const dur = formatDuration(task.endTime - task.startTime);
				const tag = task.status === 'passed' ? 'PASSED' : 'FAILED';
				console.log(`==> ${task.label} ${tag} (${dur})`);
			}
			resolve(task.exitCode);
		});

		child.on('error', (err) => {
			children.delete(child);
			task.endTime = Date.now();
			task.exitCode = 1;
			task.status = 'failed';
			task.output += `\n${err.message}\n`;
			resolve(1);
		});
	});
}

function cleanupAndExit(signal) {
	for (const child of children) {
		child.kill(signal);
	}
	if (isTTY) {
		process.stdout.write('\x1b[?25h\n');
	}
	process.exit(130);
}

process.on('SIGINT', () => cleanupAndExit('SIGINT'));
process.on('SIGTERM', () => cleanupAndExit('SIGTERM'));

async function main() {
	if (isTTY) {
		process.stdout.write('\x1b[?25l');
	}

	const timer = isTTY ? setInterval(renderTTY, 100) : null;
	renderTTY();

	try {
		const [syncTask, ...parallelTasks] = tasks;
		const syncCode = await runTask(syncTask);

		if (syncCode === 0) {
			await Promise.all(parallelTasks.map((t) => runTask(t)));
		} else {
			for (const t of parallelTasks) {
				t.status = 'failed';
				t.startTime = Date.now();
				t.endTime = t.startTime;
				t.exitCode = 1;
				t.output = 'Skipped because svelte-kit sync failed.';
			}
		}
	} finally {
		if (timer) clearInterval(timer);
		renderTTY();
		if (isTTY) {
			process.stdout.write('\x1b[?25h');
		}
	}

	const failed = tasks.filter((t) => t.status === 'failed');
	const totalDur = formatDuration(Date.now() - totalStart);

	if (failed.length > 0) {
		console.log('');
		for (const task of failed) {
			console.log(`${C.red}${C.bold}--- ${task.label} output (exit ${task.exitCode}) ---${C.reset}`);
			console.log(task.output.trimEnd());
			console.log('');
		}
		console.log(`${C.red}${C.bold}✖ ${failed.length} check(s) failed in ${totalDur}.${C.reset}`);
		process.exit(1);
	}

	console.log(`\n${C.green}${C.bold}✔ All checks passed in ${totalDur}.${C.reset}`);
}

main();

#!/usr/bin/env node
/**
 * 跨平台一次性构建全部 6 份配置：
 *   cfw / cvr / clash-party  ×  global-proxy / auto-routing
 *
 * 用法：
 *   node ./build-all.mjs
 *   或 npm run build:all
 *
 * 设计原则：
 *  - 不依赖 bash / wsl / git-bash，纯 Node 实现，避免 JB IDE 在 Windows 上把
 *    `bash.exe` 解析为 WSL 入口而触发 HCS/ERROR_NOT_SUPPORTED。
 *  - 失败任意一项立即终止并返回非零退出码。
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';

const targets = [
	'build:cfw:global',
	'build:cfw:auto',
	'build:cvr:global',
	'build:cvr:auto',
	'build:party:global',
	'build:party:auto',
];

console.log('🔨 开始构建全部配置 (cfw / cvr / clash-party × global-proxy / auto-routing)...\n');

const t0 = Date.now();

for (const script of targets) {
	console.log(`\n────── ▶ npm run ${script} ──────`);
	// Windows 下 npm 是 .cmd 批处理，必须通过 cmd /c 启动；避免 shell:true + args 数组的组合（Node 24 DEP0190）
	const result = isWindows
		? spawnSync('cmd', ['/c', 'npm', 'run', script], {
			cwd: __dirname,
			stdio: 'inherit',
		})
		: spawnSync('npm', ['run', script], {
			cwd: __dirname,
			stdio: 'inherit',
		});

	if (result.status !== 0) {
		console.error(`\n❌ 构建失败：npm run ${script} 退出码 ${result.status}`);
		process.exit(result.status ?? 1);
	}
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
const distDir = path.resolve(__dirname, 'dist');
const distExists = fs.existsSync(distDir);

console.log('');
console.log('════════════════════════════════════════════════════════════════');
console.log(`✅ 全部构建完成！耗时 ${elapsed}s`);
console.log('');
console.log('📁 产物输出目录:');
console.log(`   ${distExists ? distDir : '(未找到 dist 目录，请检查构建脚本)'}`);
console.log('');
console.log('💡 该目录下按 客户端/模式 组织，每个客户端都包含 global-proxy 和 auto-routing 两份配置。');
console.log('════════════════════════════════════════════════════════════════');

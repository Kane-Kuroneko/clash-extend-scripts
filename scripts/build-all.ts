#!/usr/bin/env tsx
/**
 * 跨平台一次性构建全部 6 份配置：
 *   cfw / cvr / clash-party  ×  global-proxy / auto-routing
 *
 * 用法：
 *   tsx ./build-all.ts
 *   或 npm run build:all
 *
 * 设计原则：
 *  - 不依赖 bash / wsl / git-bash，纯 Node 实现，避免 JB IDE 在 Windows 上把
 *    `bash.exe` 解析为 WSL 入口而触发 HCS/ERROR_NOT_SUPPORTED。
 *  - 失败任意一项立即终止并返回非零退出码。
 */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

interface BuildResult {
	script: string;
	status: number | null;
	error?: string;
}

// scripts/ 目录的父级即为项目根
const scriptDir: string = path.dirname(fileURLToPath(import.meta.url));
const projectRoot: string = path.resolve(scriptDir, '..');
const isWindows: boolean = process.platform === 'win32';

const targets: readonly string[] = [
	'build:cfw:global',
	'build:cfw:auto',
	'build:cvr:global',
	'build:cvr:auto',
	'build:party:global',
	'build:party:auto',
] as const;

console.log('🔨 开始构建全部配置 (cfw / cvr / clash-party × global-proxy / auto-routing)...\n');

const t0: number = Date.now();

for (const script of targets) {
	console.log(`\n────── ▶ npm run ${script} ──────`);

	// Windows 下 npm 是 .cmd 批处理，必须通过 cmd /c 启动；避免 shell:true + args 数组的组合（Node 24 DEP0190）
	const result: SpawnSyncReturns<Buffer> = isWindows
		? spawnSync('cmd', ['/c', 'npm', 'run', script], {
			cwd: projectRoot,
			stdio: 'inherit',
		})
		: spawnSync('npm', ['run', script], {
			cwd: projectRoot,
			stdio: 'inherit',
		});

	if (result.status !== 0) {
		console.error(`\n❌ 构建失败：npm run ${script} 退出码 ${result.status ?? '未知'}`);
		if (result.error) {
			console.error(`   错误详情: ${result.error.message}`);
		}
		process.exit(result.status ?? 1);
	}
}

const elapsed: string = ((Date.now() - t0) / 1000).toFixed(1);
const distDir: string = path.resolve(projectRoot, 'dist');
const distExists: boolean = fs.existsSync(distDir);

console.log('');
console.log('════════════════════════════════════════════════════════════════');
console.log(`✅ 全部构建完成！耗时 ${elapsed}s`);
console.log('');
console.log('📁 产物输出目录:');
console.log(`   ${distExists ? distDir : '(未找到 dist 目录，请检查构建脚本)'}`);
console.log('');
console.log('💡 该目录下按 客户端/模式 组织，每个客户端都包含 global-proxy 和 auto-routing 两份配置。');
console.log('════════════════════════════════════════════════════════════════');

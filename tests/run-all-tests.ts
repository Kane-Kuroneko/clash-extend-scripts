/**
 * 测试入口文件
 * 运行所有测试
 */

import { spawnSync } from 'child_process';
import { join } from 'path';

console.log('=== Parser 项目测试套件 ===\n');
console.log('在虚拟 Clash 客户端环境中运行真实业务逻辑测试\n');

// 运行所有测试文件
const testFiles = [
	'rule-converters.test.ts',     // 规则转换器单元测试
	'clash-config-builder.test.ts', // 配置构建器单元测试
	'config-factory.test.ts',       // 配置工厂单元测试
	'integration.test.ts',          // 集成测试（核心）
];

let allPassed = true;

for (const testFile of testFiles) {
	console.log(`\n运行测试: ${testFile}`);
	console.log('='.repeat(60));
	
	const result = spawnSync('tsx', ['--test', join('tests', testFile)], {
		stdio: 'inherit',
		cwd: process.cwd(),
		shell: true
	});
	
	if (result.status !== 0) {
		allPassed = false;
		console.error(`\n❌ ${testFile} 测试失败`);
	} else {
		console.log(`\n✅ ${testFile} 测试通过`);
	}
}

console.log('\n' + '='.repeat(60));
if (allPassed) {
	console.log('✅ 所有测试通过!');
	process.exit(0);
} else {
	console.error('❌ 部分测试失败!');
	process.exit(1);
}

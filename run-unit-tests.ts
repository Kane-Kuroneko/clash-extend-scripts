/**
 * 单元测试运行入口
 * 运行所有单元测试文件（位于 src 目录下）
 */

import { spawnSync } from 'child_process';
import { join } from 'path';

console.log('=== Parser 项目单元测试 ===\n');

// 运行所有单元测试文件
const testFiles = [
	'src/RuleConverters.test.ts',
	'src/ClashConfigBuilder.test.ts',
	'src/config/ConfigFactory.test.ts',
	'src/config/UserCustomRulesConverter.test.ts',  // 三维规则转换器测试
	'tests/realworld-yaml-test.ts',  // 真实机场配置边界测试
];

let allPassed = true;

for (const testFile of testFiles) {
	console.log(`\n运行单元测试: ${testFile}`);
	console.log('='.repeat(60));
	
	const result = spawnSync('tsx', ['--test', testFile], {
		stdio: 'inherit',
		cwd: process.cwd(),
		shell: true
	});
	
	if (result.status !== 0) {
		allPassed = false;
		console.error(`\n❌ ${testFile} 单元测试失败`);
	} else {
		console.log(`\n✅ ${testFile} 单元测试通过`);
	}
}

console.log('\n' + '='.repeat(60));
if (allPassed) {
	console.log('✅ 所有单元测试通过!');
	process.exit(0);
} else {
	console.error('❌ 部分单元测试失败!');
	process.exit(1);
}
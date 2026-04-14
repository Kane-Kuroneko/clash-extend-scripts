// 测试脚本：检查构建产物执行后 main 在哪里
const { readFileSync } = require('fs');
const { join } = require('path');

const filePath = join(__dirname, '..', 'dist', 'cvr', 'global-proxy.js');
const code = readFileSync(filePath, 'utf-8');

console.log('执行前 globalThis.main:', typeof globalThis.main);

eval(code);

console.log('执行后 globalThis.main:', typeof globalThis.main);
console.log('执行后 main:', typeof main);

if (typeof globalThis.main === 'function') {
	console.log('✅ main 函数在 globalThis 上');
	const result = globalThis.main({
		port: 7890,
		proxies: [{ name: 'test', type: 'ss', server: 'test.com', port: 443, cipher: 'aes', password: 'test' }],
		'proxy-groups': [],
		rules: []
	});
	console.log('执行结果:', result);
}

import { fetchRules } from './CompileTimeScripts/fetch-rules';

const rules = await fetchRules();
const str = JSON.stringify(rules);

console.log('=== 规则数据统计 ===');
console.log('总大小:', (str.length / 1024).toFixed(2), 'KB');
console.log('');

Object.keys(rules).forEach(key => {
	const size = (JSON.stringify(rules[key]).length / 1024).toFixed(2);
	console.log(`${key}: ${size} KB, 条目数: ${rules[key].length}`);
});

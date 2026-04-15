/**
 * RuleConverters 单元测试
 * 测试规则转换器的核心功能
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { converters, dedupProxiesInGroup, SelectorSymbols } from '../src/RuleConverters';

describe('RuleConverters 测试', () => {
	describe('rulesStrToRulesObject', () => {
		it('应该正确转换2段规则字符串(MATCH规则)', () => {
			const rules = ['MATCH,DIRECT'];
			const result = converters.rulesStrToRulesObject(rules);
			
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].type, 'MATCH');
			assert.strictEqual(result[0].proxy, 'DIRECT');
			assert.strictEqual(result[0].length, 2);
		});

		it('应该正确转换3段规则字符串', () => {
			const rules = ['DOMAIN-SUFFIX,google.com,Proxy'];
			const result = converters.rulesStrToRulesObject(rules);
			
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].type, 'DOMAIN-SUFFIX');
			assert.strictEqual(result[0].value, 'google.com');
			assert.strictEqual(result[0].proxy, 'Proxy');
			assert.strictEqual(result[0].length, 3);
		});

		it('应该正确转换4段规则字符串(带no-resolve)', () => {
			const rules = ['IP-CIDR,192.168.1.0/24,DIRECT,no-resolve'];
			const result = converters.rulesStrToRulesObject(rules);
			
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].type, 'IP-CIDR');
			assert.strictEqual(result[0].value, '192.168.1.0/24');
			assert.strictEqual(result[0].proxy, 'DIRECT');
			assert.strictEqual(result[0].resolve, 'no-resolve');
			assert.strictEqual(result[0].length, 4);
		});

		it('应该批量转换多条规则', () => {
			const rules = [
				'DOMAIN-SUFFIX,google.com,Proxy',
				'DOMAIN,baidu.com,DIRECT',
				'MATCH,Proxy'
			];
			const result = converters.rulesStrToRulesObject(rules);
			
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0].type, 'DOMAIN-SUFFIX');
			assert.strictEqual(result[1].type, 'DOMAIN');
			assert.strictEqual(result[2].type, 'MATCH');
		});

		it('空数组应该返回空数组', () => {
			const result = converters.rulesStrToRulesObject([]);
			assert.deepStrictEqual(result, []);
		});
	});

	describe('ruleObjectToRuleStr', () => {
		it('应该直接返回字符串类型的规则', () => {
			const result = converters.ruleObjectToRuleStr('MATCH,DIRECT' as any);
			assert.strictEqual(result, 'MATCH,DIRECT');
		});

		it('应该转换2段规则对象为字符串', () => {
			const ruleObj = ['MATCH', 'DIRECT'] as any;
			Object.defineProperties(ruleObj, {
				type: { get() { return ruleObj[0]; } },
				proxy: { get() { return ruleObj[1]; } }
			});
			
			const result = converters.ruleObjectToRuleStr(ruleObj);
			assert.strictEqual(result, 'MATCH,DIRECT');
		});

		it('应该转换3段规则对象为字符串', () => {
			const ruleObj = ['DOMAIN-SUFFIX', 'google.com', 'Proxy'] as any;
			Object.defineProperties(ruleObj, {
				type: { get() { return ruleObj[0]; } },
				value: { get() { return ruleObj[1]; } },
				proxy: { get() { return ruleObj[2]; } }
			});
			
			const result = converters.ruleObjectToRuleStr(ruleObj);
			assert.strictEqual(result, 'DOMAIN-SUFFIX,google.com,Proxy');
		});

		it('应该转换4段规则对象为字符串(带no-resolve)', () => {
			const ruleObj = ['IP-CIDR', '192.168.1.0/24', 'DIRECT', 'no-resolve'] as any;
			Object.defineProperties(ruleObj, {
				type: { get() { return ruleObj[0]; } },
				value: { get() { return ruleObj[1]; } },
				proxy: { get() { return ruleObj[2]; } },
				resolve: { get() { return ruleObj[3]; } }
			});
			
			const result = converters.ruleObjectToRuleStr(ruleObj);
			assert.strictEqual(result, 'IP-CIDR,192.168.1.0/24,DIRECT,no-resolve');
		});
	});

	describe('autoDetectRuleType', () => {
		it('应该识别 DOMAIN-SUFFIX 类型(+.前缀)', () => {
			const result = converters.autoDetectRuleType('+.google.com');
			assert.deepStrictEqual(result, ['DOMAIN-SUFFIX', '+.google.com']);
		});

		it('应该识别 DOMAIN 类型(无前缀)', () => {
			const result = converters.autoDetectRuleType('google.com');
			assert.deepStrictEqual(result, ['DOMAIN', 'google.com']);
		});

		it('应该处理各种域名格式', () => {
			const testCases = [
				{ input: '+.baidu.com', expected: ['DOMAIN-SUFFIX', '+.baidu.com'] },
				{ input: 'baidu.com', expected: ['DOMAIN', 'baidu.com'] },
				{ input: '+.example.org', expected: ['DOMAIN-SUFFIX', '+.example.org'] },
				{ input: 'example.org', expected: ['DOMAIN', 'example.org'] }
			];

			testCases.forEach(({ input, expected }) => {
				const result = converters.autoDetectRuleType(input);
				assert.deepStrictEqual(result, expected, `输入: ${input}`);
			});
		});
	});
});

describe('dedupProxiesInGroup 测试', () => {
	it('应该去除代理列表中的重复项', () => {
		const proxies = ['Proxy1', 'Proxy2', 'Proxy1', 'Proxy3', 'Proxy2'];
		const result = dedupProxiesInGroup(proxies);
		
		assert.strictEqual(result.length, 3);
		assert.ok(result.includes('Proxy1'));
		assert.ok(result.includes('Proxy2'));
		assert.ok(result.includes('Proxy3'));
	});

	it('应该保持原始顺序(首次出现的位置)', () => {
		const proxies = ['A', 'B', 'C', 'A', 'B'];
		const result = dedupProxiesInGroup(proxies);
		
		assert.deepStrictEqual(result, ['A', 'B', 'C']);
	});

	it('空数组应该返回空数组', () => {
		const result = dedupProxiesInGroup([]);
		assert.deepStrictEqual(result, []);
	});

	it('不含重复项的数组应该保持不变', () => {
		const proxies = ['Proxy1', 'Proxy2', 'Proxy3'];
		const result = dedupProxiesInGroup(proxies);
		
		assert.deepStrictEqual(result, proxies);
	});
});

describe('SelectorSymbols 测试', () => {
	it('应该导出所有必需的符号常量', () => {
		assert.ok(SelectorSymbols.Auto, '应该定义 Auto 符号');
		assert.ok(SelectorSymbols.ManualA, '应该定义 ManualA 符号');
		assert.ok(SelectorSymbols.ManualB, '应该定义 ManualB 符号');
		assert.ok(SelectorSymbols.Direct, '应该定义 Direct 符号');
		assert.ok(SelectorSymbols.Reject, '应该定义 Reject 符号');
	});

	it('每个符号应该是唯一的', () => {
		const symbols = Object.values(SelectorSymbols);
		const uniqueSymbols = new Set(symbols);
		
		assert.strictEqual(symbols.length, uniqueSymbols.size, '所有符号应该是唯一的');
	});
});

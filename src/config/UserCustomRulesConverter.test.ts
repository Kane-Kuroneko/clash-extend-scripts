/**
 * 用户自定义三维规则转换器测试
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { User3DRule } from '../types/user-rules';
import { convert3DRuleToMihomoANDRules, convert3DRulesToMihomoRules, validate3DRule } from './UserCustomRulesConverter';

describe('UserCustomRulesConverter', () => {
	describe('convert3DRuleToMihomoANDRules', () => {
		it('应该转换简单的 process + domain 规则', () => {
			const rule: User3DRule = {
				process: 'chrome.exe',
				hosts: [
					{ type: 'DOMAIN-SUFFIX', value: 'google.com' }
				],
				group: '🫧 Proxy A 🫧'
			};
			
			const result = convert3DRuleToMihomoANDRules(rule);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0], 'AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,google.com)),🫧 Proxy A 🫧');
		});
		
		it('应该转换 process + 多个 domain 规则（展开为多条）', () => {
			const rule: User3DRule = {
				process: 'chrome.exe',
				hosts: [
					{ type: 'DOMAIN-SUFFIX', value: 'google.com' },
					{ type: 'DOMAIN-SUFFIX', value: 'googleapis.com' }
				],
				group: '🫧 Proxy A 🫧'
			};
			
			const result = convert3DRuleToMihomoANDRules(rule);
			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0], 'AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,google.com)),🫧 Proxy A 🫧');
			assert.strictEqual(result[1], 'AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,googleapis.com)),🫧 Proxy A 🫧');
		});
		
		it('应该转换 process + domain + ports 规则（笛卡尔积展开）', () => {
			const rule: User3DRule = {
				process: 'steam.exe',
				hosts: [
					{ type: 'DOMAIN-WILDCARD', value: '*.steamcontent.com' }
				],
				ports: [80, 443],
				group: 'DIRECT'
			};
			
			const result = convert3DRuleToMihomoANDRules(rule);
			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0], 'AND,((PROCESS-NAME,steam.exe),(DOMAIN-WILDCARD,*.steamcontent.com),(DST-PORT,80)),DIRECT');
			assert.strictEqual(result[1], 'AND,((PROCESS-NAME,steam.exe),(DOMAIN-WILDCARD,*.steamcontent.com),(DST-PORT,443)),DIRECT');
		});
		
		it('应该处理 process="*" 的情况（忽略进程条件）', () => {
			const rule: User3DRule = {
				process: '*',
				hosts: [
					{ type: 'DOMAIN-SUFFIX', value: 'qoder.com' }
				],
				group: 'DIRECT'
			};
			
			const result = convert3DRuleToMihomoANDRules(rule);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0], 'DOMAIN-SUFFIX,qoder.com,DIRECT');
		});
		
		it('应该支持 noResolve 选项', () => {
			const rule: User3DRule = {
				process: 'myapp.exe',
				hosts: [
					{ type: 'IP-CIDR', value: '192.168.1.0/24' }
				],
				group: 'DIRECT',
				noResolve: true
			};
			
			const result = convert3DRuleToMihomoANDRules(rule);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0], 'AND,((PROCESS-NAME,myapp.exe),(IP-CIDR,192.168.1.0/24)),DIRECT,no-resolve');
		});
		
		it('应该跳过 enabled=false 的规则', () => {
			const rule: User3DRule = {
				process: 'old-app.exe',
				hosts: [
					{ type: 'DOMAIN-SUFFIX', value: 'example.com' }
				],
				group: '🫧 Proxy A 🫧',
				enabled: false
			};
			
			const result = convert3DRuleToMihomoANDRules(rule);
			assert.strictEqual(result.length, 0);
		});
		
		it('应该支持自定义进程匹配类型', () => {
			const rule: User3DRule = {
				process: {
					type: 'PROCESS-NAME-REGEX',
					value: '.*chrome.*'
				},
				hosts: [
					{ type: 'DOMAIN-SUFFIX', value: 'google.com' }
				],
				group: '🫧 Proxy A 🫧'
			};
			
			const result = convert3DRuleToMihomoANDRules(rule);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0], 'AND,((PROCESS-NAME-REGEX,.*chrome.*),(DOMAIN-SUFFIX,google.com)),🫧 Proxy A 🫧');
		});
	});
	
	describe('convert3DRulesToMihomoRules', () => {
		it('应该批量转换多个规则', () => {
			const rules: User3DRule[] = [
				{
					process: 'chrome.exe',
					hosts: [{ type: 'DOMAIN-SUFFIX', value: 'google.com' }],
					group: '🫧 Proxy A 🫧'
				},
				{
					process: 'steam.exe',
					hosts: [{ type: 'DOMAIN-SUFFIX', value: 'steam.com' }],
					ports: [443],
					group: 'DIRECT'
				}
			];
			
			const result = convert3DRulesToMihomoRules(rules);
			assert.strictEqual(result.length, 2);
		});
	});
	
	describe('validate3DRule', () => {
		it('应该验证有效规则', () => {
			const rule: User3DRule = {
				process: 'chrome.exe',
				hosts: [{ type: 'DOMAIN-SUFFIX', value: 'google.com' }],
				group: 'DIRECT'
			};
			
			const result = validate3DRule(rule);
			assert.strictEqual(result.valid, true);
			assert.strictEqual(result.errors.length, 0);
		});
		
		it('应该检测缺少 process 的规则', () => {
			const rule = {
				hosts: [{ type: 'DOMAIN-SUFFIX', value: 'google.com' }],
				group: 'DIRECT'
			} as User3DRule;
			
			const result = validate3DRule(rule);
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.includes('process 字段不能为空'));
		});
		
		it('应该检测空的 hosts 数组', () => {
			const rule: User3DRule = {
				process: 'chrome.exe',
				hosts: [],
				group: 'DIRECT'
			};
			
			const result = validate3DRule(rule);
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.includes('hosts 数组不能为空，至少需要一个域名匹配规则'));
		});
		
		it('应该检测无效的端口', () => {
			const rule: User3DRule = {
				process: 'chrome.exe',
				hosts: [{ type: 'DOMAIN-SUFFIX', value: 'google.com' }],
				ports: [0, 80, 99999],
				group: 'DIRECT'
			};
			
			const result = validate3DRule(rule);
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.length > 0);
		});
		
		it('应该检测缺少 group 的规则', () => {
			const rule = {
				process: 'chrome.exe',
				hosts: [{ type: 'DOMAIN-SUFFIX', value: 'google.com' }]
			} as User3DRule;
			
			const result = validate3DRule(rule);
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.includes('group 字段不能为空'));
		});
	});
});

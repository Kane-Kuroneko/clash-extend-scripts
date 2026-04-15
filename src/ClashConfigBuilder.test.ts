/**
 * ClashConfigBuilder 单元测试
 * 测试 Clash 配置构建器的核心功能
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Clash, Group } from './ClashConfigBuilder';
import { converters } from './RuleConverters';
import type { ClashConfig } from './types/clash';

/**
 * 创建测试用的 Clash 实例
 */
function createTestClashInstance(source?: Partial<ClashConfig>) {
	const defaultSource: Partial<ClashConfig> = {
		proxies: [],
		'proxy-groups': [],
		rules: [],
		...source
	};

	const mockDeps = {
		axios: null,
		yaml: null,
		notify: null,
		console: console
	};

	const mockParams = {
		name: 'test-config',
		url: 'http://test.com',
		interval: 300,
		selected: []
	};

	return new Clash(
		{ source: defaultSource, raw: '' },
		mockDeps as any,
		mockParams
	);
}

describe('Clash 类测试', () => {
	describe('构造函数', () => {
		it('应该正确初始化并清空 proxy-groups 和 rules', () => {
			const source: Partial<ClashConfig> = {
				proxies: [{ name: 'test', type: 'ss', server: 'test.com', port: 443, password: 'test', udp: false }],
				'proxy-groups': [{ name: 'OLD', type: 'select', proxies: [] }],
				rules: ['DOMAIN,old.com,OLD']
			};

			const clash = createTestClashInstance(source);

			assert.deepStrictEqual(clash.source['proxy-groups'], []);
			assert.deepStrictEqual(clash.source.rules, []);
			assert.strictEqual(clash.source.proxies.length, 1);
		});

		it('非对象参数应该抛出异常', () => {
			assert.throws(() => {
				new Clash(
					{ source: 'invalid' as any, raw: '' },
					{ axios: null, yaml: null, notify: null, console: console } as any,
					{ name: 'test', url: '', interval: 0, selected: [] }
				);
			});
		});
	});

	describe('addGroups', () => {
		it('应该添加单个代理组', () => {
			const clash = createTestClashInstance();
			const group = new Group({ name: 'TestGroup', type: 'select', proxies: [] });
			
			clash.addGroups(group);

			assert.strictEqual(clash.source['proxy-groups'].length, 1);
			assert.strictEqual(clash.source['proxy-groups'][0].name, 'TestGroup');
		});

		it('应该添加多个代理组', () => {
			const clash = createTestClashInstance();
			const group1 = new Group({ name: 'Group1', type: 'select', proxies: [] });
			const group2 = new Group({ name: 'Group2', type: 'select', proxies: [] });
			
			clash.addGroups(group1, group2);

			assert.strictEqual(clash.source['proxy-groups'].length, 2);
		});

		it('应该跳过重复的代理组名称', () => {
			const clash = createTestClashInstance();
			const group1 = new Group({ name: 'TestGroup', type: 'select', proxies: [] });
			const group2 = new Group({ name: 'TestGroup', type: 'select', proxies: [] });
			
			clash.addGroups(group1, group2);

			assert.strictEqual(clash.source['proxy-groups'].length, 1);
		});
	});

	describe('renameGroup', () => {
		it('应该重命名代理组', () => {
			const clash = createTestClashInstance();
			const group = new Group({ name: 'OldName', type: 'select', proxies: ['Proxy1'] });
			clash.addGroups(group);

			clash.renameGroup('OldName', 'NewName');

			assert.strictEqual(clash.source['proxy-groups'][0].name, 'NewName');
		});

		it('应该更新规则中的代理组引用', () => {
			const clash = createTestClashInstance();
			// 先添加规则
			clash.addRule('DOMAIN-SUFFIX', 'google.com', 'OldGroup');
			
			const group = new Group({ name: 'OldGroup', type: 'select', proxies: [] });
			clash.addGroups(group);

			clash.renameGroup('OldGroup', 'NewGroup');

			assert.ok(
				clash.source.rules.some((r: string) => r.includes('NewGroup')),
				'规则中应该包含新的代理组名称'
			);
		});

		it('应该更新代理组中的代理引用', () => {
			const clash = createTestClashInstance();
			const group1 = new Group({ name: 'TargetGroup', type: 'select', proxies: [] });
			const group2 = new Group({ name: 'OtherGroup', type: 'select', proxies: ['TargetGroup'] });
			clash.addGroups(group1, group2);

			clash.renameGroup('TargetGroup', 'NewTargetGroup');

			assert.ok(
				group2.proxies.includes('NewTargetGroup'),
				'代理组中的引用应该被更新'
			);
		});
	});

	describe('addProxiesToGroup', () => {
		it('应该向代理组添加前缀代理', () => {
			const clash = createTestClashInstance();
			const group = new Group({ name: 'TestGroup', type: 'select', proxies: ['Existing'] });
			clash.addGroups(group);

			clash.addProxiesToGroup('TestGroup', ['Prefix1', 'Prefix2']);

			assert.deepStrictEqual(
				clash.source['proxy-groups'][0].proxies,
				['Prefix1', 'Prefix2', 'Existing']
			);
		});

		it('应该向代理组添加后缀代理', () => {
			const clash = createTestClashInstance();
			const group = new Group({ name: 'TestGroup', type: 'select', proxies: ['Existing'] });
			clash.addGroups(group);

			clash.addProxiesToGroup('TestGroup', [], ['Suffix1', 'Suffix2']);

			assert.deepStrictEqual(
				clash.source['proxy-groups'][0].proxies,
				['Existing', 'Suffix1', 'Suffix2']
			);
		});

		it('应该去除重复的代理', () => {
			const clash = createTestClashInstance();
			const group = new Group({ name: 'TestGroup', type: 'select', proxies: ['Proxy1'] });
			clash.addGroups(group);

			clash.addProxiesToGroup('TestGroup', ['Proxy1', 'Proxy2']);

			const proxies = clash.source['proxy-groups'][0].proxies;
			assert.strictEqual(
				proxies.filter(p => p === 'Proxy1').length,
				1,
				'Proxy1 不应该重复'
			);
		});

		it('不存在的代理组应该不报错', () => {
			const clash = createTestClashInstance();
			
			// 不应该抛出异常
			clash.addProxiesToGroup('NonExistent', ['Proxy1']);
		});
	});

	describe('replaceGroupTo', () => {
		it('应该替换并删除指定的代理组', () => {
			const clash = createTestClashInstance();
			const group1 = new Group({ name: 'OldGroup', type: 'select', proxies: [] });
			const group2 = new Group({ name: 'OtherGroup', type: 'select', proxies: ['OldGroup'] });
			clash.addGroups(group1, group2);

			clash.replaceGroupTo('OldGroup', 'DIRECT');

			const groups = clash.source['proxy-groups'];
			assert.ok(
				!groups.some(g => g.name === 'OldGroup'),
				'OldGroup 应该被删除'
			);
			assert.ok(
				groups.find(g => g.name === 'OtherGroup')?.proxies.includes('DIRECT'),
				'引用应该被替换为 DIRECT'
			);
		});

		it('应该更新规则中的代理组引用', () => {
			const clash = createTestClashInstance();
			const group1 = new Group({ name: 'OldGroup', type: 'select', proxies: [] });
			clash.addGroups(group1);
			// 添加引用 OldGroup 的规则
			clash.addRule('DOMAIN-SUFFIX', 'google.com', 'OldGroup');

			clash.replaceGroupTo('OldGroup', 'REJECT');

			assert.ok(
				clash.source.rules.some((r: string) => r.includes('REJECT')),
				'规则中的引用应该被更新'
			);
		});
	});

	describe('addRule', () => {
		it('应该在头部添加规则', () => {
			const clash = createTestClashInstance();

			clash.addRule('DOMAIN-SUFFIX', 'google.com', 'Proxy');

			assert.strictEqual(clash.source.rules.length, 1);
			assert.strictEqual(clash.source.rules[0], 'DOMAIN-SUFFIX,google.com,Proxy');
		});

		it('应该在尾部添加规则(tail=true)', () => {
			const clash = createTestClashInstance();
			// 先添加初始规则
			clash.addRule('DOMAIN-SUFFIX', 'first.com', 'Proxy');
			clash.addRule('MATCH', '', 'DIRECT');

			clash.addRule('DOMAIN-SUFFIX', 'last.com', 'Proxy', true);

			const rules = clash.source.rules;
			assert.strictEqual(rules[rules.length - 1], 'MATCH,DIRECT', 'MATCH 应该保持在最后');
			assert.ok(rules.includes('DOMAIN-SUFFIX,last.com,Proxy'));
		});

		it('MATCH 规则应该忽略 tail 参数', () => {
			const clash = createTestClashInstance();
			clash.addRule('DOMAIN-SUFFIX', 'google.com', 'Proxy');

			clash.addRule('MATCH', '', 'DIRECT', true);

			const rules = clash.source.rules;
			assert.strictEqual(rules[rules.length - 1], 'MATCH,DIRECT');
		});

		it('应该拒绝添加重复的规则', () => {
			const clash = createTestClashInstance();
			clash.addRule('DOMAIN-SUFFIX', 'google.com', 'Proxy');

			clash.addRule('DOMAIN-SUFFIX', 'google.com', 'Proxy');

			assert.strictEqual(clash.source.rules.length, 1, '不应该添加重复规则');
		});

		it('应该拒绝添加重复的 MATCH 规则', () => {
			const clash = createTestClashInstance();
			clash.addRule('MATCH', '', 'DIRECT');

			clash.addRule('MATCH', '', 'Proxy');

			assert.strictEqual(clash.source.rules.length, 1, '不应该添加重复的 MATCH 规则');
		});
	});

	describe('addRulesToGroup', () => {
		it('应该批量添加规则到指定分组', () => {
			const clash = createTestClashInstance();

			clash.addRulesToGroup('Proxy', [
				['DOMAIN-SUFFIX', 'google.com'],
				['DOMAIN', 'baidu.com']
			]);

			assert.strictEqual(clash.source.rules.length, 2);
			assert.ok(clash.source.rules.some((r: string) => r.includes('google.com')));
			assert.ok(clash.source.rules.some((r: string) => r.includes('baidu.com')));
		});

		it('新规则应该添加到现有规则前面', () => {
			const clash = createTestClashInstance();
			clash.addRule('DOMAIN-SUFFIX', 'old.com', 'OldGroup');

			clash.addRulesToGroup('NewGroup', [
				['DOMAIN-SUFFIX', 'new.com']
			]);

			assert.strictEqual(clash.source.rules[0], 'DOMAIN-SUFFIX,new.com,NewGroup');
		});
	});

	describe('removeRule', () => {
		it('应该移除匹配的规则', () => {
			const clash = createTestClashInstance();
			// 添加一些规则
			clash.source.rules = [
				'DOMAIN-SUFFIX,google.com,Proxy',
				'DOMAIN-SUFFIX,baidu.com,DIRECT',
				'MATCH,DIRECT'
			];

			clash.removeRule({ type: 'DOMAIN-SUFFIX', value: 'google.com' });

			assert.strictEqual(clash.source.rules.length, 2);
			assert.ok(!clash.source.rules.some((r: string) => r.includes('google.com')));
		});

		it('没有匹配规则时应该不报错', () => {
			const clash = createTestClashInstance();
			clash.source.rules = ['MATCH,DIRECT'];

			clash.removeRule({ type: 'DOMAIN-SUFFIX', value: 'nonexistent.com' });

			assert.strictEqual(clash.source.rules.length, 1);
		});
	});

	describe('规则冲突检查', () => {
		it('checkExistMatchRule 应该检测 MATCH 规则', () => {
			const clash = createTestClashInstance();
			// 直接设置 rules(因为构造函数会清空)
			clash.source.rules = ['MATCH,DIRECT'];
			
			const rules = converters.rulesStrToRulesObject(clash.source.rules);
			assert.ok(clash.checkExistMatchRule(rules), '应该检测到 MATCH 规则');
		});

		it('checkConflictRule 应该检测完全重复的规则', () => {
			const clash = createTestClashInstance();
			// 直接设置 rules
			clash.source.rules = ['DOMAIN-SUFFIX,google.com,Proxy'];
			
			const rules = converters.rulesStrToRulesObject(clash.source.rules);
			
			// 验证规则被正确转换
			assert.strictEqual(rules[0].length, 3, '规则长度应该为3');
			assert.strictEqual(rules[0].type, 'DOMAIN-SUFFIX');
			assert.strictEqual(rules[0].value, 'google.com');
			assert.strictEqual(rules[0].proxy, 'Proxy');
			
			const conflict = clash.checkConflictRule(rules, {
				type: 'DOMAIN-SUFFIX',
				value: 'google.com',
				groupName: 'Proxy'
			});

			assert.ok(conflict, '应该检测到冲突');
		});

		it('addRule 应该拒绝添加重复的规则', () => {
			const clash = createTestClashInstance();
			// 先添加一条规则
			clash.addRule('DOMAIN-SUFFIX', 'google.com', 'Proxy');
			
			const initialLength = clash.source.rules.length;
			// 尝试添加重复规则
			clash.addRule('DOMAIN-SUFFIX', 'google.com', 'Proxy');

			assert.strictEqual(
				clash.source.rules.length,
				initialLength,
				'不应该添加重复规则'
			);
		});
	});
});

describe('Group 类测试', () => {
	it('应该使用默认配置创建代理组', () => {
		const group = new Group({ name: 'TestGroup' });

		assert.strictEqual(group.name, 'TestGroup');
		assert.strictEqual(group.type, 'select');
		assert.deepStrictEqual(group.proxies, []);
	});

	it('应该允许覆盖默认配置', () => {
		const group = new Group({
			name: 'TestGroup',
			type: 'url-test',
			proxies: ['Proxy1', 'Proxy2'],
			url: 'http://test.com',
			interval: 300
		});

		assert.strictEqual(group.type, 'url-test');
		assert.deepStrictEqual(group.proxies, ['Proxy1', 'Proxy2']);
		assert.strictEqual(group.url, 'http://test.com');
		assert.strictEqual(group.interval, 300);
	});
});
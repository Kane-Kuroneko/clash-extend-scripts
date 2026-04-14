/**
 * 业务逻辑集成测试
 * 在虚拟 Clash 客户端环境中运行构建产物，验证真实业务逻辑
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { 
	testMainFunction, 
	testParseFunction,
	validateConfigResult,
	loadAndExecuteBuild
} from './clash-client-host.js';

/**
 * 创建测试用的 Clash 配置
 */
function createTestConfig() {
	return {
		port: 7890,
		'socks-port': 7891,
		'allow-lan': true,
		mode: 'Rule',
		'log-level': 'info',
		proxies: [
			{
				name: 'Test-Proxy-1',
				type: 'ss',
				server: 'test.server.com',
				port: 443,
				cipher: 'aes-256-gcm',
				password: 'test-password'
			},
			{
				name: 'Test-Proxy-2',
				type: 'vmess',
				server: 'test.server2.com',
				port: 8443,
				uuid: 'test-uuid',
				alterId: 0,
				cipher: 'auto',
				tls: true
			},
			{
				name: 'Test-Proxy-3',
				type: 'trojan',
				server: 'test.server3.com',
				port: 443,
				password: 'test-password',
				sni: 'test.server3.com'
			}
		],
		'proxy-groups': [
			{
				name: 'GLOBAL',
				type: 'select',
				proxies: ['Test-Proxy-1', 'Test-Proxy-2', 'Test-Proxy-3']
			},
			{
				name: 'Auto',
				type: 'url-test',
				proxies: ['Test-Proxy-1', 'Test-Proxy-2'],
				url: 'http://www.gstatic.com/generate_204',
				interval: 300
			}
		],
		rules: [
			'DOMAIN-SUFFIX,google.com,GLOBAL',
			'DOMAIN-SUFFIX,baidu.com,DIRECT',
			'MATCH,DIRECT'
		]
	};
}

/**
 * 创建测试用的 YAML 字符串（CFW 用）
 */
function createTestYAML(): string {
	return `
port: 7890
socks-port: 7891
allow-lan: true
mode: Rule
log-level: info
proxies:
  - name: Test-Proxy-1
    type: ss
    server: test.server.com
    port: 443
    cipher: aes-256-gcm
    password: test-password
  - name: Test-Proxy-2
    type: vmess
    server: test.server2.com
    port: 8443
    uuid: test-uuid
    alterId: 0
    cipher: auto
    tls: true
proxy-groups:
  - name: GLOBAL
    type: select
    proxies:
      - Test-Proxy-1
      - Test-Proxy-2
rules:
  - DOMAIN-SUFFIX,google.com,GLOBAL
  - MATCH,DIRECT
`;
}

describe('CVR 客户端业务逻辑测试', () => {
	describe('Global Proxy 模式', () => {
		it('应该正确处理配置并返回修改后的配置对象', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'global-proxy', testConfig);
			
			// 验证执行成功
			assert.ok(result.success, `执行失败: ${result.error?.message}`);
			assert.ok(result.output, '应该返回配置对象');
			
			// 验证配置结构
			const config = result.output;
			assert.ok(config['proxy-groups'], '应该包含 proxy-groups');
			assert.ok(config.rules, '应该包含 rules');
		});

		it('应该移除原有的 GLOBAL 代理组', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'global-proxy', testConfig);
			
			assert.ok(result.success);
			
			const validation = validateConfigResult(result.output, {
				notHasProxyGroups: ['GLOBAL']
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});

		it('应该创建 🫧 Global Proxy 🫧 代理组', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'global-proxy', testConfig);
			
			assert.ok(result.success);
			
			const validation = validateConfigResult(result.output, {
				hasProxyGroups: ['🫧 Global Proxy 🫧']
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});

		it('应该创建 ❄️ China Geo-IP ❄️ 代理组', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'global-proxy', testConfig);
			
			assert.ok(result.success);
			
			const validation = validateConfigResult(result.output, {
				hasProxyGroups: ['❄️ China Geo-IP ❄️']
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});

		it('应该包含 GEOIP,CN 规则', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'global-proxy', testConfig);
			
			assert.ok(result.success);
			
			const config = result.output;
			const hasGeoIPRule = config.rules?.some((r: string) => 
				r.startsWith('GEOIP,CN,')
			);
			
			assert.ok(hasGeoIPRule, '应该包含 GEOIP,CN 规则');
		});

		it('应该包含 MATCH 规则且在末尾', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'global-proxy', testConfig);
			
			assert.ok(result.success);
			
			const config = result.output;
			const lastRule = config.rules?.[config.rules.length - 1];
			
			assert.ok(
				lastRule?.startsWith('MATCH,'),
				'最后一条规则应该是 MATCH'
			);
		});

		it('应该保留所有原始代理到代理组中', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'global-proxy', testConfig);
			
			assert.ok(result.success);
			
			const validation = validateConfigResult(result.output, {
				proxyGroupsContain: ['Test-Proxy-1', 'Test-Proxy-2', 'Test-Proxy-3']
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});

		it('应该处理空配置', () => {
			const result = testMainFunction('cvr', 'global-proxy', undefined as any);
			
			// 空配置应该返回 undefined 或者不报错
			if (result.output !== undefined) {
				assert.ok(
					typeof result.output === 'object' || result.output === null,
					'空配置应该返回 undefined、null 或对象'
				);
			}
		});
	});

	describe('Auto Routing 模式', () => {
		it('应该正确处理配置', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'auto-routing', testConfig);
			
			assert.ok(result.success, `执行失败: ${result.error?.message}`);
			assert.ok(result.output, '应该返回配置对象');
		});

		it('应该创建多个预设代理组', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'auto-routing', testConfig);
			
			assert.ok(result.success);
			
			const expectedGroups = [
				'🫧 Proxy A 🫧',
				'🍀 Proxy B 🍀',
				'❄️ GFW',
				'🌍 Foreign Media',
				'🦚 Region Media',
				'📲 Telegram',
				'🖥 AI',
				'Ⓜ️ Microsoft',
				'🍎 Apple',
				'📥 Download',
				'🐟 Final',
				'🟢 China Direct'
			];
			
			const validation = validateConfigResult(result.output, {
				hasProxyGroups: expectedGroups
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});

		it('应该生成大量规则', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'auto-routing', testConfig);
			
			assert.ok(result.success);
			
			const validation = validateConfigResult(result.output, {
				minRuleCount: 100 // auto-routing 应该有很多规则
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});

		it('应该包含 MATCH 规则且在末尾', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'auto-routing', testConfig);
			
			assert.ok(result.success);
			
			const config = result.output;
			const lastRule = config.rules?.[config.rules.length - 1];
			
			assert.ok(
				lastRule?.startsWith('MATCH,'),
				'最后一条规则应该是 MATCH'
			);
		});

		it('应该包含 GEOIP,CN 规则', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'auto-routing', testConfig);
			
			assert.ok(result.success);
			
			const config = result.output;
			const hasGeoIPRule = config.rules?.some((r: string) => 
				r.startsWith('GEOIP,CN,')
			);
			
			assert.ok(hasGeoIPRule, '应该包含 GEOIP,CN 规则');
		});
	});
});

describe('Clash Party 客户端业务逻辑测试', () => {
	describe('Global Proxy 模式', () => {
		it('应该正确处理配置', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('clash-party', 'global-proxy', testConfig);
			
			assert.ok(result.success, `执行失败: ${result.error?.message}`);
			assert.ok(result.output, '应该返回配置对象');
		});

		it('应该移除原有的 GLOBAL 代理组', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('clash-party', 'global-proxy', testConfig);
			
			assert.ok(result.success);
			
			const validation = validateConfigResult(result.output, {
				notHasProxyGroups: ['GLOBAL']
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});

		it('应该创建 🫧 Global Proxy 🫧 代理组', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('clash-party', 'global-proxy', testConfig);
			
			assert.ok(result.success);
			
			const validation = validateConfigResult(result.output, {
				hasProxyGroups: ['🫧 Global Proxy 🫧']
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});

		it('应该创建 ❄️ China Geo-IP ❄️ 代理组', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('clash-party', 'global-proxy', testConfig);
			
			assert.ok(result.success);
			
			const validation = validateConfigResult(result.output, {
				hasProxyGroups: ['❄️ China Geo-IP ❄️']
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});

		it('应该保留所有原始代理', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('clash-party', 'global-proxy', testConfig);
			
			assert.ok(result.success);
			
			const validation = validateConfigResult(result.output, {
				proxyGroupsContain: ['Test-Proxy-1', 'Test-Proxy-2', 'Test-Proxy-3']
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});
	});

	describe('Auto Routing 模式', () => {
		it('应该正确处理配置', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('clash-party', 'auto-routing', testConfig);
			
			assert.ok(result.success, `执行失败: ${result.error?.message}`);
			assert.ok(result.output, '应该返回配置对象');
		});

		it('应该创建多个预设代理组', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('clash-party', 'auto-routing', testConfig);
			
			assert.ok(result.success);
			
			const expectedGroups = [
				'🫧 Proxy A 🫧',
				'🍀 Proxy B 🍀',
				'❄️ GFW',
				'🌍 Foreign Media'
			];
			
			const validation = validateConfigResult(result.output, {
				hasProxyGroups: expectedGroups
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});

		it('应该生成大量规则', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('clash-party', 'auto-routing', testConfig);
			
			assert.ok(result.success);
			
			const validation = validateConfigResult(result.output, {
				minRuleCount: 100
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});
	});
});

describe('配置转换一致性测试', () => {
	it('CVR 和 Clash Party 在 global-proxy 模式下应该产生相同的结果', () => {
		const testConfig = createTestConfig();
		
		const cvrResult = testMainFunction('cvr', 'global-proxy', testConfig);
		const partyResult = testMainFunction('clash-party', 'global-proxy', testConfig);
		
		assert.ok(cvrResult.success, 'CVR 执行失败');
		assert.ok(partyResult.success, 'Clash Party 执行失败');
		
		// 验证两者都创建了相同的代理组
		const cvrGroups = cvrResult.output['proxy-groups'].map((g: any) => g.name);
		const partyGroups = partyResult.output['proxy-groups'].map((g: any) => g.name);
		
		// 都应该包含这些核心代理组
		const coreGroups = ['🫧 Global Proxy 🫧', '❄️ China Geo-IP ❄️'];
		for (const group of coreGroups) {
			assert.ok(cvrGroups.includes(group), `CVR 缺少 ${group}`);
			assert.ok(partyGroups.includes(group), `Clash Party 缺少 ${group}`);
		}
		
		// 都不应该包含 GLOBAL
		assert.ok(!cvrGroups.includes('GLOBAL'), 'CVR 不应该包含 GLOBAL');
		assert.ok(!partyGroups.includes('GLOBAL'), 'Clash Party 不应该包含 GLOBAL');
	});

	it('CVR 和 Clash Party 在 auto-routing 模式下应该产生相同的结果', () => {
		const testConfig = createTestConfig();
		
		const cvrResult = testMainFunction('cvr', 'auto-routing', testConfig);
		const partyResult = testMainFunction('clash-party', 'auto-routing', testConfig);
		
		assert.ok(cvrResult.success, 'CVR 执行失败');
		assert.ok(partyResult.success, 'Clash Party 执行失败');
		
		// 验证规则数量相似
		const cvrRuleCount = cvrResult.output.rules.length;
		const partyRuleCount = partyResult.output.rules.length;
		
		// 允许小幅差异
		const diff = Math.abs(cvrRuleCount - partyRuleCount);
		assert.ok(
			diff < 10,
			`规则数量差异过大: CVR=${cvrRuleCount}, Clash Party=${partyRuleCount}`
		);
	});
});

describe('边界情况和错误处理', () => {
	it('应该处理缺少 proxies 的配置', () => {
		const minimalConfig = {
			port: 7890,
			'proxy-groups': [],
			rules: []
		};
		
		const result = testMainFunction('cvr', 'global-proxy', minimalConfig);
		
		// 不应该抛出异常
		assert.ok(result.success || result.output !== undefined);
	});

	it('应该处理空的 proxy-groups', () => {
		const config = {
			port: 7890,
			proxies: [
				{
					name: 'Test-Proxy',
					type: 'ss',
					server: 'test.com',
					port: 443,
					cipher: 'aes-256-gcm',
					password: 'test'
				}
			],
			'proxy-groups': [],
			rules: []
		};
		
		const result = testMainFunction('cvr', 'global-proxy', config);
		
		assert.ok(result.success, '应该能处理空的 proxy-groups');
	});

	it('应该处理空的 rules', () => {
		const config = {
			port: 7890,
			proxies: [
				{
					name: 'Test-Proxy',
					type: 'ss',
					server: 'test.com',
					port: 443,
					cipher: 'aes-256-gcm',
					password: 'test'
				}
			],
			'proxy-groups': [
				{
					name: 'GLOBAL',
					type: 'select',
					proxies: ['Test-Proxy']
				}
			],
			rules: []
		};
		
		const result = testMainFunction('cvr', 'global-proxy', config);
		
		assert.ok(result.success, '应该能处理空的 rules');
		// 应该添加自己的规则
		assert.ok(result.output.rules.length > 0, '应该生成规则');
	});
});

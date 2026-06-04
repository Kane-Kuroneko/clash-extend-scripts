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

const AI_GROUP = '🖥 AI';

const AI_ROUTING_TEST_HOSTS = [
	// OpenAI / ChatGPT
	'openai.com',
	'chatgpt.com',
	'chat.openai.com',
	'api.openai.com',
	'sentinel.openai.com',
	'cdn.openai.com',
	'auth.openai.com',
	'bzrcdn.openai.com',
	'oaiusercontent.com',
	'oaistatic.com',
	
	// Anthropic / Claude
	'anthropic.com',
	'claude.ai',
	'api.anthropic.com',
	'console.anthropic.com',
	
	// Google AI / Gemini
	'ai.google',
	'gemini.google.com',
	'generativelanguage.googleapis.com',
	'ai.google.dev',
	
	// Microsoft Copilot
	'copilot.microsoft.com',
	'copilot.cloud.microsoft',
	'sydney.bing.com',
	
	// 其他主流 AI 服务
	'perplexity.ai',
	'midjourney.com',
	'stability.ai',
	'huggingface.co',
	'mistral.ai',
	'openrouter.ai'
] as const;

function normalizeDomain(value: string): string {
	return value.replace(/^\+\./, '').toLowerCase();
}

function domainMatchesSuffix(hostname: string, suffix: string): boolean {
	const normalizedHostname = hostname.toLowerCase();
	const normalizedSuffix = normalizeDomain(suffix);
	
	return normalizedHostname === normalizedSuffix || normalizedHostname.endsWith(`.${normalizedSuffix}`);
}

function findFirstDomainRuleMatch(rules: string[], hostname: string) {
	for (const [index, rule] of rules.entries()) {
		const [type, value, group] = rule.split(',');
		
		if (type === 'DOMAIN' && normalizeDomain(value) === hostname.toLowerCase()) {
			return { index, rule, type, value, group };
		}
		
		if (type === 'DOMAIN-SUFFIX' && domainMatchesSuffix(hostname, value)) {
			return { index, rule, type, value, group };
		}
		
		if (type === 'DOMAIN-KEYWORD' && hostname.toLowerCase().includes(value.toLowerCase())) {
			return { index, rule, type, value, group };
		}
		
		if (type === 'MATCH') {
			return { index, rule, type, value: '', group: value };
		}
	}
	
	return null;
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
			const matchRules = config.rules?.filter((r: string) => 
				r.startsWith('MATCH,')
			) || [];
			const lastRule = config.rules?.[config.rules.length - 1];
			
			assert.strictEqual(
				matchRules.length,
				1,
				`应该只保留当前模式生成的尾部 MATCH，实际: ${matchRules.join(' | ')}`
			);
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
			const matchRules = config.rules?.filter((r: string) => 
				r.startsWith('MATCH,')
			) || [];
			const lastRule = config.rules?.[config.rules.length - 1];
			
			assert.strictEqual(
				matchRules.length,
				1,
				`应该只保留当前模式生成的尾部 MATCH，实际: ${matchRules.join(' | ')}`
			);
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

		it('应该保留 CVR 原始 rules 中指向 🍀 Proxy B 🍀 的规则', () => {
			const testConfig = createTestConfig();
			testConfig.rules.unshift('DOMAIN-SUFFIX,dola.com,🍀 Proxy B 🍀');
			
			const result = testMainFunction('cvr', 'auto-routing', testConfig);
			
			assert.ok(result.success, `执行失败: ${result.error?.message}`);
			
			const rules = result.output.rules || [];
			assert.ok(
				rules.includes('DOMAIN-SUFFIX,dola.com,🍀 Proxy B 🍀'),
				'dola.com 应该保留指向 Proxy B'
			);
			assert.ok(
				!rules.includes('DOMAIN-SUFFIX,dola.com,🫧 Proxy A 🫧'),
				'dola.com 不应该被改写到 Proxy A'
			);
		});

		it('应该包含大量 Microsoft 规则', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'auto-routing', testConfig);
			
			assert.ok(result.success);
			
			const config = result.output;
			const microsoftRules = config.rules?.filter((r: string) => 
				r.includes('Microsoft')
			) || [];
			
			// Microsoft 规则应该有 70+ 条(包括 DOMAIN-KEYWORD 和 DOMAIN-SUFFIX)
			assert.ok(
				microsoftRules.length >= 70,
				`Microsoft 规则数量不足: 期望至少 70 条,实际 ${microsoftRules.length} 条`
			);
		});

		it('Microsoft 规则应该包含 DOMAIN-KEYWORD 和 DOMAIN-SUFFIX 类型', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'auto-routing', testConfig);
			
			assert.ok(result.success);
			
			const config = result.output;
			const microsoftRules = config.rules?.filter((r: string) => 
				r.includes('Microsoft')
			) || [];
			
			const hasKeywordRules = microsoftRules.some((r: string) => 
				r.startsWith('DOMAIN-KEYWORD,')
			);
			const hasSuffixRules = microsoftRules.some((r: string) => 
				r.startsWith('DOMAIN-SUFFIX,')
			);
			
			assert.ok(hasKeywordRules, '应该包含 DOMAIN-KEYWORD 类型的 Microsoft 规则');
			assert.ok(hasSuffixRules, '应该包含 DOMAIN-SUFFIX 类型的 Microsoft 规则');
		});

		it('Microsoft 规则应该覆盖主要微软服务域名', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'auto-routing', testConfig);
			
			assert.ok(result.success);
			
			const config = result.output;
			const microsoftRules = config.rules?.filter((r: string) => 
				r.includes('Microsoft')
			).join(',');
			
			// 验证关键微软服务域名
			// 注意: microsoft.com 不在规则中,因为有 DOMAIN-KEYWORD,microsoft 可以匹配
			const criticalDomains = [
				'office.com',
				'windows.com',
				'live.com',
				'outlook.com',
				'onedrive.com',
				'azure.com',
				'xboxlive.com',
				'hotmail.com',
				'skype.com',
				'sharepoint.com'
			];
			
			for (const domain of criticalDomains) {
				assert.ok(
					microsoftRules.includes(domain),
					`Microsoft 规则应该包含 ${domain}`
				);
			}
			
			// 验证有 DOMAIN-KEYWORD,microsoft 规则
			assert.ok(
				microsoftRules.includes('DOMAIN-KEYWORD,microsoft'),
				'Microsoft 规则应该包含 DOMAIN-KEYWORD,microsoft'
			);
		});

		it('应该保留 GFW、Apple 和 Telegram 的非媒体规则覆盖', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'auto-routing', testConfig);
			
			assert.ok(result.success);
			
			const rules = result.output.rules || [];
			
			assert.ok(
				rules.includes('DOMAIN-SUFFIX,google.com,❄️ GFW'),
				'GFW 规则不应该被国外媒体过滤器误删'
			);
			assert.ok(
				rules.includes('DOMAIN-SUFFIX,apps.apple.com,🍎 Apple'),
				'Apple 规则不应该被国外媒体过滤器误删'
			);
			assert.ok(
				rules.includes('IP-CIDR,91.108.4.0/22,📲 Telegram,no-resolve'),
				'Telegram IPv4 CIDR 规则应该被保留'
			);
		});
	});

	describe('AI 分流规则测试', () => {
		it('应该创建 🖥 AI 代理组', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'auto-routing', testConfig);
			
			assert.ok(result.success);
			
			const validation = validateConfigResult(result.output, {
				hasProxyGroups: ['🖥 AI']
			});
			
			assert.ok(
				validation.success,
				`验证失败: ${validation.messages.join(', ')}`
			);
		});

		it('主流 AI 厂商域名的首条匹配应该走 AI 分组而不是 MATCH', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('cvr', 'auto-routing', testConfig);
			
			assert.ok(result.success, `执行失败: ${result.error?.message}`);
			
			const config = result.output;
			assert.ok(Array.isArray(config.rules), '应该生成 rules 数组');
			
			for (const hostname of AI_ROUTING_TEST_HOSTS) {
				const match = findFirstDomainRuleMatch(config.rules, hostname);
				
				assert.ok(match, `${hostname} 应该至少匹配到一条规则`);
				assert.notStrictEqual(
					match.type,
					'MATCH',
					`${hostname} 不应该漏到 MATCH，实际首条匹配: ${match.rule}`
				);
				assert.strictEqual(
					match.group,
					AI_GROUP,
					`${hostname} 应该首条匹配到 ${AI_GROUP}，实际首条匹配: ${match.rule}`
				);
			}
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

		it('应该包含 Microsoft 规则', () => {
			const testConfig = createTestConfig();
			const result = testMainFunction('clash-party', 'auto-routing', testConfig);
			
			assert.ok(result.success);
			
			const config = result.output;
			const microsoftRules = config.rules?.filter((r: string) => 
				r.includes('Microsoft')
			) || [];
			
			// Microsoft 规则应该有 70+ 条
			assert.ok(
				microsoftRules.length >= 70,
				`Microsoft 规则数量不足: 期望至少 70 条,实际 ${microsoftRules.length} 条`
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

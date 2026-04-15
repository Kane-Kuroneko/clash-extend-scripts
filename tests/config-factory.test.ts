/**
 * ConfigFactory 单元测试
 * 测试配置工厂的模式分发功能
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { ConfigFactory } from '../src/config/ConfigFactory';
import { AutoRoutingGroup } from '../src/AutoRoutingConfig';
import { GlobalRestrictedGroup } from '../src/config/GlobalRestrictedGroup';

// Mock 编译时规则数据(在模块加载前注入)
const mockCompileTimeRules = {
	Loyalsoldier_GFW: ['google.com', 'facebook.com', 'twitter.com'],
	Loyalsoldier_Proxy: ['netflix.com', 'youtube.com', 'spotify.com'],
	Loyalsoldier_Telegram: ['telegram.org', 't.me'],
	Loyalsoldier_Microsoft: ['microsoft.com', 'windows.com', 'office.com'],
	Loyalsoldier_Apple: ['apple.com', 'icloud.com'],
	Loyalsoldier_Direct: ['baidu.com', 'qq.com', 'taobao.com'],
	CN_bilibili: ['bilibili.com'],
	ITNL_bilibili: ['+.*.bilibili.com'],
	Blocked_By_GFW: ['+.google.com']
};

// 注入全局变量
(global as any).__CompileTime_Rules__ = mockCompileTimeRules;

describe('ConfigFactory 测试', () => {
	describe('createConfig', () => {
		const mockSource = {
			source: {
				proxies: [
					{ name: 'Proxy1', type: 'ss', server: 'test.com', port: 443, password: 'test', udp: false }
				],
				'proxy-groups': [],
				rules: []
			},
			raw: ''
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

		it('global-proxy 模式应该创建 GlobalRestrictedGroup 实例', () => {
			const config = ConfigFactory.createConfig(
				'global-proxy',
				mockSource as any,
				mockDeps as any,
				mockParams
			);

			assert.ok(config instanceof GlobalRestrictedGroup, '应该创建 GlobalRestrictedGroup 实例');
		});

		it('auto-routing 模式应该创建 AutoRoutingGroup 实例', () => {
			const config = ConfigFactory.createConfig(
				'auto-routing',
				mockSource as any,
				mockDeps as any,
				mockParams
			);

			assert.ok(config instanceof AutoRoutingGroup, '应该创建 AutoRoutingGroup 实例');
		});

		it('未知模式应该抛出异常', () => {
			assert.throws(
				() => {
					ConfigFactory.createConfig(
						'unknown-mode' as any,
						mockSource as any,
						mockDeps as any,
						mockParams
					);
				},
				/Error/,
				'应该抛出包含错误信息的异常'
			);
		});

		it('GlobalRestrictedGroup 应该包含正确的预设分组', () => {
			const config = ConfigFactory.createConfig(
				'global-proxy',
				mockSource as any,
				mockDeps as any,
				mockParams
			) as GlobalRestrictedGroup;

			assert.ok(config.presetGroups['China-Geo-IP'], '应该包含 China-Geo-IP 分组');
			assert.ok(config.source.rules.length > 0, '应该包含规则');
		});

		it('AutoRoutingGroup 应该包含大量的自动路由规则', () => {
			const config = ConfigFactory.createConfig(
				'auto-routing',
				mockSource as any,
				mockDeps as any,
				mockParams
			) as AutoRoutingGroup;

			// auto-routing 模式应该有规则(由于mock数据较小,只验证有规则即可)
			assert.ok(config.source.rules.length > 0, 'auto-routing 应该生成规则');
			
			// 应该包含预设的功能分组
			const groupNames = config.source['proxy-groups'].map(g => g.name);
			assert.ok(groupNames.some(name => name.includes('GFW')), '应该包含 GFW 分组');
			assert.ok(groupNames.some(name => name.includes('Proxy A')), '应该包含 Proxy A 分组');
			assert.ok(groupNames.some(name => name.includes('Foreign Media')), '应该包含 Foreign Media 分组');
		});
	});

	describe('模式特性验证', () => {
		it('global-proxy 模式应该只有少量规则', () => {
			const mockSource = {
				source: {
					proxies: [
						{ name: 'Proxy1', type: 'ss', server: 'test.com', port: 443, password: 'test', udp: false }
					],
					'proxy-groups': [],
					rules: []
				},
				raw: ''
			};

			const config = ConfigFactory.createConfig(
				'global-proxy',
				mockSource as any,
				{ axios: null, yaml: null, notify: null, console: console } as any,
				{ name: 'test', url: '', interval: 0, selected: [] }
			) as GlobalRestrictedGroup;

			// global-proxy 应该只有 2 条核心规则: GEOIP 和 MATCH
			assert.ok(config.source.rules.length <= 5, 'global-proxy 应该只有少量规则');
		});

		it('auto-routing 模式应该保留原始代理列表', () => {
			const mockSource = {
				source: {
					proxies: [
						{ name: 'Proxy1', type: 'ss', server: 'test.com', port: 443, password: 'test', udp: false },
						{ name: 'Proxy2', type: 'vmess', server: 'test2.com', port: 8443, uuid: 'test', alterId: 0, cipher: 'auto', tls: true }
					],
					'proxy-groups': [],
					rules: []
				},
				raw: ''
			};

			const config = ConfigFactory.createConfig(
				'auto-routing',
				mockSource as any,
				{ axios: null, yaml: null, notify: null, console: console } as any,
				{ name: 'test', url: '', interval: 0, selected: [] }
			) as AutoRoutingGroup;

			assert.strictEqual(config.proxiesList.length, 2, '应该保留所有代理');
			assert.ok(config.proxiesList.includes('Proxy1'));
			assert.ok(config.proxiesList.includes('Proxy2'));
		});
	});
});

describe('配置实例完整性测试', () => {
	it('GlobalRestrictedGroup 应该正确初始化所有必要字段', () => {
		const mockSource = {
			source: {
				proxies: [],
				'proxy-groups': [],
				rules: []
			},
			raw: ''
		};

		const config = new GlobalRestrictedGroup(
			mockSource as any,
			{ axios: null, yaml: null, notify: null, console: console } as any,
			{ name: 'test', url: '', interval: 0, selected: [] }
		);

		// 验证基本结构
		assert.ok(config.source, '应该有 source 属性');
		assert.ok(Array.isArray(config.source['proxy-groups']), 'proxy-groups 应该是数组');
		assert.ok(Array.isArray(config.source.rules), 'rules 应该是数组');
	});

	it('AutoRoutingGroup 应该正确初始化所有必要字段', () => {
		const mockSource = {
			source: {
				proxies: [],
				'proxy-groups': [],
				rules: []
			},
			raw: ''
		};

		const config = new AutoRoutingGroup(
			mockSource as any,
			{ axios: null, yaml: null, notify: null, console: console } as any,
			{ name: 'test', url: '', interval: 0, selected: [] }
		);

		// 验证基本结构
		assert.ok(config.source, '应该有 source 属性');
		assert.ok(Array.isArray(config.source['proxy-groups']), 'proxy-groups 应该是数组');
		assert.ok(Array.isArray(config.source.rules), 'rules 应该是数组');
		assert.ok(Array.isArray(config.proxiesList), '应该有 proxiesList 属性');
	});
});

/**
 * 全局代理模式配置
 * 只处理两条规则：GEOIP,CN 和 MATCH
 */

// ESM Imports (按重要程度排序: 业务模块 > 类型)
import { RoutingConfig } from './RoutingConfig';
import { Group } from '../ClashConfigBuilder';
import { SelectorSymbols } from '../RuleConverters';
import type { ClientDependencies, ClientParams, ClientSource } from '../types/client';

export class GlobalRestrictedGroup extends RoutingConfig {
	presetGroups = {
		[SelectorSymbols.ManualA]: '🅰️ 自选节点 🅰️',
		'China-Geo-IP': '🇨🇳 大陆Geo-IP',
		[SelectorSymbols.Fallback]: '🛡️ 后备线路',
		[SelectorSymbols.Direct]: '🟢 Bypass',
		[SelectorSymbols.Reject]: '🔴 Block',
		[SelectorSymbols.LoadBalanceHash]: '⚖️ 负载均衡-散列',
		[SelectorSymbols.LoadBalanceRound]: '⚖️ 负载均衡-轮询',
	};
	
	constructor(
		{ source, raw }: ClientSource,
		{ axios, yaml, notify, console }: ClientDependencies,
		{ name, url, interval, selected }: ClientParams
	) {
		super(
			{ source, raw },
			{ axios, yaml, notify, console },
			{ name, url, interval, selected }
		);
		
		// 配置简单规则
		this.source['rules'] = [
			`GEOIP,CN,${this.presetGroups['China-Geo-IP']}`,
			`MATCH,${this.presetGroups[SelectorSymbols.ManualA]}`,
		];
		
		// 配置分组
		this.configureGroups({ name, url, interval, selected });
	}
	
	configureRules(): void {
		// Global 模式规则已在构造函数中设置
	}
	
	configureGroups({ name, url, interval, selected }: ClientParams): void {
		this.addManualSelect({ name, url, interval, selected });
		this.addLoadBalance({ name, url, interval, selected });
		this.addFallback({ name, url, interval, selected });
	}
	
	addManualSelect({ name, url, interval, selected }: ClientParams) {
		this.addGroups(
			new Group({
				name: this.presetGroups[SelectorSymbols.ManualA],
				type: 'select',
				proxies: [
					this.presetGroups[SelectorSymbols.Reject],
					this.presetGroups[SelectorSymbols.Direct],
					this.presetGroups[SelectorSymbols.LoadBalanceHash],
					this.presetGroups[SelectorSymbols.LoadBalanceRound],
					this.presetGroups[SelectorSymbols.Fallback],
					...this.proxiesList,
				],
			})
		);
		
		this.addGroups(
			new Group({
				name: this.presetGroups['China-Geo-IP'],
				type: 'select',
				proxies: [
					this.presetGroups[SelectorSymbols.Reject],
					this.presetGroups[SelectorSymbols.Direct],
					this.presetGroups[SelectorSymbols.ManualA],
					this.presetGroups[SelectorSymbols.LoadBalanceHash],
					this.presetGroups[SelectorSymbols.LoadBalanceRound],
					this.presetGroups[SelectorSymbols.Fallback],
					...this.proxiesList,
				],
			})
		);
	}
	
	addLoadBalance({ name, url, interval, selected }: ClientParams) {
		this.addGroups(
			new Group({
				name: this.presetGroups[SelectorSymbols.LoadBalanceHash],
				type: 'load-balance',
				strategy: 'consistent-hashing',
				proxies: [
					this.presetGroups[SelectorSymbols.Reject],
					this.presetGroups[SelectorSymbols.Direct],
					...this.proxiesList,
				],
				url: 'http://www.gstatic.com/generate_204',
				interval: 180,
			}),
			new Group({
				name: this.presetGroups[SelectorSymbols.LoadBalanceRound],
				type: 'load-balance',
				strategy: 'round-robin',
				proxies: [
					this.presetGroups[SelectorSymbols.Reject],
					this.presetGroups[SelectorSymbols.Direct],
					...this.proxiesList,
				],
				url: 'http://www.gstatic.com/generate_204',
				interval: 180,
			})
		);
	}
	
	addFallback({ name, url, interval, selected }: ClientParams) {
		this.addGroups(
			new Group({
				name: this.presetGroups[SelectorSymbols.Fallback],
				type: 'fallback',
				proxies: [
					this.presetGroups[SelectorSymbols.Reject],
					this.presetGroups[SelectorSymbols.Direct],
					...this.proxiesList,
				],
				url: 'http://www.gstatic.com/generate_204',
				interval: 180,
			})
		);
	}
}

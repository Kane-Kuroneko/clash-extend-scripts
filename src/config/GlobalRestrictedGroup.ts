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
		[SelectorSymbols.ManualA]: '🫧 Global Proxy 🫧',
		'China-Geo-IP': '❄️ China Geo-IP ❄️',
		[SelectorSymbols.Direct]: 'DIRECT',
		[SelectorSymbols.Reject]: 'REJECT',
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
		
		// 移除预设的 GLOBAL 分组（Clash Party 自带）
		if (Array.isArray(source['proxy-groups'])) {
			source['proxy-groups'] = source['proxy-groups'].filter(
				group => group.name.toUpperCase() !== 'GLOBAL'
			);
		}
		
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
		// 添加手动选择组
		this.addManualSelect({ name, url, interval, selected });
	}
	
	addManualSelect({ name, url, interval, selected }: ClientParams) {
		this.addGroups(
			new Group({
				name: this.presetGroups[SelectorSymbols.ManualA],
				type: 'select',
				proxies: [
					this.presetGroups[SelectorSymbols.Reject],
					this.presetGroups[SelectorSymbols.Direct],
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
					...this.proxiesList,
				],
			})
		);
	}
	
}

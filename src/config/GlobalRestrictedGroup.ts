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
		
		// 处理并合并用户原始rules
		const convertedRules = this.convertOriginalRules();
		
		// 配置简单规则（合并用户原始rules）
		this.source['rules'] = [
			...convertedRules,
			`GEOIP,CN,${this.presetGroups['China-Geo-IP']}`,
			`MATCH,${this.presetGroups[SelectorSymbols.ManualA]}`,
		];
		
		// 去重处理
		this.source['rules'] = this.deduplicateRules(this.source['rules']);
		
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
	
	/**
	 * 转换用户原始rules的group名称
	 * - block/REJECT/DIRECT 保持不变
	 * - 其他group统一转换为 ProxyA
	 */
	convertOriginalRules(): string[] {
		const proxyAGroup = this.presetGroups[SelectorSymbols.ManualA];
		const originalRules = this.originalRules || [];
		
		if (originalRules.length === 0) {
			return [];
		}
		
		console.log(`✅ 加载并转换用户原始rules: ${originalRules.length} 条`);
		
		return originalRules.flatMap(rule => {
			const parts = rule.split(',');
			if (parts.length < 2) {
				// 格式不正确的rule，原样返回
				return [rule];
			}
			
			// 原始 MATCH 会遮蔽当前模式追加的 GEOIP 和最终 MATCH。
			if (parts[0] === 'MATCH') {
				return [];
			}
			
			// 普通规则: TYPE,value,group 或 TYPE,value,group,no-resolve
			if (parts.length >= 3) {
				const group = parts[2];
				// block/REJECT/DIRECT 保持不变
				if (group === 'block' || group === 'REJECT' || group === 'DIRECT') {
					return [rule];
				}
				// 其他group转换为ProxyA
				if (parts.length === 4) {
					// 带no-resolve的规则
					return [`${parts[0]},${parts[1]},${proxyAGroup},${parts[3]}`];
				}
				return [`${parts[0]},${parts[1]},${proxyAGroup}`];
			}
			
			// 其他情况原样返回
			return [rule];
		});
	}
	
	/**
	 * 去重rules（保留首次出现的规则）
	 */
	deduplicateRules(rules: string[]): string[] {
		const seen = new Set<string>();
		const result: string[] = [];
		
		for (const rule of rules) {
			if (!seen.has(rule)) {
				seen.add(rule);
				result.push(rule);
			}
		}
		
		return result;
	}
	
}

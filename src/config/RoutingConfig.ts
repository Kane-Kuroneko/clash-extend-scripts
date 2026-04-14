/**
 * 路由配置基类
 */

// ESM Imports (按重要程度排序: 业务模块 > 类型)
import { Clash, Group } from '../ClashConfigBuilder';
import { SelectorSymbols, converters, dedupProxiesInGroup } from '../RuleConverters';
import type { ClientDependencies, ClientParams, ClientSource } from '../types/client';
import type { ClashConfig, ClashProxyItem } from '../types/clash';

// 原生实现 isPlainObject
const isPlainObject = (obj: unknown): boolean => {
	return obj !== null && 
		typeof obj === 'object' && 
		Object.prototype.toString.call(obj) === '[object Object]';
};

export abstract class RoutingConfig extends Clash {
	proxiesList: string[];
	
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
		
		if (!isPlainObject(source)) {
			console.log(source);
			throw '参数<source>必须是个clash对象';
		}
		
		source['proxy-groups'] = source['proxy-groups'] || [];
		this.proxiesList = source.proxies?.map((proxy: ClashProxyItem) => proxy.name) || [];
	}
	
	/**
	 * 抽象方法：子类必须实现规则配置
	 */
	abstract configureRules(): void;
	
	/**
	 * 抽象方法：子类必须实现分组配置
	 */
	abstract configureGroups(params: ClientParams): void;
}

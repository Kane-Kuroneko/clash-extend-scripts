/**
 * Clash Party 客户端适配器
 */

// ESM Imports (按重要程度排序: 业务模块 > 第三方库 > 类型)
import yaml from 'yaml';
import { Nothing } from 'nothing-mock';
import { ClientAdapter } from './ClientAdapter';
import { ConfigFactory } from '../config/ConfigFactory';
import type { RoutingMode } from '../types/build';
import type { ClientDependencies, ClientParams } from '../types/client';
import type { ClashConfig } from '../types/clash';

export interface ClashPartyConfig extends ClashConfig {
	/**
	 * 代理提供者配置
	 */
	'proxy-providers'?: Record<string, ProxyProvider>;
	
	/**
	 * 规则提供者配置
	 */
	'rule-providers'?: Record<string, RuleProvider>;
	
	/**
	 * 脚本配置（Clash Party 特有）
	 */
	'script'?: {
		code?: string;
		shortcuts?: Record<string, string>;
	};
}

export interface ProxyProvider {
	/**
	 * 提供者类型
	 */
	type: 'http' | 'file' | 'compatible';
	
	/**
	 * HTTP 类型的 URL 地址
	 */
	url?: string;
	
	/**
	 * 本地文件路径
	 */
	path?: string;
	
	/**
	 * 过滤器（正则表达式）
	 */
	'filter'?: string;
	
	/**
	 * 排除过滤器（正则表达式）
	 */
	'exclude-filter'?: string;
	
	/**
	 * 包含全部代理
	 */
	'include-all'?: boolean;
	
	/**
	 * 健康检查配置
	 */
	'health-check'?: {
		enable: boolean;
		url: string;
		interval: number;
	};
	
	/**
	 * 更新间隔（秒）
	 */
	interval?: number;
}

export interface RuleProvider {
	/**
	 * 提供者类型
	 */
	type: 'http' | 'file';
	
	/**
	 * HTTP 类型的 URL 地址
	 */
	url?: string;
	
	/**
	 * 本地文件路径
	 */
	path?: string;
	
	/**
	 * 规则行为类型
	 */
	behavior: 'domain' | 'ipcidr' | 'classical';
	
	/**
	 * 规则格式
	 */
	format?: 'yaml' | 'text';
	
	/**
	 * 更新间隔（秒）
	 */
	interval?: number;
}

export interface ClashPartyProxyGroup {
	name: string;
	type: string;
	proxies?: string[];
	url?: string;
	interval?: number;
	strategy?: string;
	/**
	 * 图标 URL
	 */
	icon?: string;
	
	/**
	 * 包含全部代理（从 proxy-providers）
	 */
	'include-all'?: boolean;
	
	/**
	 * 排除过滤器（正则表达式）
	 */
	'exclude-filter'?: string;
	
	/**
	 * 过滤器（正则表达式）
	 */
	filter?: string;
}

export class ClashPartyAdapter extends ClientAdapter {
	constructor(mode: RoutingMode) {
		super(mode);
	}
	
	parse(): string {
		throw new Error('Clash Party 客户端不支持 parse 函数');
	}
	
	main(config?: Partial<ClashConfig>): Partial<ClashConfig> | void {
		if (!config) {
			console.warn('config 参数为空');
			return config;
		}
		
		console.log('Clash Party Override Script Started');
		console.log('原始代理数量:', config.proxies?.length || 0);
		console.log('原始规则数量:', config.rules?.length || 0);
		
		const globalConf = ConfigFactory.createConfig(
			this.mode,
			{ source: config, raw: null },
			{ axios: Nothing, yaml, notify: Nothing, console },
			{ name: undefined, url: undefined, interval: undefined, selected: undefined }
		);
		
		console.log('Clash Party Override Script Completed');
		console.log('配置后的代理组数量:', globalConf.source['proxy-groups']?.length || 0);
		console.log('配置后的规则数量:', globalConf.source.rules?.length || 0);
		
		return globalConf.source;
	}
}

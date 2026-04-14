/**
 * 配置生成器工厂
 * 根据分流模式返回对应的配置实例
 */

import { AutoRoutingGroup } from '../AutoRoutingConfig';
import { GlobalRestrictedGroup } from './GlobalRestrictedGroup';
import type { ClientDependencies, ClientParams, ClientSource } from '../types/client';
import type { RoutingMode } from '../types/build';

export class ConfigFactory {
	/**
	 * 根据模式创建配置实例
	 */
	static createConfig(
		mode: RoutingMode,
		source: ClientSource,
		deps: ClientDependencies,
		params: ClientParams
	) {
		switch (mode) {
			case 'global-proxy':
				return new GlobalRestrictedGroup(source, deps, params);
			case 'auto-routing':
				return new AutoRoutingGroup(source, deps, params);
			default:
				throw new Error(`未知的分流模式: ${mode}`);
		}
	}
}

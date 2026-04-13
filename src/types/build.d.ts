/**
 * 构建配置类型
 */

export type ClientType = 'cfw' | 'cvr' | 'clash-party';
export type RoutingMode = 'global-proxy' | 'auto-routing';

export interface BuildConfig {
	client: ClientType;
	mode: RoutingMode;
}

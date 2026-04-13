/**
 * 客户端运行时依赖和参数类型
 */

export type YAML = typeof import('yaml');

export interface ClientDependencies {
	axios: unknown;
	yaml: YAML;
	notify: unknown;
	console: Console;
}

export interface ClientParams {
	name: string;
	url: string;
	interval: number;
	selected: string[];
}

export interface ClientSource {
	source: Partial<import('./clash').ClashConfig>;
	raw: string;
}

/**
 * CFW 客户端参数
 */
export interface CFWParseParams {
	raw: string;
	deps: ClientDependencies;
	params: ClientParams;
}

/**
 * CVR 客户端参数
 */
export interface CVRMainParams {
	config?: Partial<import('./clash').ClashConfig>;
	profileName?: string;
}

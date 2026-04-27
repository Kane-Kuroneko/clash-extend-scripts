/**
 * 构建配置类型
 */

export type ClientType = 'cfw' | 'cvr' | 'clash-party';
export type RoutingMode = 'global-proxy' | 'auto-routing';

export interface BuildConfig {
	client: ClientType;
	mode: RoutingMode;
}

/**
 * 编译时全局变量类型声明
 */

import type { UserCustomRulesConfig } from '../config/UserCustomRules';

declare const __MAIN__: string;
declare const __ROUTING_MODE__: RoutingMode;
declare const __CompileTime_Rules__: {
	CN_bilibili: string[];
	ITNL_bilibili: string[];
	Blocked_By_GFW: string[];
	Loyalsoldier_GFW: string[];
	Loyalsoldier_Proxy: string[];
	Loyalsoldier_Telegram: string[];
	Loyalsoldier_Apple: string[];
	Loyalsoldier_Direct: string[];
	Microsoft: string[];
};


declare global{
	const __USER_CUSTOM_RULES__: UserCustomRulesConfig;
}

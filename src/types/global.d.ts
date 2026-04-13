/**
 * 全局类型声明
 */

/// <reference path="./clash.d.ts" />

declare global {
	//@ts-ignore Lodash 全局实例
	const _: typeof import('lodash');
	
	// 编译时规则
	const __CompileTime_Rules__: Awaited<ReturnType<typeof import('../../CompileTimeScripts/fetch-rules')['fetchRules']>>;
	
	// 构建时注入的分流模式
	const __ROUTING_MODE__: 'global-proxy' | 'auto-routing';
}

export {};

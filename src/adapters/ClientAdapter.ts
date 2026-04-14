/**
 * 客户端适配器基类
 * 处理不同客户端的入口函数差异
 */

export abstract class ClientAdapter {
	protected mode: RoutingMode;
	
	constructor(mode: RoutingMode) {
		this.mode = mode;
	}
	
	/**
	 * 获取构建时注入的分流模式
	 */
	getRoutingMode(): RoutingMode {
		return this.mode;
	}
	
	/**
	 * CFW 客户端的 parse 函数
	 */
	abstract parse(
		raw: string,
		deps: ClientDependencies,
		params: ClientParams
	): string;
	
	/**
	 * CVR 客户端的 main 函数
	 */
	abstract main(config?: Partial<ClashConfig>, profileName?: string): Partial<ClashConfig> | void;
}

// ESM Imports (类型导入)
import type { RoutingMode } from '../types/build';
import type { ClientDependencies, ClientParams } from '../types/client';
import type { ClashConfig } from '../types/clash';

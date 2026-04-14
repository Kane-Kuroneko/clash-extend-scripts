/**
 * CVR 客户端适配器
 */

// ESM Imports (按重要程度排序: 业务模块 > 第三方库 > 类型)
import { Nothing } from 'nothing-mock';
import { ClientAdapter } from './ClientAdapter';
import { ConfigFactory } from '../config/ConfigFactory';
import type { RoutingMode } from '../types/build';
import type { ClientDependencies, ClientParams } from '../types/client';
import type { ClashConfig } from '../types/clash';

export class CVRAdapter extends ClientAdapter {
	constructor(mode: RoutingMode) {
		super(mode);
	}
	
	parse(): string {
		throw new Error('CVR 客户端不支持 parse 函数');
	}
	
	main(config?: Partial<ClashConfig>, profileName?: string): Partial<ClashConfig> | void {
		if (!config) return;
		
		const globalConf = ConfigFactory.createConfig(
			this.mode,
			{ source: config, raw: null },
			{ axios: Nothing, yaml: Nothing, notify: Nothing, console },
			{ name: undefined, url: undefined, interval: undefined, selected: undefined }
		);
		
		console.log(globalConf.source["proxy-groups"]);
		return globalConf.source;
	}
}

/**
 * CFW 客户端适配器
 */

export class CFWAdapter extends ClientAdapter {
	constructor(mode: RoutingMode) {
		super(mode);
	}
	
	parse(
		raw: string,
		{ axios, yaml, notify, console }: ClientDependencies,
		{ name, url, interval, selected }: ClientParams
	): string {
		try {
			const source = yaml.parse(raw);
			
			const config = ConfigFactory.createConfig(
				this.mode,
				{ source, raw },
				{ axios, yaml, notify, console },
				{ name, url, interval, selected }
			);
			
			return config.raw;
		} catch (e) {
			console.log(e, 'errrrrrrrrrrrrrrr');
			return JSON.stringify(e.toString());
		}
	}
	
	main(): void {
		throw new Error('CFW 客户端不支持 main 函数');
	}
}

// ESM Imports (按重要程度排序: 内部模块 > 类型)
import { ClientAdapter } from './ClientAdapter';
import { ConfigFactory } from '../config/ConfigFactory';
import type { RoutingMode } from '../types/build';
import type { ClientDependencies, ClientParams } from '../types/client';

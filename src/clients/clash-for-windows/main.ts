/**
 * CFW 客户端入口
 * 此代码可将任意vpn供应商的节点替换为指定分流配置
 */

import { CFWAdapter } from '../../adapters/CFWAdapter';
import type { YAML } from '../../types/client';

// __ROUTING_MODE__ 会在构建时通过 DefinePlugin 注入
const adapter = new CFWAdapter(__ROUTING_MODE__);

export const parse = (
	raw: string,
	{ axios, yaml, notify, console }: { axios: unknown, yaml: YAML, notify: unknown, console: Console },
	{ name, url, interval, selected }: { name: string, url: string, interval: number, selected: string[] },
) => {
	return adapter.parse(raw, { axios, yaml, notify, console }, { name, url, interval, selected });
};

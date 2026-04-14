// Clash Party Override Script Entry Point
// 基于 Clash Party (Mihomo Party) 的覆写脚本规范

// __ROUTING_MODE__ 会在构建时通过 DefinePlugin 注入
const adapter = new ClashPartyAdapter(__ROUTING_MODE__);

/**
 * Clash Party 覆写脚本主函数
 * @param config - Clash 配置文件对象
 * @returns 修改后的配置对象
 */
export function main(config?) {
	return adapter.main(config);
}

//@ts-ignore
// __MAIN__;

// 防止 webpack 优化掉 main 函数
main;

// ESM Imports
import { ClashPartyAdapter } from '../../adapters/ClashPartyAdapter';

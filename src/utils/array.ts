/**
 * 数组工具函数
 */

/**
 * 数组去重，保持原始顺序
 * @param array - 要去重的数组
 * @returns 去重后的数组
 */
export const deduplicateArray = <T>(array: T[]): T[] => {
	return [...new Set(array)];
};

/**
 * 代理列表去重（保持向后兼容的别名）
 * @param proxies - 代理列表
 * @returns 去重后的代理列表
 */
export const dedupProxiesInGroup = (proxies: string[]): string[] => {
	return deduplicateArray(proxies);
};

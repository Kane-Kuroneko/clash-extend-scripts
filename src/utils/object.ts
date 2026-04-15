/**
 * 对象工具函数
 */

/**
 * 检查是否为纯对象
 * @param obj - 要检查的值
 * @returns 如果是纯对象返回 true，否则返回 false
 */
export const isPlainObject = (obj: unknown): boolean => {
	return obj !== null && 
		typeof obj === 'object' && 
		Object.prototype.toString.call(obj) === '[object Object]';
};

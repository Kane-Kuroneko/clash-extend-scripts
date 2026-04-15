/**
 * 字符串工具函数
 */

/**
 * 自动检测规则类型
 * 根据域名格式判断是 DOMAIN-SUFFIX 还是 DOMAIN
 * @param value - 域名值
 * @returns [规则类型, 域名值]
 * 
 * @example
 * autoDetectRuleType('+.baidu.com')  // ['DOMAIN-SUFFIX', '+.baidu.com']
 * autoDetectRuleType('baidu.com')    // ['DOMAIN', 'baidu.com']
 */
export const autoDetectRuleType = (value: string): ['DOMAIN-SUFFIX' | 'DOMAIN', string] => {
	if (value.startsWith('+.')) {
		return ['DOMAIN-SUFFIX', value];
	} else {
		return ['DOMAIN', value];
	}
};

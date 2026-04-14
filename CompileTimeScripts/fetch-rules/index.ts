export const fetchRules = async () => {
	// 并行获取所有规则,每个请求带重试机制
	const [
		CN_bilibili_result,
		INTL_bilibili_result,
		Blocked_By_GFW_result,
		Loyalsoldier_GFW_result,
		Loyalsoldier_Proxy_result,
		Loyalsoldier_Telegram_result,
		Loyalsoldier_Microsoft_result,
		Loyalsoldier_Apple_result,
		Loyalsoldier_Direct_result,
	] = await Promise.all([
		fetchWithRetry('CN_bilibili', () => fetchGithubRules(CN_bilibili)),
		fetchWithRetry('INTL_bilibili', () => fetchGithubRules(INTL_bilibili)),
		fetchWithRetry('Blocked_By_GFW', () => fetchGithubRules(Blocked_By_GFW)),
		fetchWithRetry('Loyalsoldier_GFW', () => fetchLoyalsoldierRules(Loyalsoldier_GFW)),
		fetchWithRetry('Loyalsoldier_Proxy', () => fetchLoyalsoldierRules(Loyalsoldier_Proxy)),
		fetchWithRetry('Loyalsoldier_Telegram', () => fetchLoyalsoldierRules(Loyalsoldier_Telegram)),
		fetchWithRetry('Loyalsoldier_Microsoft', () => fetchLoyalsoldierRules(Loyalsoldier_Microsoft)),
		fetchWithRetry('Loyalsoldier_Apple', () => fetchLoyalsoldierRules(Loyalsoldier_Apple)),
		fetchWithRetry('Loyalsoldier_Direct', () => fetchLoyalsoldierDirect(Loyalsoldier_Direct_Filtered)),
	]);

	return {
		CN_bilibili: CN_bilibili_result,
		ITNL_bilibili: INTL_bilibili_result,
		Blocked_By_GFW: Blocked_By_GFW_result,
		Loyalsoldier_GFW: Loyalsoldier_GFW_result,
		Loyalsoldier_Proxy: Loyalsoldier_Proxy_result,
		Loyalsoldier_Telegram: Loyalsoldier_Telegram_result,
		Loyalsoldier_Microsoft: Loyalsoldier_Microsoft_result,
		Loyalsoldier_Apple: Loyalsoldier_Apple_result,
		Loyalsoldier_Direct: Loyalsoldier_Direct_result,
	};
}

export const fetchGithubRules = (url:string) => fetch( url , {
	// mode : 'no-cors',
	headers : {
		"Accept" : "application/vnd.github.v3+json",
	},
} ).
then( res => res.text() ).
then( ( text ) => {
	const json: ResContents = parse( text );
	return json.payload;
} );

/**
 * 获取Loyalsoldier/clash-rules规则
 * 直接从raw.githubusercontent.com获取YAML文件
 * 只保留DOMAIN相关规则,过滤掉IP-CIDR规则
 */
export const fetchLoyalsoldierRules = (url: string) => fetch(url)
	.then(res => res.text())
	.then(text => {
		// 解析YAML格式的规则文件
		const yaml: ResContents = parse(text);
		if (!yaml.payload || !Array.isArray(yaml.payload)) return [];
		
		// 过滤并提取域名
		return yaml.payload
			.filter(rule => {
				// 过滤掉 IP-CIDR 和 IP-CIDR6 规则
				return !rule.startsWith('IP-CIDR,') && !rule.startsWith('IP-CIDR6,');
			})
			.map(rule => {
				// 处理 '+.domain.com' 格式(表示 DOMAIN-SUFFIX)
				if (rule.startsWith('+.')) {
					return rule.substring(2); // 去掉 '+.' 前缀
				}
				// 处理 'DOMAIN,xxx' 或 'DOMAIN-SUFFIX,xxx' 格式
				if (rule.includes(',')) {
					const parts = rule.split(',');
					return parts[1];
				}
				// 其他情况直接返回
				return rule;
			});
	});

/**
 * 获取直连规则(智能筛选版)
 * 从 direct.txt 中提取高频国内站点,控制体积在合理范围
 * 筛选策略:
 * 1. 优先保留短域名(一级/二级域名)
 * 2. 保留常见国内服务关键词
 * 3. 限制总数量在 5000 条以内
 */
export const fetchLoyalsoldierDirect = (url: string) => fetch(url)
	.then(res => res.text())
	.then(text => {
		const yaml: ResContents = parse(text);
		if (!yaml.payload || !Array.isArray(yaml.payload)) return [];
		
		// 过滤并提取域名
		const domains = yaml.payload
			.filter(rule => {
				// 只保留 DOMAIN 相关规则
				return !rule.startsWith('IP-CIDR,') && !rule.startsWith('IP-CIDR6,');
			})
			.map(rule => {
				// 处理 '+.domain.com' 格式
				if (rule.startsWith('+.')) {
					return rule.substring(2);
				}
				// 处理 'DOMAIN,xxx' 或 'DOMAIN-SUFFIX,xxx' 格式
				if (rule.includes(',')) {
					const parts = rule.split(',');
					return parts[1];
				}
				return rule;
			})
			.filter(domain => domain && domain.length > 0);
		
		// 智能筛选策略
		return smartFilterDirectDomains(domains);
	});

/**
 * 带重试机制的 fetch 包装器
 * @param name 规则名称(用于日志)
 * @param fetchFn 获取规则的函数
 * @param maxRetries 最大重试次数(默认3次)
 */
async function fetchWithRetry<T>(
	name: string,
	fetchFn: () => Promise<T>,
	maxRetries: number = 3
): Promise<T> {
	let lastError: Error | null = null;
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const result = await fetchFn();
			if (attempt > 1) {
				console.log(`✅ [${name}] 重试成功 (第${attempt}次尝试)`);
			}
			return result;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			console.warn(`⚠️ [${name}] 第${attempt}次尝试失败: ${lastError.message}`);
			
			// 如果不是最后一次尝试,等待一段时间后重试
			if (attempt < maxRetries) {
				const delay = 1000 * attempt; // 递增延迟: 1s, 2s, 3s
				console.log(`   等待 ${delay}ms 后重试...`);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
	}
	
	// 所有重试都失败
	throw new Error(`[${name}] 失败: 已重试${maxRetries}次仍失败 - ${lastError?.message}`);
}

/**
 * 智能筛选直连域名
 * 保留高频国内站点,去除长尾域名
 */
function smartFilterDirectDomains(domains: string[]): string[] {
	// 常见国内服务关键词(高优先级)
	const priorityKeywords = [
		'baidu', 'alipay', 'taobao', 'tmall', 'jd', 'weixin', 'qq', 'wechat',
		'163', 'netease', 'sina', 'sohu', 'iqiyi', 'youku', 'tudou',
		'bilibili', 'acfun', 'douyin', 'tiktok', 'xiaomi', 'huawei', 'oppo', 'vivo',
		'zhihu', 'weibo', 'douban', 'meituan', 'eleme', 'ctrip', 'qunar',
		'alicdn', 'aliyun', 'qcloud', 'bcebos', 'bdstatic',
		'china', 'cn', 'gov.cn', 'edu.cn',
		'bank', 'icbc', 'cmb', 'ccb', 'abc', 'boc',
		'sf-express', 'sto', 'yto', 'yunda', 'zto',
	];
	
	// 策略1: 优先保留包含关键词的域名
	const priorityDomains = domains.filter(domain => 
		priorityKeywords.some(keyword => domain.toLowerCase().includes(keyword))
	);
	
	// 策略2: 保留短域名(长度 <= 20 的域名,通常是主流站点)
	const shortDomains = domains.filter(domain => 
		domain.length <= 20 && !priorityDomains.includes(domain)
	);
	
	// 策略3: 如果还不够,补充剩余域名(限制总数)
	const maxDomains = 5000;
	const remainingSlots = maxDomains - priorityDomains.length - shortDomains.length;
	
	if (remainingSlots > 0) {
		const otherDomains = domains.filter(domain => 
			!priorityDomains.includes(domain) && !shortDomains.includes(domain)
		).slice(0, remainingSlots);
		
		return [...priorityDomains, ...shortDomains, ...otherDomains];
	}
	
	return [...priorityDomains, ...shortDomains];
}

type ResContents = {
	payload : string[],
};

import { parse } from 'yaml';

import { CN_bilibili } from './bilibili.cn';
import { INTL_bilibili } from './bilibili.intl';
import { Blocked_By_GFW } from './blocked-by-gfw';

// Loyalsoldier/clash-rules 规则源 URL (release分支)
const LOYALSOLDIER_BASE = 'https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release';

export const Loyalsoldier_GFW = `${LOYALSOLDIER_BASE}/gfw.txt`;
export const Loyalsoldier_Proxy = `${LOYALSOLDIER_BASE}/proxy.txt`;
export const Loyalsoldier_Direct = `${LOYALSOLDIER_BASE}/direct.txt`; // 直连域名列表(需配合筛选)
export const Loyalsoldier_Telegram = `${LOYALSOLDIER_BASE}/telegram.txt`;
export const Loyalsoldier_Microsoft = `${LOYALSOLDIER_BASE}/microsoft.txt`;
export const Loyalsoldier_Apple = `${LOYALSOLDIER_BASE}/apple.txt`;
export const Loyalsoldier_Direct_Filtered = `${LOYALSOLDIER_BASE}/direct.txt`; // 智能筛选版直连规则
// export const Loyalsoldier_Reject = `${LOYALSOLDIER_BASE}/reject.txt`; // 已移除,174K条规则太大

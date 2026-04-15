export const fetchRules = async () => {
	// 并行获取所有规则,每个请求带重试机制
	const [
		CN_bilibili_result,
		INTL_bilibili_result,
		Blocked_By_GFW_result,
		Loyalsoldier_GFW_result,
		Loyalsoldier_Proxy_result,
		Loyalsoldier_Telegram_result,
		Loyalsoldier_Apple_result,
		Loyalsoldier_Direct_result,
		Microsoft_result,
	] = await Promise.all([
		fetchWithRetry('CN_bilibili', () => fetchGithubRules(CN_bilibili)),
		fetchWithRetry('INTL_bilibili', () => fetchGithubRules(INTL_bilibili)),
		fetchWithRetry('Blocked_By_GFW', () => fetchGithubRules(Blocked_By_GFW)),
		fetchWithRetry('Loyalsoldier_GFW', () => fetchLoyalsoldierRules(Loyalsoldier_GFW)),
		fetchWithRetry('Loyalsoldier_Proxy', () => fetchLoyalsoldierRules(Loyalsoldier_Proxy)),
		fetchWithRetry('Loyalsoldier_Telegram', () => fetchLoyalsoldierRules(Loyalsoldier_Telegram)),
		fetchWithRetry('Loyalsoldier_Apple', () => fetchLoyalsoldierRules(Loyalsoldier_Apple)),
		fetchWithRetry('Loyalsoldier_Direct', () => fetchLoyalsoldierDirect(Loyalsoldier_Direct_Filtered)),
		fetchWithRetry('Microsoft', () => fetchMicrosoftRules(Microsoft_Rules)),
	]);

	return {
		CN_bilibili: CN_bilibili_result,
		ITNL_bilibili: INTL_bilibili_result,
		Blocked_By_GFW: Blocked_By_GFW_result,
		Loyalsoldier_GFW: Loyalsoldier_GFW_result,
		Loyalsoldier_Proxy: Loyalsoldier_Proxy_result,
		Loyalsoldier_Telegram: Loyalsoldier_Telegram_result,
		Loyalsoldier_Apple: Loyalsoldier_Apple_result,
		Loyalsoldier_Direct: Loyalsoldier_Direct_result,
		Microsoft: Microsoft_result,
	};
}

export const fetchGithubRules = (url:string) => fetch( url , {
	// mode : 'no-cors',
	headers : {
		"Accept" : "application/vnd.github.v3+json",
		"User-Agent" : "Clash-Parser/1.0"  // 添加 User-Agent 避免被拒绝
	},
	// 增加超时控制
	signal: AbortSignal.timeout(30000)  // 30秒超时
} ).
then( res => {
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}: ${res.statusText}`);
	}
	return res.text();
} ).
then( ( text ) => {
	const json: ResContents = parse( text );
	return json.payload;
} );

/**
 * 获取Loyalsoldier/clash-rules规则
 * 直接从raw.githubusercontent.com获取YAML文件
 * 只保留DOMAIN相关规则,过滤掉IP-CIDR规则
 */
export const fetchLoyalsoldierRules = (url: string) => fetch(url, {
	headers: {
		"User-Agent" : "Clash-Parser/1.0"
	},
	signal: AbortSignal.timeout(30000)  // 30秒超时
})
	.then(res => {
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}
		return res.text();
	})
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
export const fetchLoyalsoldierDirect = (url: string) => fetch(url, {
	headers: {
		"User-Agent" : "Clash-Parser/1.0"
	},
	signal: AbortSignal.timeout(30000)  // 30秒超时
})
	.then(res => {
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}
		return res.text();
	})
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
 * 获取 Microsoft 规则
 * 从 clash-rules-lite 仓库获取 Microsoft 相关域名规则
 * 支持 DOMAIN-KEYWORD 和 DOMAIN-SUFFIX 格式
 */
export const fetchMicrosoftRules = (url: string) => fetch(url, {
	headers: {
		"User-Agent" : "Clash-Parser/1.0"
	},
	signal: AbortSignal.timeout(30000)  // 30秒超时
})
	.then(res => {
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}
		return res.text();
	})
	.then(text => {
		const yaml: ResContents = parse(text);
		if (!yaml.payload || !Array.isArray(yaml.payload)) return [];
		
		// 返回完整的规则字符串(包括 DOMAIN-KEYWORD 和 DOMAIN-SUFFIX)
		return yaml.payload
			.filter(rule => {
				// 过滤掉 IP-CIDR 规则
				return !rule.startsWith('IP-CIDR,') && !rule.startsWith('IP-CIDR6,');
			})
			.map(rule => {
				// 提取规则部分(去掉前面的 '- ' 如果存在)
				const cleanedRule = rule.startsWith('- ') ? rule.substring(2) : rule;
				return cleanedRule;
			});
	});

/**
 * 带重试机制的 fetch 包装器
 * @param name 规则名称(用于日志)
 * @param fetchFn 获取规则的函数
 * @param maxRetries 最大重试次数(默认5次)
 */
async function fetchWithRetry<T>(
	name: string,
	fetchFn: () => Promise<T>,
	maxRetries: number = 5
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
				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 指数退避: 1s, 2s, 4s, 8s, 最大10s
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
	console.log(`[smartFilterDirectDomains] 原始域名数量: ${domains.length}`);
	
	const maxDomains = 5000;
	
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
	
	// 策略1: 优先保留包含关键词的域名(限制3000条)
	const maxPriority = 3000;
	const priorityDomains = domains
		.filter(domain => 
			priorityKeywords.some(keyword => domain.toLowerCase().includes(keyword))
		)
		.slice(0, maxPriority);
	console.log(`[smartFilterDirectDomains] 策略1-关键词匹配: ${priorityDomains.length} 条`);
	
	// 策略2: 保留短域名(长度 <= 15 的域名,限制1500条)
	const prioritySet = new Set(priorityDomains); // 使用 Set 提升性能
	const maxShort = maxDomains - priorityDomains.length;
	const shortDomains = domains
		.filter(domain => 
			domain.length <= 15 && !prioritySet.has(domain)
		)
		.slice(0, maxShort);
	console.log(`[smartFilterDirectDomains] 策略2-短域名: ${shortDomains.length} 条`);
	
	const result = [...priorityDomains, ...shortDomains];
	console.log(`[smartFilterDirectDomains] 最终筛选结果: ${result.length} 条`);
	return result;
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

// 其他规则源
const CLASH_RULES_LITE_BASE = 'https://raw.githubusercontent.com/zhanyeye/clash-rules-lite/main';

export const Loyalsoldier_GFW = `${LOYALSOLDIER_BASE}/gfw.txt`;
export const Loyalsoldier_Proxy = `${LOYALSOLDIER_BASE}/proxy.txt`;
export const Loyalsoldier_Direct = `${LOYALSOLDIER_BASE}/direct.txt`; // 直连域名列表(需配合筛选)
export const Loyalsoldier_Telegram = `${LOYALSOLDIER_BASE}/telegramcidr.txt`; // Telegram IP 地址列表
export const Loyalsoldier_Apple = `${LOYALSOLDIER_BASE}/apple.txt`;
export const Loyalsoldier_Direct_Filtered = `${LOYALSOLDIER_BASE}/direct.txt`; // 智能筛选版直连规则
export const Microsoft_Rules = `${CLASH_RULES_LITE_BASE}/microsoft-rules.txt`; // Microsoft 规则
// export const Loyalsoldier_Reject = `${LOYALSOLDIER_BASE}/reject.txt`; // 已移除,174K条规则太大

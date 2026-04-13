export const fetchRules = async () => {
	
	return {
		CN_bilibili : await fetchGithubRules(CN_bilibili),
		ITNL_bilibili : await fetchGithubRules( INTL_bilibili ),
		Blocked_By_GFW : await fetchGithubRules( Blocked_By_GFW ),
		
		// Loyalsoldier/clash-rules 规则源
		// 只保留必要的代理规则,移除 Direct(118K条) 和 Reject(174K条) 以控制体积
		Loyalsoldier_GFW : await fetchLoyalsoldierRules( Loyalsoldier_GFW ),
		Loyalsoldier_Proxy : await fetchLoyalsoldierRules( Loyalsoldier_Proxy ),
		Loyalsoldier_Telegram : await fetchLoyalsoldierRules( Loyalsoldier_Telegram ),
		Loyalsoldier_Microsoft : await fetchLoyalsoldierRules( Loyalsoldier_Microsoft ),
		Loyalsoldier_Apple : await fetchLoyalsoldierRules( Loyalsoldier_Apple ),
		
	}
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
// export const Loyalsoldier_Direct = `${LOYALSOLDIER_BASE}/direct.txt`; // 已移除,118K条规则太大
export const Loyalsoldier_Telegram = `${LOYALSOLDIER_BASE}/telegram.txt`;
export const Loyalsoldier_Microsoft = `${LOYALSOLDIER_BASE}/microsoft.txt`;
export const Loyalsoldier_Apple = `${LOYALSOLDIER_BASE}/apple.txt`;
// export const Loyalsoldier_Reject = `${LOYALSOLDIER_BASE}/reject.txt`; // 已移除,174K条规则太大

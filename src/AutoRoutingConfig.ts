/**
 * 自动路由模式配置
 * 基于 Loyalsoldier/clash-rules 规则源
 */

// ESM Imports (按重要程度排序: 业务模块 > 类型)
import type { ClashConfig, RuleType } from './types/clash';
import { SelectorSymbols, converters } from './RuleConverters';
import { Clash, Group } from './ClashConfigBuilder';
import type { YAML } from './types/client';
import type { UserCustomRulesConfig } from './types/user-rules';
import { convert3DRulesToMihomoRules, validate3DRules } from './config/UserCustomRulesConverter';

const SUPPORTED_RULE_TYPES = new Set([
	'DOMAIN-SUFFIX',
	'DOMAIN',
	'DOMAIN-KEYWORD',
	'IP-CIDR',
	'IP-CIDR6',
	'SRC-IP-CIDR',
	'GEOIP',
	'PROCESS-NAME',
	'DST-PORT',
	'SRC-PORT',
	'MATCH',
]);

export class AutoRoutingGroup extends Clash {
	presetGroups = {
		[SelectorSymbols.Direct] : 'DIRECT' ,
		[SelectorSymbols.Reject] : 'REJECT' ,
		[SelectorSymbols.ManualA] : '🫧 Proxy A 🫧' ,
		[SelectorSymbols.ManualB] : '🍀 Proxy B 🍀' ,
		// GFW屏蔽的站点
		'gfw' : '❄️ GFW' ,
		// 国外媒体
		'foreign-media' : '🌍 Foreign Media' ,
		// 地区限制媒体(含b站等)
		'region-media' : '🦚 Region Media' ,
		// Telegram
		'telegram' : '📲 Telegram' ,
		// AI服务
		'AI' : '🖥 AI' ,
		// 微软服务
		'microsoft' : 'Ⓜ️ Microsoft' ,
		// 苹果服务
		'apple' : '🍎 Apple' ,
		// 国际下载
		'download' : '📥 Download' ,
		// 漏网之鱼
		'final' : '🐟 Final' ,
		// 直连分组(可选DIRECT/REJECT/代理)
		'direct-group' : '🟢 China Direct' ,
	};
	
	/**
	 * 所有线路的名称列表
	 * @type {string[]}
	 */
	proxiesList: string[];
	
	/**
	 * 用户自定义规则
	 * @type {UserCustomRulesConfig}
	 */
	userRules: UserCustomRulesConfig;
	
	constructor(
		{ source , raw }: { source: Partial<ClashConfig>, raw: string } ,
		{ axios , yaml , notify , console }: { axios: unknown, yaml: YAML, notify: unknown, console: Console } ,
		{ name , url , interval , selected }: { name: string, url: string, interval: number, selected: string[] } ,
	) {
		super(
			{ source , raw } ,
			{ axios , yaml , notify , console } ,
			{ name , url , interval , selected } ,
		);
		
		// proxy-groups 和 rules 已在 Clash 基类中清空，此处不需要再次清空
		// 注意：不能重新赋值 this.source = source，否则会覆盖基类中已清空的配置
		this.console = console;
		this.yaml = yaml;
		this.proxiesList = source.proxies.map( ( proxy ) => proxy.name );
		
		// 加载用户自定义规则（通过编译时注入）
		this.userRules = typeof __USER_CUSTOM_RULES__ !== 'undefined' 
			? __USER_CUSTOM_RULES__ 
			: { rules3D: [], simpleRules: { prepend: [], append: [] }, groups: [] };
		
		// 构建规则
		this.buildRules();
		
		// 添加分组
		this.addManualGroups( { name , url , interval , selected } );
		this.addDistributionGroups( { name , url , interval , selected } );
	}
	
	/**
	 * 添加手动切换分组
	 */
	addManualGroups( { name , url , interval , selected } ) {
		this.addGroups(
			new Group( {
				name : this.presetGroups[SelectorSymbols.ManualA] ,
				proxies : [
					this.presetGroups[SelectorSymbols.Reject] ,
					this.presetGroups[SelectorSymbols.Direct] ,
					...this.proxiesList ,
				] ,
			} ) ,
			new Group( {
				name : this.presetGroups[SelectorSymbols.ManualB] ,
				proxies : [
					this.presetGroups[SelectorSymbols.Reject] ,
					this.presetGroups[SelectorSymbols.Direct] ,
					...this.proxiesList ,
				] ,
			} ) ,
			// 直连分组(可选DIRECT/REJECT/代理节点)
			new Group( {
				name : this.presetGroups['direct-group'] ,
				type : 'select' ,
				proxies : [
					this.presetGroups[SelectorSymbols.Direct] ,
					this.presetGroups[SelectorSymbols.Reject] ,
					this.presetGroups[SelectorSymbols.ManualA] ,
					this.presetGroups[SelectorSymbols.ManualB] ,
					...this.proxiesList ,
				] ,
			} ) ,
			// Region Media 分组
			new Group( {
				name : this.presetGroups['region-media'] ,
				proxies : [
					this.presetGroups[SelectorSymbols.Reject] ,
					this.presetGroups[SelectorSymbols.Direct] ,
					this.presetGroups[SelectorSymbols.ManualA] ,
					this.presetGroups[SelectorSymbols.ManualB] ,
					...this.proxiesList ,
				] ,
			} ) ,
			// Download 分组
			new Group( {
				name : this.presetGroups['download'] ,
				proxies : [
					this.presetGroups[SelectorSymbols.Reject] ,
					this.presetGroups[SelectorSymbols.Direct] ,
					this.presetGroups[SelectorSymbols.ManualA] ,
					this.presetGroups[SelectorSymbols.ManualB] ,
					...this.proxiesList ,
				] ,
			} ) ,
			// GFW 分组
			new Group( {
				name : this.presetGroups['gfw'] ,
				proxies : [
					this.presetGroups[SelectorSymbols.Reject] ,
					this.presetGroups[SelectorSymbols.Direct] ,
					this.presetGroups[SelectorSymbols.ManualA] ,
					this.presetGroups[SelectorSymbols.ManualB] ,
					...this.proxiesList ,
				] ,
			} ) ,
		);
	}
	
	/**
	 * 添加功能分流组
	 */
	addDistributionGroups( { name , url , interval , selected } ) {
		const _proxies = [
			this.presetGroups[SelectorSymbols.Reject] ,
			this.presetGroups[SelectorSymbols.Direct] ,
			this.presetGroups[SelectorSymbols.ManualA] ,
			this.presetGroups[SelectorSymbols.ManualB] ,
			...this.proxiesList ,
		];
		
		const groups = [
			new Group( {
				name : this.presetGroups['foreign-media'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.presetGroups['telegram'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.presetGroups['AI'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.presetGroups['microsoft'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.presetGroups['apple'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.presetGroups['final'] ,
				proxies : _proxies ,
			} ) ,
		];
		this.addGroups( ...groups );
		
		// 添加用户自定义代理组
		if (this.userRules.groups && this.userRules.groups.length > 0) {
			const customGroups = this.userRules.groups.map(g => 
				new Group({
					name: g.name,
					type: (g.type === 'fallback' ? 'select' : g.type) || 'select',
					proxies: g.proxies || [],
					url: g.url,
					interval: g.interval,
					strategy: g.strategy as 'consistent-hashing' | 'round-robin' | undefined
				})
			);
			this.addGroups(...customGroups);
			console.log(`✅ 加载用户自定义代理组: ${customGroups.length} 个`);
		}
	}
	
	/**
	 * 构建规则
	 */
	buildRules() {
		const rules: string[] = [];
		
		// 1. 用户自定义三维规则（转换为 AND 规则，最高优先级）
		if (this.userRules.rules3D && this.userRules.rules3D.length > 0) {
			// 验证规则
			const validationResults = validate3DRules(this.userRules.rules3D);
			const invalidRules = validationResults.filter(r => !r.valid);
			
			if (invalidRules.length > 0) {
				console.warn('⚠️ 发现无效的用户规则:');
				invalidRules.forEach(({ rule, errors }) => {
					console.warn(`  - ${rule.description || '未命名规则'}: ${errors.join(', ')}`);
				});
			}
			
			// 转换有效规则
			const validRules = this.userRules.rules3D.filter(rule => rule.enabled !== false);
			const convertedRules = convert3DRulesToMihomoRules(validRules);
			rules.push(...convertedRules);
			console.log(`✅ 加载用户自定义三维规则: ${validRules.length} 条 → ${convertedRules.length} 条 Mihomo AND 规则`);
		}
		
		// 2. 用户自定义简单前置规则（次高优先级）
		if (this.userRules.simpleRules?.prepend && this.userRules.simpleRules.prepend.length > 0) {
			const userPrependRules = this.userRules.simpleRules.prepend.map(rule => {
				const ruleStr = rule.noResolve 
					? `${rule.type},${rule.value},${rule.group},no-resolve`
					: `${rule.type},${rule.value},${rule.group}`;
				return ruleStr;
			});
			rules.push(...userPrependRules);
			console.log(`✅ 加载用户自定义简单前置规则: ${userPrependRules.length} 条`);
		}
		
		// 3. AI规则 -> AI分组
		// 服务级规则必须先于通用 GFW/Proxy/Microsoft 规则，否则 OpenAI/Copilot 等域名可能被前面的通用规则截走。
		const aiRules = (__CompileTime_Rules__.AI ?? []).map(
			(domain) => `DOMAIN-SUFFIX,${domain},${this.presetGroups['AI']}`
		);
		rules.push(...aiRules);
		
		// 4. 原始订阅 rules 作为兼容补充，放在 AI 服务规则之后，避免 google.com/openai.com 等通用规则遮蔽 AI 分流。
		if (this.originalRules && this.originalRules.length > 0) {
			const convertedOriginalRules = this.convertOriginalRules(this.originalRules);
			rules.push(...convertedOriginalRules);
			console.log(`✅ 加载并转换用户原始rules: ${convertedOriginalRules.length} 条`);
		}
		
		// 5. GFW规则 -> GFW分组
		const gfwRules = __CompileTime_Rules__.Loyalsoldier_GFW.map(
			(domain) => `DOMAIN-SUFFIX,${domain},${this.presetGroups['gfw']}`
		);
		rules.push(...gfwRules);
		
		// 6. Microsoft规则 -> Microsoft分组 (必须在 Proxy 规则之前，避免 microsoft.com 被 Foreign Media 匹配)
		// Microsoft 规则已经是完整的规则字符串(包括 DOMAIN-KEYWORD 和 DOMAIN-SUFFIX)
		const microsoftRules = __CompileTime_Rules__.Microsoft.map(
			(rule) => {
				// 规则格式: "DOMAIN-SUFFIX,microsoft.com,Microsoft" 或 "DOMAIN-KEYWORD,microsoft,Microsoft"
				// 需要将最后的 "Microsoft" 替换为实际的分组名称
				const parts = rule.split(',');
				if (parts.length >= 2) {
					const ruleType = parts[0];
					const ruleValue = parts[1];
					return `${ruleType},${ruleValue},${this.presetGroups['microsoft']}`;
				}
				return rule;
			}
		);
		rules.push(...microsoftRules);
		
		// 7. Proxy规则 -> Foreign Media分组 (在 Microsoft 规则之后，避免误匹配)
		const proxyRules = __CompileTime_Rules__.Loyalsoldier_Proxy.map(
			(domain) => `DOMAIN-SUFFIX,${domain},${this.presetGroups['foreign-media']}`
		);
		rules.push(...proxyRules);
		
		// 8. Telegram规则 -> Telegram分组
		const telegramRules = __CompileTime_Rules__.Loyalsoldier_Telegram.map(
			(rule) => this.attachGroupToRule(rule, this.presetGroups['telegram'], 'DOMAIN-SUFFIX')
		);
		rules.push(...telegramRules);
		
		// 9. Apple规则 -> Apple分组
		const appleRules = __CompileTime_Rules__.Loyalsoldier_Apple.map(
			(domain) => `DOMAIN-SUFFIX,${domain},${this.presetGroups['apple']}`
		);
		rules.push(...appleRules);
		
		// 10. 添加github下载规则到Download分组
		rules.push(`DOMAIN,objects.githubusercontent.com,${this.presetGroups['download']}`);
		
		// 11. Bilibili规则到Region Media分组
		const bilibiliRules = [
			...__CompileTime_Rules__.CN_bilibili ,
			...__CompileTime_Rules__.ITNL_bilibili ,
		].map( (rule) => converters.autoDetectRuleType(rule) as [keyof typeof RuleType, string] );
		
		bilibiliRules.forEach(([type, value]) => {
			rules.push(`${type},${value},${this.presetGroups['region-media']}`);
		});
		rules.push(`DOMAIN-KEYWORD,bili,${this.presetGroups['region-media']}`);
		
		// 12. 添加原有的Blocked_By_GFW规则到GFW分组
		const blockedGfwRules = __CompileTime_Rules__.Blocked_By_GFW.map(
			(rule) => converters.autoDetectRuleType(rule) as [keyof typeof RuleType, string]
		);
		blockedGfwRules.forEach(([type, value]) => {
			rules.push(`${type},${value},${this.presetGroups['gfw']}`);
		});
		
		// 13. 直连域名规则 -> China Direct分组 (高频国内站点优先匹配)
		const directRules = __CompileTime_Rules__.Loyalsoldier_Direct.map(
			(domain) => `DOMAIN-SUFFIX,${domain},${this.presetGroups['direct-group']}`
		);
		rules.push(...directRules);
		
		// 14. GEOIP,CN -> China Direct分组 (覆盖未在直连列表中的国内IP)
		rules.push(`GEOIP,CN,${this.presetGroups['direct-group']}`);
		
		// 15. 用户自定义简单后置规则（MATCH 之前）
		if (this.userRules.simpleRules?.append && this.userRules.simpleRules.append.length > 0) {
			const userAppendRules = this.userRules.simpleRules.append.map(rule => {
				const ruleStr = rule.noResolve 
					? `${rule.type},${rule.value},${rule.group},no-resolve`
					: `${rule.type},${rule.value},${rule.group}`;
				return ruleStr;
			});
			rules.push(...userAppendRules);
			console.log(`✅ 加载用户自定义简单后置规则: ${userAppendRules.length} 条`);
		}
		
		// 16. 添加Final规则(漏网之鱼)
		rules.push(`MATCH,${this.presetGroups['final']}`);
		
		// 17. 去重处理
		const deduplicatedRules = this.deduplicateRules(rules);
		console.log(`✅ 规则去重: ${rules.length} -> ${deduplicatedRules.length} 条`);
		
		this.source.rules = deduplicatedRules;
	}
	
	/**
	 * 转换用户原始rules的group名称
	 * - block/REJECT/DIRECT 保持不变
	 * - 其他group统一转换为 ProxyA
	 */
	convertOriginalRules(originalRules: string[]): string[] {
		const proxyAGroup = this.presetGroups[SelectorSymbols.ManualA];
		
		return originalRules.flatMap(rule => {
			const parts = rule.split(',');
			if (parts.length < 2) {
				// 格式不正确的rule，原样返回
				return [rule];
			}
			
			// 原始 MATCH 会遮蔽所有 auto-routing 生成规则，当前模式只保留自己最终追加的 MATCH。
			if (parts[0] === 'MATCH') {
				return [];
			}
			
			// 普通规则: TYPE,value,group 或 TYPE,value,group,no-resolve
			if (parts.length >= 3) {
				const group = parts[2];
				// block/REJECT/DIRECT 保持不变
				if (group === 'block' || group === 'REJECT' || group === 'DIRECT') {
					return [rule];
				}
				// 其他group转换为ProxyA
				if (parts.length === 4) {
					// 带no-resolve的规则
					return [`${parts[0]},${parts[1]},${proxyAGroup},${parts[3]}`];
				}
				return [`${parts[0]},${parts[1]},${proxyAGroup}`];
			}
			
			// 其他情况原样返回
			return [rule];
		});
	}

	attachGroupToRule(rule: string, group: string, fallbackType: keyof typeof RuleType): string {
		const parts = rule.split(',');
		const [type, value, ...options] = parts;
		
		if (parts.length >= 2 && SUPPORTED_RULE_TYPES.has(type)) {
			return [type, value, group, ...options].join(',');
		}
		
		return `${fallbackType},${rule},${group}`;
	}
	
	/**
	 * 去重rules（保留首次出现的规则）
	 */
	deduplicateRules(rules: string[]): string[] {
		const seen = new Set<string>();
		const result: string[] = [];
		
		for (const rule of rules) {
			if (!seen.has(rule)) {
				seen.add(rule);
				result.push(rule);
			}
		}
		
		return result;
	}
	
}

/**
 * 警告!
 * 不要在class中使用#private私有属性feature,会导致clash-verge内存泄漏!
 */

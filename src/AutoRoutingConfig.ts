

/**
 * 自动路由模式配置
 * 基于 Loyalsoldier/clash-rules 规则源
 */
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
	};
	
	/**
	 * 所有线路的名称列表
	 * @type {string[]}
	 */
	proxiesList: string[];
	
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
	}
	
	/**
	 * 构建规则
	 */
	buildRules() {
		const rules: string[] = [];
		
		// 1. GFW规则 -> GFW分组
		const gfwRules = __CompileTime_Rules__.Loyalsoldier_GFW.map(
			(domain) => `DOMAIN-SUFFIX,${domain},${this.presetGroups['gfw']}`
		);
		rules.push(...gfwRules);
		
		// 2. Proxy规则 -> Foreign Media分组
		const proxyRules = __CompileTime_Rules__.Loyalsoldier_Proxy.map(
			(domain) => `DOMAIN-SUFFIX,${domain},${this.presetGroups['foreign-media']}`
		);
		rules.push(...proxyRules);
		
		// 3. Telegram规则 -> Telegram分组
		const telegramRules = __CompileTime_Rules__.Loyalsoldier_Telegram.map(
			(domain) => `DOMAIN-SUFFIX,${domain},${this.presetGroups['telegram']}`
		);
		rules.push(...telegramRules);
		
		// 4. Microsoft规则 -> Microsoft分组
		const microsoftRules = __CompileTime_Rules__.Loyalsoldier_Microsoft.map(
			(domain) => `DOMAIN-SUFFIX,${domain},${this.presetGroups['microsoft']}`
		);
		rules.push(...microsoftRules);
		
		// 5. Apple规则 -> Apple分组
		const appleRules = __CompileTime_Rules__.Loyalsoldier_Apple.map(
			(domain) => `DOMAIN-SUFFIX,${domain},${this.presetGroups['apple']}`
		);
		rules.push(...appleRules);
		
		// 6. 添加github下载规则到Download分组
		rules.push(`DOMAIN,objects.githubusercontent.com,${this.presetGroups['download']}`);
		
		// 7. Bilibili规则到Region Media分组
		const bilibiliRules = [
			...__CompileTime_Rules__.CN_bilibili ,
			...__CompileTime_Rules__.ITNL_bilibili ,
		].map( (rule) => converters.autoDetectRuleType(rule) as [keyof typeof RuleType, string] );
		
		bilibiliRules.forEach(([type, value]) => {
			rules.push(`${type},${value},${this.presetGroups['region-media']}`);
		});
		rules.push(`DOMAIN-KEYWORD,bili,${this.presetGroups['region-media']}`);
		
		// 8. 添加原有的Blocked_By_GFW规则到GFW分组
		const blockedGfwRules = __CompileTime_Rules__.Blocked_By_GFW.map(
			(rule) => converters.autoDetectRuleType(rule) as [keyof typeof RuleType, string]
		);
		blockedGfwRules.forEach(([type, value]) => {
			rules.push(`${type},${value},${this.presetGroups['gfw']}`);
		});
		
		// 9. 添加Final规则(漏网之鱼)
		rules.push(`MATCH,${this.presetGroups['final']}`);
		
		this.source.rules = rules;
	}
	
}

import {
	ClashConfig ,
	RuleType,
} from "./types/clash";
import { SelectorSymbols, converters } from './RuleConverters';
import { Clash, Group } from './ClashConfigBuilder';
import { YAML } from "./types/client";

/**
 * 警告!
 * 不要在class中使用#private私有属性feature,会导致clash-verge内存泄漏!
 */

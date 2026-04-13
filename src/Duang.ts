

/**
 * 自动路由模式配置
 * 完整的 DuangCloud 分流规则
 */
export class AutoRoutingGroup extends Clash {
	// source : ClashConfig;
	presetGroups = {
		[SelectorSymbols.Auto] : '♻️ 最低延迟' ,
		//当选择的节点不可用时回退到此线路
		[SelectorSymbols.Fallback] : '🪓 后备线路' ,
		[SelectorSymbols.Direct] : 'DIRECT' ,
		[SelectorSymbols.Reject] : 'REJECT' ,
		[SelectorSymbols.ManualA] : '🫧 自选节点A 🫧' ,
		[SelectorSymbols.ManualB] : '🍀 自选节点B 🍀' ,
		[SelectorSymbols.LoadBalanceHash] : '⚖️ 负载均衡-散列' ,
		[SelectorSymbols.LoadBalanceRound] : '⚖️ 负载均衡-轮询' ,
		//包含国外视频网站等如youtube，奈飞等
		'foreign-media' : '🌍 国外媒体' ,
		'gfw-penetrate' : '❄️ GFW穿透' ,
		//地区分级的网站, 既有国内又有国外服务 , 但区别对待 ,比如bilibili
		'regional-segmentation' : '🦚 地区分级' ,
		//匹配所有telegram相关的域名
		'telegram' : '📲 电报信息' ,
		'AI' : '🖥 AI' ,
		'microsoft' : 'Ⓜ️ 微软服务' ,
		'apple' : '🍎 苹果服务' ,
		'global-direct' : '🎯 全球直连' ,
		//国际网站的广告、垃圾信息所使用的域名
		'global-block' : '🛑 全球拦截' ,
		//无必要的接口域名,如统计,收集信息,广告等,针对国内网站
		'cleanse' : '🍃 应用净化' ,
		//所有跟下载有关的网站,比如github下载releases
		'download' : '📥 国际下载 (github)etc.' ,
		//上面所有的规则都没匹配到
		'slipped-past' : '🐟 漏网之鱼' ,
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
		this.source = source as ClashConfig;
		this.console = console;
		this.yaml = yaml;
		this.proxiesList = source.proxies.map( ( proxy ) => proxy.name );
		this.source.rules = duangRules;
		this.modifyDuangRules();
		this.addManualGroups( { name , url , interval , selected } );
		this.addAutoSelect( { name , url , interval , selected } );
		this.addDistributions( { name , url , interval , selected } );
		this.addFallback( { name , url , interval , selected } );
		this.addLoadBalance( { name , url , interval , selected } );
	}
	
	
	/**
	 * 添加手动切换和节点选择这两个分组
	 */
	addManualGroups( { name , url , interval , selected } ) {
		this.addGroups(
			new Group( {
				name : this.presetGroups[SelectorSymbols.ManualA] ,
				proxies : [
					this.presetGroups[SelectorSymbols.Reject] ,
					this.presetGroups[SelectorSymbols.Direct] ,
					this.presetGroups[SelectorSymbols.Auto] ,
					this.presetGroups[SelectorSymbols.LoadBalanceRound] ,
					this.presetGroups[SelectorSymbols.LoadBalanceHash] ,
					this.presetGroups[SelectorSymbols.Fallback] ,
					...this.proxiesList ,
				] ,
			} ) ,
			new Group( {
				name : this.presetGroups[SelectorSymbols.ManualB] ,
				proxies : [
					this.presetGroups[SelectorSymbols.Reject] ,
					this.presetGroups[SelectorSymbols.Direct] ,
					this.presetGroups[SelectorSymbols.Auto] ,
					this.presetGroups[SelectorSymbols.LoadBalanceRound] ,
					this.presetGroups[SelectorSymbols.LoadBalanceHash] ,
					this.presetGroups[SelectorSymbols.Fallback] ,
					...this.proxiesList ,
				] ,
			} ) ,
			new Group( {
				name : this.presetGroups['regional-segmentation'] ,
				proxies : [
					this.presetGroups[SelectorSymbols.Reject] ,
					this.presetGroups[SelectorSymbols.Direct] ,
					this.presetGroups[SelectorSymbols.ManualA] ,
					this.presetGroups[SelectorSymbols.ManualB] ,
					this.presetGroups[SelectorSymbols.Auto] ,
					this.presetGroups[SelectorSymbols.LoadBalanceRound] ,
					this.presetGroups[SelectorSymbols.LoadBalanceHash] ,
					this.presetGroups[SelectorSymbols.Fallback] ,
					...this.proxiesList ,
				] ,
			} ) ,
			new Group( {
				name : this.presetGroups['download'] ,
				proxies : [
					this.presetGroups[SelectorSymbols.Reject] ,
					this.presetGroups[SelectorSymbols.Direct] ,
					this.presetGroups[SelectorSymbols.ManualA] ,
					this.presetGroups[SelectorSymbols.ManualB] ,
					this.presetGroups[SelectorSymbols.Auto] ,
					this.presetGroups[SelectorSymbols.LoadBalanceRound] ,
					this.presetGroups[SelectorSymbols.LoadBalanceHash] ,
					this.presetGroups[SelectorSymbols.Fallback] ,
					...this.proxiesList ,
				] ,
			} ) ,
			new Group( {
				name : this.presetGroups['gfw-penetrate'] ,
				proxies : [
					this.presetGroups[SelectorSymbols.Reject] ,
					this.presetGroups[SelectorSymbols.Direct] ,
					this.presetGroups[SelectorSymbols.ManualA] ,
					this.presetGroups[SelectorSymbols.ManualB] ,
					this.presetGroups[SelectorSymbols.Auto] ,
					this.presetGroups[SelectorSymbols.LoadBalanceRound] ,
					this.presetGroups[SelectorSymbols.LoadBalanceHash] ,
					this.presetGroups[SelectorSymbols.Fallback] ,
					...this.proxiesList ,
				] ,
			} ) ,
		);
	}
	
	/**
	 *
	 */
	addAutoSelect( { name , url , interval , selected } ) {
		this.addGroups(
			new Group( {
				name : this.presetGroups[SelectorSymbols.Auto] ,
				type : 'url-test' ,
				proxies : this.proxiesList ,
				url : 'http://www.gstatic.com/generate_204' ,
				interval : 180 ,
			} ) ,
		);
	}
	
	/**
	 * 添加其他的分流组
	 */
	addDistributions( { name , url , interval , selected } ) {
		const _proxies = [
			this.presetGroups[SelectorSymbols.Direct] ,
			this.presetGroups[SelectorSymbols.Reject] ,
			this.presetGroups[SelectorSymbols.ManualA] ,
			this.presetGroups[SelectorSymbols.ManualB] ,
			this.presetGroups[SelectorSymbols.LoadBalanceHash] ,
			this.presetGroups[SelectorSymbols.LoadBalanceRound] ,
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
				name : this.presetGroups['global-direct'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.presetGroups['global-block'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.presetGroups['cleanse'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.presetGroups['slipped-past'] ,
				proxies : _proxies ,
			} ) ,
		];
		this.addGroups( ...groups );
	}
	
	/**
	 *
	 */
	addLoadBalance( { name , url , interval , selected } ) {
		this.addGroups(
			new Group( {
				name : this.presetGroups[SelectorSymbols.LoadBalanceHash] ,
				type : 'load-balance' ,
				strategy : 'consistent-hashing' ,
				proxies : this.proxiesList ,
				url : 'http://www.gstatic.com/generate_204' ,
				interval : 180 ,
			} ) ,
			new Group( {
				name : this.presetGroups[SelectorSymbols.LoadBalanceRound] ,
				type : 'load-balance' ,
				strategy : 'round-robin' ,
				proxies : this.proxiesList ,
				url : 'http://www.gstatic.com/generate_204' ,
				interval : 180 ,
			} ) ,
		);
	}
	
	addFallback( { name , url , interval , selected } ) {
		this.console.log( url );
		this.console.log( interval );
		this.addGroups( new Group( {
			name : this.presetGroups[SelectorSymbols.Fallback] ,
			type : 'fallback' ,
			proxies : this.proxiesList ,
			url : 'http://www.gstatic.com/generate_204' ,
			interval : 180 ,
		} ) );
	}
	
	async modifyDuangRules() {
		const duangOldReplaceMapping = {
			// '🎯 全球直连' : this.#presetGroups[],
			// '🛑 全球拦截':'',
			// '🍃 应用净化':'',
			// 'Ⓜ️ 微软服务':'',
			// '🍎 苹果服务' : '' ,
			// '🌍 国外媒体' : '' ,
			'🚀 节点选择' : this.presetGroups[SelectorSymbols.ManualA] ,
			'🖥 ChatGPT' : this.presetGroups["AI"] ,
			// '📲 电报信息' : '' ,
			// '🐟 漏网之鱼' : '' ,
		};
		//把duangCloud规则集里面的组名改为新的组
		this.source.rules = this.source.rules.map( ( rule ) => {
			for( const k in duangOldReplaceMapping ){
				if( duangOldReplaceMapping.hasOwnProperty( k ) ) {
					const v = duangOldReplaceMapping[k];
					if( rule.includes( k ) ) {
						return rule.replaceAll( k , v );
					}
				}
			}
			return rule;
		} );
		
		this.addRulesToGroup( this.presetGroups['download'] , [
			[ 'DOMAIN' , 'objects.githubusercontent.com' ] ,
		] );
		
		//bilibili国内和国际规则
		const bilibiliRules = [
			...__CompileTime_Rules__.CN_bilibili ,
			...__CompileTime_Rules__.ITNL_bilibili ,
		].map( (rule) => converters.autoDetectRuleType(rule) as [keyof typeof RuleType, string] );
		this.addRulesToGroup(
			this.presetGroups['regional-segmentation'] ,
			bilibiliRules ,
		);
		this.addRulesToGroup(
			this.presetGroups['regional-segmentation'] ,
			[['DOMAIN-KEYWORD','bili']],
		);
		
		//添加被gfw屏蔽的规则
		const gfwRules = __CompileTime_Rules__.Blocked_By_GFW.map(
			(rule) => converters.autoDetectRuleType(rule) as [keyof typeof RuleType, string]
		);
		this.addRulesToGroup(
			this.presetGroups['gfw-penetrate'] ,
			gfwRules ,
		);
	}
	
}

import {
	ClashConfig ,
	RuleType,
} from "./types/clash";
import { SelectorSymbols, converters } from './utils';
import duangRules from './assets/duangcloud-rules';
import { Clash, Group } from './Clash';
import { YAML } from "./types/client";

/**
 * 警告!
 * 不要在class中使用#private私有属性feature,会导致clash-verge内存泄漏!
 */

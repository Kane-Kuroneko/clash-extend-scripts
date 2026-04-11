/**
 * 此代码可将任意vpn供应商的节点替换为DuangCloud的分流组
 */

import { Clash } from '../utils';
import duangRules from './assets/duangcloud-rules';

module.exports.parse = ( ...args ) => {
	let [
		raw ,
		{ axios , yaml , notify , homeDir , console } ,
		{ name , url , interval , selected } ,
	] = args;
	let source;
	switch( typeof raw ) {
		case 'string' : {
			source = yaml.parse( raw );
			break;
		}
		case 'object' : {
			if( typeof raw.source === 'object' ) {
				source = raw.source;
				raw = undefined;
			}
			break;
		}
	}
	
	return processor(
		{ source , raw } ,
		{ axios , yaml , notify , console } ,
		{ name , url , interval , selected } ,
	) || raw;
};

const processor = (
	{ source , raw } ,
	{ axios , yaml , notify , console } ,
	{ name , url , interval , selected } ,
) => {
	try {
		// console.log(source['proxy-groups']);
		// const clash = new Clash(
		// 	{ source , raw } ,
		// 	{ axios , yaml , notify , console } ,
		// 	{ name , url , interval , selected } ,
		// );
		// const selector = "🥶 节点选择";
		//
		// clash.
		// renameGroup('飞鸟云' , selector).
		// addProxiesToGroup('其他流量' , [] , ['REJECT']).
		// replaceGroupTo('直接连接' , 'DIRECT').
		// addRule('DOMAIN-KEYWORD' , 'baidu' , 'DIRECT' , true).
		// addRule('DOMAIN-KEYWORD' , 'juejin' , 'DIRECT');
		
		// clash.renameGroup('国外流量',selector).
		// addProxiesToGroup('其他流量',[],['REJECT']).
		// replaceGroupTo('直接连接','DIRECT').
		// addRule('DOMAIN-KEYWORD','baidu','DIRECT',true).
		// addRule('DOMAIN-KEYWORD','juejin','DIRECT');
		
		const duang = new DuangCloudConf(
			{ source , raw } ,
			{ axios , yaml , notify , console } ,
			{ name , url , interval , selected },
		);
		// console.log(JSON.stringify({ name , url , interval , selected }));
		return duang.raw;
		//
		// return clash.raw;
	} catch ( e ) {
		console.log( e , 'errrrrrrrrrrrrrrr' );
		return 'ddddd';
	}
};

const SelectorSymbols = {
	Auto : Symbol( 'Auto' ) ,
	Fallback : Symbol( 'Fallback' ) ,
	ManualA : Symbol( 'Manual-A' ) ,
	ManualB : Symbol( 'Manual-B' ) ,
	Direct : Symbol( 'DIRECT' ) ,
	Reject : Symbol( 'REJECT' ) ,
	LoadBalanceHash : Symbol( 'Load-Balance-Hash' ) ,
	LoadBalanceRound : Symbol( 'Load-Balance-Round' ) ,
};

/**
 * 创建一个DuangCloud风格和规则的Clash分流配置,并进行了更合理的优化
 */
export class DuangCloudConf extends Clash {
	
	#presetGroups = {
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
		//匹配所有telegram相关的域名
		'telegram' : '📲 电报信息' ,
		'chatGPT' : '🖥 ChatGPT' ,
		'microsoft' : 'Ⓜ️ 微软服务' ,
		'apple' : '🍎 苹果服务' ,
		'global-direct' : '🎯 全球直连' ,
		//国际网站的广告、垃圾信息所使用的域名
		'global-block' : '🛑 全球拦截' ,
		//无必要的接口域名,如统计,收集信息,广告等,针对国内网站
		'cleanse' : '🍃 应用净化' ,
		//上面所有的规则都没匹配到
		'slipped-past' : '🐟 漏网之鱼' ,
	};
	
	/**
	 * 所有线路的名称列表
	 * @type {string[]}
	 */
	#proxiesList;
	
	constructor(
		{ source , raw } ,
		{ axios , yaml , notify , console } ,
		{ name , url , interval , selected } ,
	) {
		super(
			{ source , raw } ,
			{ axios , yaml , notify , console } ,
			{ name , url , interval , selected },
		);
		source['proxy-groups'] = [];
		Object.assign( this , {
			source ,
			console ,
			yaml ,
			notify ,
		} );
		this.#proxiesList = source.proxies.map( ( proxy ) => proxy.name );
		this.source.rules = duangRules;
		this.modifyDuangRules();
		this.addManualGroups( { name , url , interval , selected } );
		this.addAutoSelect( { name , url , interval , selected } );
		this.addDistributions( { name , url , interval , selected } );
		this.addFallback( { name , url , interval , selected } );
		this.addLoadBalance( { name , url , interval , selected } );
	}
	
	/**
	 *
	 * @param {Group} groups
	 */
	#addGroups( ...groups ) {
		this.source['proxy-groups'].push( ...groups );
	}
	
	/**
	 * 添加手动切换和节点选择这两个分组
	 */
	addManualGroups() {
		this.#addGroups(
			new Group( {
				name : this.#presetGroups[SelectorSymbols.ManualA] ,
				proxies : [
					this.#presetGroups[SelectorSymbols.Reject] ,
					this.#presetGroups[SelectorSymbols.Direct] ,
					this.#presetGroups[SelectorSymbols.Auto] ,
					this.#presetGroups[SelectorSymbols.LoadBalanceRound] ,
					this.#presetGroups[SelectorSymbols.LoadBalanceHash] ,
					this.#presetGroups[SelectorSymbols.Fallback] ,
					...this.#proxiesList,
				],
			} ) ,
			new Group( {
				name : this.#presetGroups[SelectorSymbols.ManualB] ,
				proxies : [
					this.#presetGroups[SelectorSymbols.Reject] ,
					this.#presetGroups[SelectorSymbols.Direct] ,
					this.#presetGroups[SelectorSymbols.Auto] ,
					this.#presetGroups[SelectorSymbols.LoadBalanceRound] ,
					this.#presetGroups[SelectorSymbols.LoadBalanceHash] ,
					this.#presetGroups[SelectorSymbols.Fallback] ,
					...this.#proxiesList,
				],
			} ) ,
		);
	}
	
	/**
	 *
	 */
	addAutoSelect( { name , url , interval , selected } ) {
		this.#addGroups(
			new Group( {
				name : this.#presetGroups[SelectorSymbols.Auto] ,
				type : 'url-test' ,
				proxies : this.#proxiesList ,
				url : url ?? 'http://www.gstatic.com/generate_204' ,
				interval : interval ?? 86400 ,
			} ) ,
		);
	}
	
	/**
	 * 添加其他的分流组
	 */
	addDistributions() {
		const _proxies = [
			this.#presetGroups[SelectorSymbols.Direct] ,
			this.#presetGroups[SelectorSymbols.Reject] ,
			this.#presetGroups[SelectorSymbols.ManualA] ,
			this.#presetGroups[SelectorSymbols.ManualB] ,
			this.#presetGroups[SelectorSymbols.LoadBalanceHash] ,
			this.#presetGroups[SelectorSymbols.LoadBalanceRound] ,
			...this.#proxiesList,
		];
		const groups = [
			new Group( {
				name : this.#presetGroups['foreign-media'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.#presetGroups['telegram'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.#presetGroups['chatGPT'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.#presetGroups['microsoft'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.#presetGroups['apple'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.#presetGroups['global-direct'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.#presetGroups['global-block'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.#presetGroups['cleanse'] ,
				proxies : _proxies ,
			} ) ,
			new Group( {
				name : this.#presetGroups['slipped-past'] ,
				proxies : _proxies ,
			} ),
		];
		this.console.log( '_proxies2222222222' , JSON.stringify( _proxies ) );
		this.#addGroups( ...groups );
	}
	
	/**
	 *
	 */
	addLoadBalance( { name , url , interval , selected } ) {
		//散列
		this.#addGroups(
			new Group( {
				name : this.#presetGroups[SelectorSymbols.LoadBalanceHash] ,
				type : 'load-balance' ,
				strategy : 'consistent-hashing' ,
				proxies : this.#proxiesList ,
				url : url ?? 'http://www.gstatic.com/generate_204' ,
				interval : interval ?? 86400 ,
			} ) ,
			new Group( {
				name : this.#presetGroups[SelectorSymbols.LoadBalanceRound] ,
				type : 'load-balance' ,
				strategy : 'round-robin' ,
				proxies : this.#proxiesList ,
				url : url ?? 'http://www.gstatic.com/generate_204' ,
				interval : interval ?? 86400 ,
			} ) ,
		);
	}
	
	addFallback( { name , url , interval , selected } ) {
		this.#addGroups( new Group( {
			name : this.#presetGroups[SelectorSymbols.Fallback] ,
			type : 'fallback' ,
			proxies : this.#proxiesList ,
			url : url ?? 'http://www.gstatic.com/generate_204' ,
			interval : interval ?? 60 ,
		} ) );
	}
	
	modifyDuangRules() {
		const duangOldReplaceMapping = {
			// '🎯 全球直连' : this.#presetGroups[],
			// '🛑 全球拦截':'',
			// '🍃 应用净化':'',
			// 'Ⓜ️ 微软服务':'',
			// '🍎 苹果服务' : '' ,
			// '🌍 国外媒体' : '' ,
			'🚀 节点选择' : this.#presetGroups[SelectorSymbols.ManualA] ,
			// '📲 电报信息' : '' ,
			// '🐟 漏网之鱼' : '' ,
		};
		
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
	}
}

class Group {
	/**
	 *
	 * @param {GroupConf} conf
	 */
	constructor( conf ) {
		Object.assign( this , this.#defaultConf , conf );
	}
	
	/**
	 *
	 * @type {Partial<GroupConf>}
	 */
	#defaultConf = {
		type : 'select' ,
		
	};
}

// Define main function (script entry)

export function main(config?, profileName?) {
	if(!config) return;
	const globalConf = new GlobalConf(
		{source:config,raw:null} ,
		{ axios : Nothing , yaml , notify : Nothing , console } ,
		{ name:undefined , url : undefined , interval : undefined , selected : undefined } ,
	);
	console.log(globalConf.source["proxy-groups"]);
	return globalConf.source;
}
//@ts-ignore
// __MAIN__;


//勿删,fakeInvoke防止webpack搞幺蛾子
main();


class GlobalConf extends Clash {
	/**
	 * 所有线路的名称列表
	 * @type {string[]}
	 */
	proxiesList : string[];
	presetGroups = {
		[SelectorSymbols.ManualA] : '🍀 自选节点 🍀' ,
		'China-Geo-IP' : '🇨🇳  大陆Geo-IP' ,
		//当选择的节点不可用时回退到此线路
		[SelectorSymbols.Fallback] : '🪓 后备线路' ,
		[SelectorSymbols.Direct] : 'DIRECT' ,
		[SelectorSymbols.Reject] : 'REJECT' ,
		[SelectorSymbols.LoadBalanceHash] : '⚖️ 负载均衡-散列' ,
		[SelectorSymbols.LoadBalanceRound] : '⚖️ 负载均衡-轮询' ,
	}
	constructor(
		{ source , raw }: { source: Partial<ClashConfig>, raw: string } ,
		{ axios , yaml , notify , console }: { axios: any, yaml: YAML, notify: any, console: Console } ,
		{ name , url , interval , selected }: { name: string, url: string, interval: number, selected: string[] }
	) {
		super(
			{ source , raw } ,
			{ axios , yaml , notify , console } ,
			{ name , url , interval , selected },
		);
		Object.assign( (
			this as any
		) , {
			source ,
			console ,
			yaml ,
			notify ,
		} );
		this.source['proxy-groups'] = [];
		this.proxiesList = this.source.proxies.map( ( proxy ) => proxy.name );
		this.source['rules'] = [
			`GEOIP,CN,${this.presetGroups['China-Geo-IP']}` ,
			`MATCH,${this.presetGroups[SelectorSymbols.ManualA]}`,
		];
		// this.addRule( 'MATCH' , null , '肥猫云' );
		
		this.addManualSelect({ name , url , interval , selected });
		this.addLoadBalance( { name , url , interval , selected } );
		this.addFallback( { name , url , interval , selected } );
	}
	
	addManualSelect({ name , url , interval , selected }){
		this.addGroups( new Group( {
			name : this.presetGroups[SelectorSymbols.ManualA] ,
			type : 'select' ,
			proxies : [
				this.presetGroups[SelectorSymbols.Reject] ,
				this.presetGroups[SelectorSymbols.Direct] ,
				this.presetGroups[SelectorSymbols.LoadBalanceHash] ,
				this.presetGroups[SelectorSymbols.LoadBalanceRound] ,
				this.presetGroups[SelectorSymbols.Fallback] ,
				...this.proxiesList,
			] ,
		} ) );
		
		this.addGroups( new Group( {
			name : this.presetGroups['China-Geo-IP'] ,
			type : 'select' ,
			proxies : [
				this.presetGroups[SelectorSymbols.Reject] ,
				this.presetGroups[SelectorSymbols.Direct] ,
				this.presetGroups[SelectorSymbols.ManualA] ,
				this.presetGroups[SelectorSymbols.LoadBalanceHash] ,
				this.presetGroups[SelectorSymbols.LoadBalanceRound] ,
				this.presetGroups[SelectorSymbols.Fallback] ,
				...this.proxiesList,
			] ,
		} ) );
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
		this.addGroups( new Group( {
			name : this.presetGroups[SelectorSymbols.Fallback] ,
			type : 'fallback' ,
			proxies : this.proxiesList ,
			url : 'http://www.gstatic.com/generate_204' ,
			interval : 180 ,
		} ) );
	}
	
}

import { Clash , Group } from '../../Clash';
import { DuangCloudConf } from '../../Duang';
import { SelectorSymbols , dedupProxiesInGroup , converters } from '../../utils';
import yaml from 'yaml';
import { Nothing } from 'nothing-mock';

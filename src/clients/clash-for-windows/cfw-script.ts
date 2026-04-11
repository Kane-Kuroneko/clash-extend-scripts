/**
 * 此代码可将任意vpn供应商的节点替换为DuangCloud的分流组
 */

import { Clash } from '../../Clash';
import duangRules from '../../assets/duangcloud-rules';

export const parse = (
	raw: string ,
	{ axios , yaml , notify , console }: { axios: any, yaml: YAML, notify: any, console: Console } ,
	{ name , url , interval , selected }: { name: string, url: string, interval: number, selected: string[] } ,
) => {
	const source = yaml.parse( raw );
	return processor(
		{ source , raw } ,
		{ axios , yaml , notify , console } ,
		{ name , url , interval , selected } ,
	) || raw;
};

const processor = (
	{ source , raw }: { source: Partial<ClashConfig>, raw: string } ,
	{ axios , yaml , notify , console }: { axios: any, yaml: YAML, notify: any, console: Console } ,
	{ name , url , interval , selected }: { name: string, url: string, interval: number, selected: string[] } ,
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
		return JSON.stringify(e.toString());
	}
};


import { DuangCloudConf } from '../../Duang';

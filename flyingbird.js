
const { Clash } = require('./utils');
module.exports = (
	{ source , raw } ,
	{ axios , yaml , notify , console } ,
	{ name , url , interval , selected }
) => {
	try {
		const clash = new Clash(
			{ source , raw } ,
			{ axios , yaml , notify , console } ,
			{ name , url , interval , selected }
		);
		const selector = "🥶节点选择";
		with(clash){
			renameGroup('国外流量',selector);
			addProxiesToGroup('其他流量',[],['REJECT']);
			replaceGroupTo('直接连接','DIRECT');
			addRule('DOMAIN-KEYWORD','baidu','DIRECT',true);
			addRule('DOMAIN-KEYWORD','juejin','DIRECT');
		}
		// clash.renameGroup('国外流量',selector).
		// addProxiesToGroup('其他流量',[],['REJECT']).
		// replaceGroupTo('直接连接','DIRECT').
		// addRule('DOMAIN-KEYWORD','baidu','DIRECT',true).
		// addRule('DOMAIN-KEYWORD','juejin','DIRECT');
		
		return clash.result;
	}catch ( e ) {
		console.log(e);
		return 'ddddd';
	}
};


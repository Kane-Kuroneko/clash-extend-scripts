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
		//将某个分组全局改名.
		clash.
		renameGroup('SSRDOG',"👻节点选择").
		addProxiesToGroup('Apple',['REJECT']).
		addProxiesToGroup('BiliBili',['👻节点选择'],['🇯🇵 Japan','🇰🇷 Korea','🇸🇬 Singapore','🇨🇦 Canada','🇺🇸 United States']).
		addRule('DOMAIN-KEYWORD','baidu','DIRECT');
		
		return clash.result;
	}catch ( e ) {
		console.log(e);
		return 'ddddd';
	}
};

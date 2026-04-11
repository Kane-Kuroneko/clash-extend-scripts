const FlyingBird = require('./flyingbird.js');
const Ssrdog = require('./ssrdog');

const modifiers = [
	{
		name : "DuangCloud",
		domain : "sub.dc-sub1.com",
		proccessor : null,
	},
	{
		name : "FlyingBird",
		domain : "apiv1.v27qae.com",
		proccessor : FlyingBird,
	},
	{
		name : "SSRDOG",
		domain : "host.ssrbox.com",
		proccessor : Ssrdog,
	},
];


module.exports.parse = async (...args) => {
	const [
		raw , 
		{ axios , yaml , notify ,homeDir, console } ,
		{ name , url , interval , selected }
	] = args;
	const source = yaml.parse(raw);

	const target = modifiers.find(({domain}) => url.includes(domain));

	if(target){
		const result =  target?.proccessor?.(
			{ source , raw } , 
			{ axios , yaml , notify , console } ,
			{ name , url , interval , selected }
		) || raw;
		
		return console.log(result),result;
	}else {                             
		console.log(22222222);
		return raw;
	}
};

import _ from 'lodash';

export const SelectorSymbols = {
	Auto : Symbol( 'Auto' ) ,
	Fallback : Symbol( 'Fallback' ) ,
	ManualA : Symbol( 'Manual-A' ) ,
	ManualB : Symbol( 'Manual-B' ) ,
	Direct : Symbol( 'DIRECT' ) ,
	Reject : Symbol( 'REJECT' ) ,
	LoadBalanceHash : Symbol( 'Load-Balance-Hash' ) ,
	LoadBalanceRound : Symbol( 'Load-Balance-Round' ) ,
};

export const dedupProxiesInGroup = (proxies:string[]) => {
	return _.uniq(proxies);
};

export const converters = {
	rulesStrToRulesObject(rulesStrList:string[]):_RuleObject[]{
		return rulesStrList.map((str) => {
			const ruleArr = str.split(',');
			if(ruleArr.length === 2){
				Object.defineProperties(ruleArr,{
					"type" : {
						get () {
							return ruleArr[0];
						},
						set (v) {
							ruleArr[0] = v;
						},
						configurable : true,
						enumerable : true,
					},
					"proxy" : {
						get () {
							return ruleArr[1];
						},
						set (v) {
							ruleArr[1] = v;
						},
						configurable : true,
						enumerable : true,
					},
				});
			}else if(ruleArr.length === 3) {
				Object.defineProperties(ruleArr,{
					"type" : {
						get () {
							return ruleArr[0];
						},
						set (v) {
							ruleArr[0] = v;
						},
						configurable : true,
						enumerable : true,
					},
					"value" : {
						get () {
							return ruleArr[1];
						},
						set (v) {
							ruleArr[1] = v;
						},
						configurable : true,
						enumerable : true,
					},
					"proxy" : {
						get () {
							return ruleArr[2];
						},
						set (v) {
							ruleArr[2] = v;
						},
						configurable : true,
						enumerable : true,
					},
				});
			}else if(ruleArr.length === 4) {
				Object.defineProperties(ruleArr,{
					"type" : {
						get () {
							return ruleArr[0];
						},
						set (v) {
							ruleArr[0] = v;
						},
						configurable : true,
						enumerable : true,
					},
					"value" : {
						get () {
							return ruleArr[1];
						},
						set (v) {
							ruleArr[1] = v;
						},
						configurable : true,
						enumerable : true,
					},
					"proxy" : {
						get () {
							return ruleArr[2];
						},
						set (v) {
							ruleArr[2] = v;
						},
						configurable : true,
						enumerable : true,
					},
					"resolve" : {
						get () {
							return ruleArr[3];
						},
						set (v) {
							ruleArr[3] = v;
						},
						configurable : true,
						enumerable : true,
					},
				});
			}
			
			return (ruleArr as _RuleObject);
		});
	},
	ruleObjectToRuleStr(ruleObject:_RuleObject) : string{
		if(typeof ruleObject === 'string'){
			return ruleObject;
		}
		switch( true ) {
			case ruleObject[0] && ruleObject[1] && !ruleObject['value'] && true:
			case ruleObject[0] && ruleObject[1] && ruleObject[2] && true :
			case ruleObject[0] && ruleObject[1] && ruleObject[2] && ruleObject[3] && true : {
				return ruleObject.join( ',' );
			};
			case ruleObject['type'] && ruleObject['proxy'] && true : {
				return `${ruleObject.type},${ruleObject.proxy}`
			};
			case ruleObject['type'] && ruleObject['value'] && ruleObject['proxy'] && true : {
				
				if( (ruleObject as any).resolve === 'no-resove' ){
					return `${ ruleObject.type },${ ruleObject['value'] },${ ruleObject.proxy },${ (ruleObject as any).resolve }`;
				}
				
				return `${ ruleObject.type },${ ruleObject['value'] },${ ruleObject.proxy }`;
			}
		}
	},
	/**
	 * 输入:"+.baidu.com"   输出: ["DOMAIN-SUFFIX","+.baidu.com"]
	 */
	autoDetectRuleType(value:string):[keyof typeof RuleType,string]{
		if( value.startsWith( '+.' ) ) {
			return [ 'DOMAIN-SUFFIX' , value ];
		} else {
			return [ 'DOMAIN' , value ];
		}
	}
};


namespace ClashRule {
	type Rule_Match = {
		ruleType : RuleType,
		
	}
	type Rule_Routng = {
		
	}
	
	
	export class RuleClass {
		constructor(ruleString:string)
		constructor( ruleObject: { ruleType, value } )
		
		constructor() {
			
		}
		
		toString(){
			
		}
	}
}

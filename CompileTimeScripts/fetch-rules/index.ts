export const fetchRules = async () => {
	
	return {
		CN_bilibili : await fetchGithubRules(CN_bilibili),
		ITNL_bilibili : await fetchGithubRules( INTL_bilibili ),
		Blocked_By_GFW : await fetchGithubRules( Blocked_By_GFW ),
		
	}
}

export const fetchGithubRules = (url:string) => fetch( url , {
	// mode : 'no-cors',
	headers : {
		"Accept" : "application/vnd.github.v3+json",
	},
} ).
then( res => res.text() ).
then( ( text ) => {
	const json: ResContents = parse( text );
	return json.payload;
} );

type ResContents = {
	payload : string[],
};

import { parse } from 'yaml';

import { CN_bilibili } from './bilibili.cn';
import { INTL_bilibili } from './bilibili.intl';
import { Blocked_By_GFW } from './blocked-by-gfw';

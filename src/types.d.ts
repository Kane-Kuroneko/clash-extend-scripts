declare interface ClashProxyItem {
	name: string,
	type: "ss" | "trojan",
	server: string,
	port: number,
	password: string,
	udp: boolean,
	cipher?: "aes-128-gcm",
	sni?: string,
}

declare class CGroup {
	name: string;
	type: "select" | "url-test" | "fallback" | "load-balance";
	proxies: string[];
	url?: string;
	interval?: number;
	strategy?: "consistent-hashing" | "round-robin";
}


declare enum RuleType {
	'DOMAIN-SUFFIX' ,
	'DOMAIN' ,
	'DOMAIN-KEYWORD' ,
	'IP-CIDR' ,
	'SRC-IP-CIDR' ,
	'GEOIP' ,
	'PROCESS-NAME' ,
	'DST-PORT' ,
	'SRC-PORT' ,
	'MATCH' ,
}

declare interface ClashConfig {
	"mixed-port": number;
	"allow-lan": boolean;
	"bind-address": string;
	mode: string;
	"log-level": string;
	"external-controller": string;
	dns: {
		enable: boolean
		ipv6: boolean
		"default-nameserver": string[]
		"enhanced-mode": string
		"fake-ip-range": string
		"use-hosts": boolean
		nameserver: string[]
		fallback: string[]
		"fallback-filter": {
			geoip: boolean
			ipcidr: string[]
		}
	};
	proxies: {
		name: string
		type: string
		server: string
		port: number
		cipher: string
		password: string
		udp: boolean
	}[];
	"proxy-groups": CGroup[];
	rules: string[];
}

declare interface CFW_Params {
	
}

declare type YAML = typeof import('yaml');

declare type RuleObject = ( [
	keyof typeof RuleType ,
	string ,
] & {
	type: keyof typeof RuleType,
	proxy: string,
} ) & ( [
	keyof typeof RuleType ,
	string ,
	string ,
] & {
	type: keyof typeof RuleType,
	value: string,
	proxy: string,
} ) & ( [
	keyof typeof RuleType ,
	string ,
	string ,
	'no-resove'
] & {
	type: keyof typeof RuleType,
	value: string,
	proxy: string,
	resolve: 'no-resove'
} )

declare type _RuleObject =
	| ( [
	keyof typeof RuleType ,
	string? ,
	string?
] & {
	type?: keyof typeof RuleType,
	value?: string,
	proxy?: string,
	length?: 3,
} )
	
	| ( [
	keyof typeof RuleType ,
	string?
] & {
	type?: keyof typeof RuleType,
	proxy?: string,
	length?: 2
} )
	
	| ( [
	keyof typeof RuleType ,
	string? ,
	string? ,
	'no-resolve'?
] & {
	type?: keyof typeof RuleType,
	value?: string,
	proxy?: string,
	resolve?: 'no-resolve'
	length?: 4
} );

/**
 * Clash 核心类型声明
 */

export interface ClashProxyItem {
	name: string;
	type: "ss" | "trojan" | string;
	server: string;
	port: number;
	password: string;
	udp: boolean;
	cipher?: string;
	sni?: string;
}

export interface CGroup {
	name: string;
	type: "select" | "url-test" | "fallback" | "load-balance";
	proxies: string[];
	url?: string;
	interval?: number;
	strategy?: "consistent-hashing" | "round-robin";
}

export enum RuleType {
	'DOMAIN-SUFFIX' = 0,
	'DOMAIN' = 1,
	'DOMAIN-KEYWORD' = 2,
	'IP-CIDR' = 3,
	'SRC-IP-CIDR' = 4,
	'GEOIP' = 5,
	'PROCESS-NAME' = 6,
	'DST-PORT' = 7,
	'SRC-PORT' = 8,
	'MATCH' = 9,
}

export interface ClashConfig {
	"mixed-port": number;
	"allow-lan": boolean;
	"bind-address": string;
	mode: string;
	"log-level": string;
	"external-controller": string;
	dns: {
		enable: boolean;
		ipv6: boolean;
		"default-nameserver": string[];
		"enhanced-mode": string;
		"fake-ip-range": string;
		"use-hosts": boolean;
		nameserver: string[];
		fallback: string[];
		"fallback-filter": {
			geoip: boolean;
			ipcidr: string[];
		};
	};
	proxies: ClashProxyItem[];
	"proxy-groups": CGroup[];
	rules: string[];
}

export type RuleObject = (
	[ keyof typeof RuleType, string ] & {
		type: keyof typeof RuleType;
		proxy: string;
	}
) & (
	[ keyof typeof RuleType, string, string ] & {
		type: keyof typeof RuleType;
		value: string;
		proxy: string;
	}
) & (
	[ keyof typeof RuleType, string, string, 'no-resolve' ] & {
		type: keyof typeof RuleType;
		value: string;
		proxy: string;
		resolve: 'no-resolve';
	}
);

export type _RuleObject =
	| ( [ keyof typeof RuleType, string?, string? ] & {
		type?: keyof typeof RuleType;
		value?: string;
		proxy?: string;
		length?: 3;
	} )
	| ( [ keyof typeof RuleType, string? ] & {
		type?: keyof typeof RuleType;
		proxy?: string;
		length?: 2;
	} )
	| ( [ keyof typeof RuleType, string?, string?, 'no-resolve'? ] & {
		type?: keyof typeof RuleType;
		value?: string;
		proxy?: string;
		resolve?: 'no-resolve';
		length?: 4;
	} );

import { YAML } from "./types/client";
import { converters, dedupProxiesInGroup } from './RuleConverters';
import yaml from 'yaml';
import { CGroup, ClashConfig, RuleType, _RuleObject, RuleObject } from './types/clash';

export class Clash {
	yaml: YAML;
	console: Console;
	source: ClashConfig;
	
	constructor (
		{ source, raw }: { source: Partial<ClashConfig>, raw: string },
		{ axios, yaml, notify, console }: { axios: unknown, yaml: YAML, notify: unknown, console: Console },
		{ name, url, interval, selected }: { name: string, url: string, interval: number, selected: string[] },
	) {
		
		if (!_.isPlainObject(source)) {
			console.log(source);
			throw '参数<source>必须是个clash对象';
		}
		
		// 确保 source 包含必要的字段
		// 注意：强制清空 proxy-groups 和 rules，避免保留 VPN 供应商的原始配置
		const defaultSource: Partial<ClashConfig> = {
			...source,
			'proxy-groups': [], // 覆盖 source 中的 proxy-groups
			rules: [] // 覆盖 source 中的 rules
		};
		
		_.assign(this, {
			source: defaultSource as ClashConfig,
			yaml,
			console,
		});
		
	}
	
	addGroups(...groups: Group[]) {
		if (!this.source['proxy-groups']) {
			this.source['proxy-groups'] = [];
		}
		this.source['proxy-groups'].push(...groups);
	}
	
	renameGroup = (name: string, newName: string) => {
		const { source } = this;
		if (_.isArray(source['proxy-groups'])) {
			source['proxy-groups'].forEach((group) => {
				if (group.name === name) {
					group.name = newName;
				}
				if (_.isArray(group.proxies)) {
					group.proxies.forEach((_name, index, proxies) => {
						if (_name === name) proxies[index] = newName;
					});
				}
			});
		}
		if (_.isArray(source['rules'])) {
			const rules = converters.rulesStrToRulesObject(source.rules) as _RuleObject[];
			rules.forEach((ruleObject: _RuleObject) => {
				if (ruleObject.proxy === name) {
					ruleObject.proxy = newName;
				}
			});
			this.source['rules'] = rules.map(converters.ruleObjectToRuleStr);
		}
		return this;
	}
	
	/**
	 * 给某个分组添加代理选项,
	 * @param group {string} 分组名
	 * @param prefix {string[]} 放在前面的代理
	 * @param suffix {string[]} 放在后面的代理
	 */
	addProxiesToGroup = (group: string, prefix: string[] = [], suffix: string[] = []) => {
		const { source } = this;
		const target = source['proxy-groups']?.find(({ name }) => group === name);
		if (target && _.isArray(target.proxies)) {
			target.proxies = dedupProxiesInGroup([
				...prefix,
				...target.proxies,
				...suffix,
			]);
		}
		return this;
	}
	
	/**
	 * 将某个分组替换为DIRECT,并删除该组
	 */
	replaceGroupTo = (groupName: string = 'DIRECT', target: string) => {
		const { source } = this;
		if (_.isArray(source['proxy-groups'])) {
			
			source['proxy-groups'] = source['proxy-groups'].filter(({ name, proxies }) => {
				proxies?.forEach((_name, index, arr) => {
					if (_name === groupName) {
						arr[index] = target;
					}
				});
				return name !== groupName;
			});
		}
		if (_.isArray(source['rules'])) {
			const rules = converters.rulesStrToRulesObject(source.rules);
			rules.forEach((ruleObject) => {
				if (ruleObject.proxy === groupName) {
					ruleObject.proxy = target;
				}
			});
			this.source['rules'] = rules.map(converters.ruleObjectToRuleStr);
		}
		return this;
	}
	
	/**
	 * 添加一条规则"DOMAIN-KEYWORD","baidu","DIRECT"
	 */
	addRule = (type: keyof typeof RuleType, value: string, groupName: string, tail = false) => {
		const rules = converters.rulesStrToRulesObject(this.source.rules || []);
		
		if (this.checkConflictRule(rules, { type, value, groupName })) {
			console.log(`此条规则已存在:${type},${value},${groupName}`);
			return;
		}
		if (type === 'MATCH') {
			if (tail) {
				this.console.log(`type=MATCH时不允许指定tail参数,因为MATCH永远应该在rules的最尾部`);
				tail = false;
			}
			rules.push([type, groupName] as unknown as _RuleObject);
		} else if (tail) {
			if (this.checkExistMatchRule(rules)) {
				rules.splice(rules.length - 2, 0, [type, value, groupName] as unknown as _RuleObject);
			}
		} else {
			rules.unshift([type, value, groupName] as unknown as _RuleObject);
		}
		this.source.rules = rules.map(converters.ruleObjectToRuleStr);
		return this;
	}
	
	/**
	 * 检查rules中是否存在MATCH规则
	 */
	checkExistMatchRule(rules: ReturnType<typeof converters.rulesStrToRulesObject>) {
		return rules.some((rule) => rule.type === 'MATCH');
	}
	
	/**
	 * 检查rules是否与新规则冲突
	 * todo 初步检查,不严谨,待深入规则后再完善
	 */
	checkConflictRule(rules: ReturnType<typeof converters.rulesStrToRulesObject>, { type, value, groupName }: { type: keyof typeof RuleType, value?: string, groupName: "DIRECT" | "REJECT" | string }) {
		let conflictFlag = false;
		rules.forEach((rule) => {
			if (rule.length === 3) {
				if (rule.type === type && rule.value === value && rule.proxy === groupName) {
					conflictFlag = true;
					this.console.log(`此规则<${type},${value},${groupName}>已与rules中有完全相同的条目`);
				}
			} else if (rule.length === 2) {
				if (rule.type === 'MATCH' && type === 'MATCH') {
					conflictFlag = true;
					this.console.log(`MATCH规则冲突>>每个rules里只能有一条MATCH规则置于末尾!已存在的MATCH:${rule.proxy};新的MATCH:${groupName}`);
				}
			}
		});
		return conflictFlag;
	}
	
	/**
	 * @example
	 * addRulesToGroup('资源下载',[
	 *    ['DOMAIN','github.download'],
	 *    ['DOMAIN','gitee.download'],
	 * ])
	 * 会添加所有下载东西的网址匹配规则给<资源下载分组>
	 */
	addRulesToGroup = (groupName: string, newRules: ([keyof typeof RuleType, string] | string[])[]) => {
		const readyToAddRules = [];
		const rules = converters.rulesStrToRulesObject(this.source.rules || []);
		newRules.forEach((rule) => {
			const [newRuleType, newValue] = rule as [keyof typeof RuleType, string];
			const isDuplicated = rules.find((ruleObj) => {
				if (ruleObj.length === 3 || ruleObj.length === 4) {
					return (ruleObj.type === newRuleType)
						&& (ruleObj.value === newValue);
				} else {
					return (ruleObj.type === newRuleType) && (ruleObj.proxy === groupName);
				}
			});
			if (isDuplicated) {
				this.removeRule({ value: newValue, type: newRuleType });
			}
			readyToAddRules.push([newRuleType, newValue, groupName]);
		});
		
		this.source.rules = [
			...readyToAddRules,
			...rules
		].map(converters.ruleObjectToRuleStr);
		return this;
	}
	
	removeRule = ({ type, value }: { type: keyof typeof RuleType, value: string }) => {
		this.source['rules'] = this.source['rules']?.filter((rule) => !rule.startsWith(`${type},${value}`)) || [];
		return this;
	}
	
	get raw() {
		return this.yaml.stringify(this.source);
	}
}


export class Group implements CGroup {
	proxies: string[];
	interval?: number;
	strategy?: "consistent-hashing" | "round-robin";
	name: string;
	type: "select" | "url-test" | "fallback" | "load-balance";
	url?: string;

	constructor(conf: Partial<CGroup>) {
		Object.assign(this, this.#defaultConf, conf);
	}
	
	/**
	 *
	 * @type {Partial<CGroup>}
	 */
	#defaultConf: Partial<CGroup> = {
		type: 'select',
		proxies: [],
	};
}

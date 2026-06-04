/**
 * Clash rules 的 policy 目标可以是内置策略、代理组或单个代理节点。
 */

const BUILTIN_RULE_POLICIES = [
	'DIRECT',
	'REJECT',
	'REJECT-DROP',
	'REJECT-NO-DROP',
	'PASS',
	'block',
] as const;

export function collectAvailableRulePolicyTargets(
	presetGroups: object,
	proxiesList: string[] = [],
	customGroups: Array<{ name?: string }> = [],
): Set<string> {
	const presetRecord = presetGroups as Record<PropertyKey, unknown>;
	
	// presetGroups 使用 Symbol 作为部分 key，Object.values 会漏掉这些分组。
	const presetGroupNames = Reflect.ownKeys(presetRecord)
		.map((key) => presetRecord[key])
		.filter((value): value is string => typeof value === 'string' && value.length > 0);
	
	const customGroupNames = customGroups
		.map((group) => group.name)
		.filter((name): name is string => typeof name === 'string' && name.length > 0);
	
	return new Set([
		...BUILTIN_RULE_POLICIES,
		...presetGroupNames,
		...proxiesList,
		...customGroupNames,
	]);
}

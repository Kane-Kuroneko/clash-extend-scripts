/**
 * 测试工具类
 * 提供通用的测试辅助函数
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface BuildArtifact {
	client: 'cfw' | 'cvr' | 'clash-party';
	mode: 'global-proxy' | 'auto-routing';
	content: string;
	filePath: string;
}

/**
 * 读取构建产物
 */
export function readBuildArtifact(client: string, mode: string): BuildArtifact {
	const filePath = join(process.cwd(), 'dist', client, `${mode}.js`);
	
	if (!existsSync(filePath)) {
		throw new Error(`构建产物不存在: ${filePath}`);
	}
	
	const content = readFileSync(filePath, 'utf-8');
	
	return {
		client: client as any,
		mode: mode as any,
		content,
		filePath
	};
}

/**
 * 验证代理组配置
 */
export function validateProxyGroups(
	config: any, 
	expectedGroups: string[]
): { success: boolean; missing: string[]; details: string } {
	if (!config['proxy-groups'] || !Array.isArray(config['proxy-groups'])) {
		return {
			success: false,
			missing: expectedGroups,
			details: '配置中没有 proxy-groups'
		};
	}
	
	const actualGroups = config['proxy-groups'].map((g: any) => g.name);
	const missing = expectedGroups.filter(g => !actualGroups.includes(g));
	
	return {
		success: missing.length === 0,
		missing,
		details: `期望: [${expectedGroups.join(', ')}]\n实际: [${actualGroups.join(', ')}]`
	};
}

/**
 * 验证规则配置
 */
export function validateRules(
	config: any,
	expectedRuleCount: number
): { success: boolean; actualCount: number; details: string } {
	if (!config.rules || !Array.isArray(config.rules)) {
		return {
			success: false,
			actualCount: 0,
			details: '配置中没有 rules'
		};
	}
	
	const actualCount = config.rules.length;
	
	return {
		success: actualCount >= expectedRuleCount,
		actualCount,
		details: `期望至少 ${expectedRuleCount} 条规则，实际 ${actualCount} 条`
	};
}

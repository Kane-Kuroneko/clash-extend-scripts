/**
 * Clash 客户端虚拟宿主环境
 * 模拟真实 Clash 客户端的运行时环境
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

export interface ClashClientHost {
	// CFW 环境依赖
	axios?: any;
	yaml?: {
		parse: (str: string) => any;
		stringify: (obj: any) => string;
	};
	notify?: any;
	console: Console;
	
	// CVR/Clash Party 环境
	main?: Function;
}

export interface TestResult {
	success: boolean;
	output: any;
	error?: Error;
	logs: string[];
}

/**
 * 创建虚拟 Clash 客户端环境
 */
export function createClashClientEnvironment(): ClashClientHost {
	const logs: string[] = [];
	
	const mockConsole: Console = {
		log: (...args: any[]) => {
			logs.push(`[LOG] ${args.map(a => String(a)).join(' ')}`);
		},
		warn: (...args: any[]) => {
			logs.push(`[WARN] ${args.map(a => String(a)).join(' ')}`);
		},
		error: (...args: any[]) => {
			logs.push(`[ERROR] ${args.map(a => String(a)).join(' ')}`);
		},
		info: (...args: any[]) => {
			logs.push(`[INFO] ${args.map(a => String(a)).join(' ')}`);
		},
		debug: (...args: any[]) => {
			logs.push(`[DEBUG] ${args.map(a => String(a)).join(' ')}`);
		},
	} as Console;

	return {
		console: mockConsole,
	};
}

/**
 * 加载并执行构建产物
 * 使用子进程方式，在真实 Node.js 环境中运行构建产物
 */
export function loadAndExecuteBuild(
	client: 'cfw' | 'cvr' | 'clash-party',
	mode: 'global-proxy' | 'auto-routing'
): { 
	main?: Function;
	parse?: Function;
	host: ClashClientHost;
	logs: string[];
} {
	const logs: string[] = [];
	const mockConsole: any = {
		log: (...args: any[]) => logs.push(`[LOG] ${args.map(a => String(a)).join(' ')}`),
		warn: (...args: any[]) => logs.push(`[WARN] ${args.map(a => String(a)).join(' ')}`),
		error: (...args: any[]) => logs.push(`[ERROR] ${args.map(a => String(a)).join(' ')}`),
	};
	
	const host: ClashClientHost = { console: mockConsole };
	
	// 返回一个包装函数，在调用时才通过子进程执行
	const mainFunc = (config?: any) => {
		const buildPath = join(process.cwd(), 'dist', client, `${mode}.js`);
		const tempFile = join(process.cwd(), 'tests', '.temp-test.js');
		
		try {
			// 读取构建产物
			const buildCode = readFileSync(buildPath, 'utf-8');
			
			// 创建临时脚本
			const script = `${buildCode}
var testConfig = ${JSON.stringify(config)};
var result = main(testConfig);
console.log('__RESULT__' + JSON.stringify(result));`;
			
			writeFileSync(tempFile, script);
			
			// 执行并获取结果
			const output = execSync(`node ${tempFile}`, {
				encoding: 'utf-8',
				timeout: 10000,
				maxBuffer: 50 * 1024 * 1024 // 50MB
			});
			
			// 解析结果
			const resultLine = output.split('\n').find((line: string) => line.includes('__RESULT__'));
			if (!resultLine) {
				throw new Error('No result found in output: ' + output);
			}
			
			return JSON.parse(resultLine.replace('__RESULT__', ''));
		} finally {
			// 清理临时文件
			try { unlinkSync(tempFile); } catch (e) {}
		}
	};
	
	return {
		main: mainFunc,
		host,
		logs,
	};
}

/**
 * 测试 CVR/Clash Party 的 main 函数
 */
export function testMainFunction(
	client: 'cvr' | 'clash-party',
	mode: 'global-proxy' | 'auto-routing',
	testConfig: any
): TestResult {
	const logs: string[] = [];
	
	try {
		// 加载构建产物
		const { main, host } = loadAndExecuteBuild(client, mode);
		
		if (!main) {
			return {
				success: false,
				output: null,
				error: new Error(`${client}/${mode} 没有导出 main 函数`),
				logs,
			};
		}
		
		// 验证 main 函数在顶层作用域
		if (typeof main !== 'function') {
			return {
				success: false,
				output: null,
				error: new Error('main 不是函数'),
				logs,
			};
		}
		
		// 执行 main 函数
		const result = main(testConfig);
		
		return {
			success: true,
			output: result,
			logs,
		};
	} catch (error) {
		return {
			success: false,
			output: null,
			error: error as Error,
			logs,
		};
	}
}

/**
 * 测试 CFW 的 parse 函数
 */
export function testParseFunction(
	mode: 'global-proxy' | 'auto-routing',
	rawYaml: string,
	params: {
		name: string;
		url: string;
		interval: number;
		selected: string[];
	}
): TestResult {
	const logs: string[] = [];
	
	try {
		// 加载构建产物
		const { parse, host } = loadAndExecuteBuild('cfw', mode);
		
		if (!parse) {
			return {
				success: false,
				output: null,
				error: new Error(`cfw/${mode} 没有导出 parse 函数`),
				logs,
			};
		}
		
		// 执行 parse 函数
		const result = parse(
			rawYaml,
			{
				axios: host.axios,
				yaml: host.yaml,
				notify: host.notify,
				console: host.console,
			},
			params
		);
		
		return {
			success: true,
			output: result,
			logs,
		};
	} catch (error) {
		return {
			success: false,
			output: null,
			error: error as Error,
			logs,
		};
	}
}

/**
 * 验证配置结果
 */
export function validateConfigResult(
	config: any,
	expectedChecks: {
		hasProxyGroups?: string[];
		hasRules?: boolean;
		minRuleCount?: number;
		notHasProxyGroups?: string[];
		proxyGroupsContain?: string[];
	}
): { success: boolean; messages: string[] } {
	const messages: string[] = [];
	let success = true;
	
	// 检查必需的代理组
	if (expectedChecks.hasProxyGroups) {
		const actualGroups = config['proxy-groups']?.map((g: any) => g.name) || [];
		for (const groupName of expectedChecks.hasProxyGroups) {
			if (!actualGroups.includes(groupName)) {
				messages.push(`缺少代理组: ${groupName}`);
				success = false;
			}
		}
	}
	
	// 检查不应存在的代理组
	if (expectedChecks.notHasProxyGroups) {
		const actualGroups = config['proxy-groups']?.map((g: any) => g.name) || [];
		for (const groupName of expectedChecks.notHasProxyGroups) {
			if (actualGroups.includes(groupName)) {
				messages.push(`不应存在的代理组: ${groupName}`);
				success = false;
			}
		}
	}
	
	// 检查规则
	if (expectedChecks.hasRules) {
		if (!config.rules || !Array.isArray(config.rules)) {
			messages.push('缺少 rules');
			success = false;
		}
	}
	
	// 检查规则数量
	if (expectedChecks.minRuleCount !== undefined) {
		const ruleCount = config.rules?.length || 0;
		if (ruleCount < expectedChecks.minRuleCount) {
			messages.push(`规则数量不足: 期望至少 ${expectedChecks.minRuleCount}，实际 ${ruleCount}`);
			success = false;
		}
	}
	
	// 检查代理组包含的代理
	if (expectedChecks.proxyGroupsContain) {
		for (const proxyName of expectedChecks.proxyGroupsContain) {
			let found = false;
			for (const group of config['proxy-groups'] || []) {
				if (group.proxies?.includes(proxyName)) {
					found = true;
					break;
				}
			}
			if (!found) {
				messages.push(`代理 ${proxyName} 未出现在任何代理组中`);
				success = false;
			}
		}
	}
	
	return { success, messages };
}

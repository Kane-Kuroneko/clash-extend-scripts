/**
 * 用户自定义规则转换器
 * 将 Proxifier 风格的三维规则转换为 Mihomo AND 规则
 */

import type { User3DRule, HostRule } from '../types/user-rules';

/**
 * 将单个三维规则转换为多条 Mihomo AND 规则字符串
 * 
 * 转换逻辑：
 * 1. process AND (host1 OR host2 OR ...) AND (port1 OR port2 OR ...)
 * 2. 展开为笛卡尔积：每条规则 = process + 1个host + 1个port
 * 3. 如果 ports 为空，则不添加 DST-PORT 条件
 * 
 * @param rule 三维规则
 * @returns Mihomo AND 规则字符串数组
 */
export function convert3DRuleToMihomoANDRules(rule: User3DRule): string[] {
  // 检查规则是否启用
  if (rule.enabled === false) {
    return [];
  }

  const mihomoRules: string[] = [];
  
  // 构建进程匹配部分
  const processPart = buildProcessPart(rule.process);
  
  // 构建域名匹配部分（多个 host 是 OR 关系，需要分别创建规则）
  // 构建端口匹配部分（多个 port 是 OR 关系，需要分别创建规则）
  
  // 笛卡尔积展开：每个 host × 每个 port
  for (const host of rule.hosts) {
    const hostPart = buildHostPart(host);
    
    if (rule.ports && rule.ports.length > 0) {
      // 有端口限制：为每个端口创建一条规则
      for (const port of rule.ports) {
        const portPart = `DST-PORT,${port}`;
        const andRule = buildANDRule([processPart, hostPart, portPart], rule.group, rule.noResolve);
        mihomoRules.push(andRule);
      }
    } else {
      // 无端口限制：只使用 process + host
      const andRule = buildANDRule([processPart, hostPart], rule.group, rule.noResolve);
      mihomoRules.push(andRule);
    }
  }
  
  return mihomoRules;
}

/**
 * 构建进程匹配部分
 */
function buildProcessPart(process: string | { type: string; value: string }): string {
  if (typeof process === 'string') {
    if (process === '*') {
      // "*" 表示匹配所有进程，在 AND 规则中不需要这个条件
      // 返回空字符串，调用方需要处理
      return '';
    }
    return `PROCESS-NAME,${process}`;
  }
  
  return `${process.type},${process.value}`;
}

/**
 * 构建域名/IP 匹配部分
 */
function buildHostPart(host: HostRule): string {
  return `${host.type},${host.value}`;
}

/**
 * 构建 AND 规则字符串
 * 
 * 格式：AND,((规则1),(规则2),(规则3)),代理组
 * 
 * @param conditions 条件列表（已过滤空字符串）
 * @param group 代理组名称
 * @param noResolve 是否跳过 DNS 解析
 */
function buildANDRule(conditions: string[], group: string, noResolve?: boolean): string {
  // 过滤空字符串（如 process="*" 的情况）
  const validConditions = conditions.filter(c => c !== '');
  
  if (validConditions.length === 0) {
    throw new Error('AND 规则至少需要一个条件');
  }
  
  // 如果只有一个条件，不需要 AND 逻辑
  if (validConditions.length === 1) {
    const rule = `${validConditions[0]},${group}`;
    return noResolve ? `${rule},no-resolve` : rule;
  }
  
  // 构建 AND 规则
  const conditionsStr = validConditions.map(c => `(${c})`).join(',');
  const rule = `AND,(${conditionsStr}),${group}`;
  
  return noResolve ? `${rule},no-resolve` : rule;
}

/**
 * 批量转换三维规则
 * 
 * @param rules 三维规则列表
 * @returns Mihomo 规则字符串数组
 */
export function convert3DRulesToMihomoRules(rules: User3DRule[]): string[] {
  const allRules: string[] = [];
  
  for (const rule of rules) {
    const converted = convert3DRuleToMihomoANDRules(rule);
    allRules.push(...converted);
  }
  
  return allRules;
}

/**
 * 验证三维规则的有效性
 * 
 * @param rule 三维规则
 * @returns 验证结果
 */
export function validate3DRule(rule: User3DRule): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查 process
  if (!rule.process) {
    errors.push('process 字段不能为空');
  }
  
  // 检查 hosts
  if (!rule.hosts || rule.hosts.length === 0) {
    errors.push('hosts 数组不能为空，至少需要一个域名匹配规则');
  } else {
    // 验证每个 host 规则
    rule.hosts.forEach((host, index) => {
      if (!host.type) {
        errors.push(`hosts[${index}].type 不能为空`);
      }
      if (!host.value) {
        errors.push(`hosts[${index}].value 不能为空`);
      }
    });
  }
  
  // 检查 ports（如果提供）
  if (rule.ports && rule.ports.length > 0) {
    rule.ports.forEach((port, index) => {
      if (typeof port !== 'number' || port < 1 || port > 65535) {
        errors.push(`ports[${index}] 必须是 1-65535 之间的数字`);
      }
    });
  }
  
  // 检查 group
  if (!rule.group) {
    errors.push('group 字段不能为空');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 批量验证三维规则
 * 
 * @param rules 三维规则列表
 * @returns 验证结果列表
 */
export function validate3DRules(rules: User3DRule[]): Array<{ rule: User3DRule; valid: boolean; errors: string[] }> {
  return rules.map(rule => ({
    rule,
    ...validate3DRule(rule)
  }));
}

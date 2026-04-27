/**
 * Proxifier 风格三维规则类型定义
 * 
 * 用于用户自定义规则配置，支持进程 × 域名 × 端口的 AND 逻辑
 * 此类型定义在 src/config/ 和 custom-rules-config/ 之间共享
 */

/**
 * 主机匹配类型（Mihomo 支持的类型）
 */
export type HostMatchType = 
  | 'DOMAIN'              // 精确域名
  | 'DOMAIN-SUFFIX'       // 域名后缀
  | 'DOMAIN-KEYWORD'      // 域名关键词
  | 'DOMAIN-WILDCARD'     // 域名通配符
  | 'DOMAIN-REGEX'        // 域名正则
  | 'GEOSITE'             // GeoSite 数据库
  | 'IP-CIDR'             // IPv4 CIDR
  | 'IP-CIDR6'            // IPv6 CIDR
  | 'IP-SUFFIX'           // IP 后缀
  | 'IP-ASN'              // ASN
  | 'GEOIP';              // GeoIP 数据库

/**
 * 进程匹配类型（Mihomo 支持的类型）
 */
export type ProcessMatchType = 
  | 'PROCESS-NAME'          // 进程名精确匹配
  | 'PROCESS-NAME-WILDCARD' // 进程名通配符
  | 'PROCESS-NAME-REGEX'    // 进程名正则
  | 'PROCESS-PATH'          // 进程路径精确匹配
  | 'PROCESS-PATH-WILDCARD' // 进程路径通配符
  | 'PROCESS-PATH-REGEX';   // 进程路径正则

/**
 * 域名匹配规则
 */
export interface HostRule {
  type: HostMatchType;
  value: string;
}

/**
 * 进程匹配规则
 */
export interface ProcessRule {
  type: ProcessMatchType;
  value: string;
}

/**
 * 用户自定义三维规则（Proxifier 风格）
 * 
 * 规则逻辑：process AND (hosts[0] OR hosts[1] OR ...) AND (ports[0] OR ports[1] OR ...)
 * 
 * @example
 * {
 *   process: 'chrome.exe',
 *   hosts: [
 *     { type: 'DOMAIN-SUFFIX', value: 'google.com' }
 *   ],
 *   ports: [80, 443],
 *   group: '🫧 Proxy A 🫧',
 *   description: 'Chrome 访问 Google 走代理'
 * }
 */
export interface User3DRule {
  /** 进程匹配，支持 "*" 表示所有进程 */
  process: string | ProcessRule;
  
  /** 域名匹配（必填，至少一个） */
  hosts: HostRule[];
  
  /** 端口（可选，不填表示所有端口） */
  ports?: number[];
  
  /** 代理组名称 */
  group: string;
  
  /** 跳过 DNS 解析（IP 规则建议开启） */
  noResolve?: boolean;
  
  /** 规则开关（默认启用） */
  enabled?: boolean;
  
  /** 规则备注 */
  description?: string;
}

/**
 * 简单规则（保留向后兼容）
 */
export interface SimpleRule {
  type: string;
  value: string;
  group: string;
  noResolve?: boolean;
}

/**
 * 代理组定义
 */
export interface ProxyGroup {
  name: string;
  type: 'select' | 'url-test' | 'fallback' | 'load-balance';
  proxies: string[];
  url?: string;
  interval?: number;
  [key: string]: unknown;
}

/**
 * 用户自定义规则配置（完整结构）
 */
export interface UserCustomRulesConfig {
  /** 三维规则（Proxifier 风格） */
  rules3D?: User3DRule[];
  
  /** 简单规则（向后兼容） */
  simpleRules?: {
    prepend?: SimpleRule[];
    append?: SimpleRule[];
  };
  
  /** 自定义代理组 */
  groups?: ProxyGroup[];
}

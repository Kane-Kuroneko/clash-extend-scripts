/**
 * 完整示例：如何从 Proxifier 风格 JSON 转换为 TypeScript 三维规则
 * 
 * 原始 JSON 格式（参考你提供的 t.json）：
 * [
 *   {
 *     "process": "*",
 *     "hosts": [
 *       { "type": "DOMAIN-SUFFIX", "value": "qoder.com" }
 *     ],
 *     "ports": [4399, 4400]
 *   }
 * ]
 * 
 * 转换为 TypeScript 三维规则（见下方）
 */

import type { UserCustomRulesConfig } from '../src/types/user-rules';

export const userCustomRules: UserCustomRulesConfig = {
  // ========== 三维规则（Proxifier 风格） ==========
  rules3D: [
    // 示例 1：你提供的 JSON 示例
    // 原始：process="*", hosts=[qoder.com], ports=[4399,4400]
    {
      process: '*',  // 所有进程
      hosts: [
        { type: 'DOMAIN-SUFFIX', value: 'qoder.com' }
      ],
      ports: [4399, 4400],
      group: 'DIRECT',
      description: 'qoder.com 特定端口直连（来自 t.json 示例）'
    },
    
    // 示例 2：Steam 社区代理（进程 + 域名）
    {
      process: 'steam.exe',
      hosts: [
        { type: 'DOMAIN-WILDCARD', value: '*.steamcommunity.*' }
      ],
      group: '🫧 Proxy A 🫧',
      description: 'Steam 社区走代理 A'
    },
    
    // 示例 3：Steam 下载直连（进程 + 域名 + 端口）
    {
      process: 'steam.exe',
      hosts: [
        { type: 'DOMAIN-WILDCARD', value: '*.steamcontent.com' },
        { type: 'DOMAIN-WILDCARD', value: '*.steamserver.net' }
      ],
      ports: [80, 443],
      group: 'DIRECT',
      description: 'Steam 下载直连'
    },
    
    // 示例 4：Chrome 浏览器访问 Google（进程 + 多个域名）
    {
      process: 'chrome.exe',
      hosts: [
        { type: 'DOMAIN-SUFFIX', value: 'google.com' },
        { type: 'DOMAIN-SUFFIX', value: 'googleapis.com' },
        { type: 'DOMAIN-SUFFIX', value: 'gstatic.com' }
      ],
      group: '🫧 Proxy A 🫧',
      description: 'Chrome 访问 Google 服务走代理 A'
    },
    
    // 示例 5：内网 IP 直连（进程 + IP 网段 + 跳过 DNS）
    {
      process: 'myapp.exe',
      hosts: [
        { type: 'IP-CIDR', value: '192.168.0.0/16' },
        { type: 'IP-CIDR', value: '10.0.0.0/8' },
        { type: 'IP-CIDR', value: '172.16.0.0/12' }
      ],
      group: 'DIRECT',
      noResolve: true,
      description: '内网 IP 直连（跳过 DNS 解析）'
    },
    
    // 示例 6：禁用规则示例
    {
      process: 'old-app.exe',
      hosts: [
        { type: 'DOMAIN-SUFFIX', value: 'example.com' }
      ],
      group: '🫧 Proxy A 🫧',
      enabled: false,
      description: '已禁用的旧规则'
    },
    
    // 示例 7：进程正则匹配
    {
      process: {
        type: 'PROCESS-NAME-REGEX',
        value: '.*chrome.*'
      },
      hosts: [
        { type: 'DOMAIN-SUFFIX', value: 'youtube.com' }
      ],
      group: '🌍 Foreign Media',
      description: '所有 Chrome 相关进程访问 YouTube 走国外媒体代理'
    },
    
    // 示例 8：特定端口代理
    {
      process: 'firefox.exe',
      hosts: [
        { type: 'DOMAIN-KEYWORD', value: 'github' }
      ],
      ports: [443],
      group: '🫧 Proxy A 🫧',
      description: 'Firefox 访问 GitHub HTTPS 走代理 A'
    }
  ],
  
  // ========== 简单规则（传统 Clash 风格，可选） ==========
  simpleRules: {
    prepend: [
      // 最高优先级的简单规则
      {
        type: 'DOMAIN',
        value: 'localhost',
        group: 'DIRECT'
      }
    ],
    append: [
      // MATCH 之前的简单规则
      {
        type: 'GEOIP',
        value: 'CN',
        group: '🟢 China Direct'
      }
    ]
  },
  
  // ========== 自定义代理组（可选） ==========
  groups: []
};

/**
 * 转换说明：
 * 
 * 1. process 字段：
 *    - 字符串：'chrome.exe' → PROCESS-NAME,chrome.exe
 *    - '*'：表示所有进程，在 AND 规则中会省略
 *    - 对象：{ type: 'PROCESS-NAME-REGEX', value: '.*chrome.*' }
 * 
 * 2. hosts 字段：
 *    - 数组，每个元素是一个域名/IP 匹配规则
 *    - 多个 host 是 OR 关系，会展开为多条规则
 * 
 * 3. ports 字段：
 *    - 可选，端口数组
 *    - 多个 port 是 OR 关系，会与 hosts 做笛卡尔积展开
 *    - 不填或 [] 表示匹配所有端口
 * 
 * 4. group 字段：
 *    - 代理组名称，可以是预设组或自定义组
 * 
 * 5. noResolve 字段：
 *    - 可选，仅对 IP 规则有效
 *    - 设置为 true 会添加 ,no-resolve 后缀
 * 
 * 6. enabled 字段：
 *    - 可选，默认 true
 *    - 设置为 false 会跳过该规则
 * 
 * 7. description 字段：
 *    - 可选，规则备注，用于说明规则用途
 */

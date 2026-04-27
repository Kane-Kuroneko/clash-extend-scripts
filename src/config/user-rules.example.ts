/**
 * 用户自定义三维规则示例（Proxifier 风格）
 * 
 * 📝 使用说明：
 * 1. 复制此文件到你的自定义配置目录（如 custom-rules-config/）
 * 2. 根据需要修改三维规则（process × hosts × ports）
 * 3. 构建时使用：npm run build:cvr:auto:custom -- --user-rules=./你的路径/user-rules.ts
 * 
 * 💡 规则逻辑：
 * - process: 进程名（"*" 表示所有进程）
 * - hosts: 域名匹配规则（多个为 OR 关系）
 * - ports: 端口（可选，多个为 OR 关系）
 * - 转换为 Mihomo AND 规则：AND,((PROCESS-NAME,xxx),(DOMAIN-SUFFIX,xxx),(DST-PORT,xxx)),ProxyGroup
 */

import type { UserCustomRulesConfig } from '../types/user-rules';

export const userCustomRules: UserCustomRulesConfig = {
  // ========== 三维规则（Proxifier 风格） ==========
  rules3D: [
    // 示例1: qoder.com 直连（所有进程 + 域名 + 所有端口）
    {
      process: '*',  // 所有进程
      hosts: [
        { type: 'DOMAIN-SUFFIX', value: 'qoder.com' }
      ],
      group: 'DIRECT',
      description: 'qoder.com 直连'
    },
    
    // 示例2: Chrome 访问 Google 走代理 A（特定进程 + 域名 + 所有端口）
    {
      process: 'chrome.exe',
      hosts: [
        { type: 'DOMAIN-SUFFIX', value: 'google.com' },
        { type: 'DOMAIN-SUFFIX', value: 'googleapis.com' }
      ],
      group: '🫧 Proxy A 🫧',
      description: 'Chrome 访问 Google 走代理 A'
    },
    
    // 示例3: Steam 下载直连（特定进程 + 域名 + 特定端口）
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
    
    // 示例4: 特定进程访问内网直连（IP 规则）
    {
      process: 'myapp.exe',
      hosts: [
        { type: 'IP-CIDR', value: '192.168.1.0/24' },
        { type: 'IP-CIDR', value: '10.0.0.0/8' }
      ],
      group: 'DIRECT',
      noResolve: true,  // 跳过 DNS 解析
      description: '内网 IP 直连'
    },
    
    // 示例5: 禁用规则示例（不会生效）
    {
      process: 'old-app.exe',
      hosts: [
        { type: 'DOMAIN-SUFFIX', value: 'example.com' }
      ],
      group: '🫧 Proxy A 🫧',
      enabled: false,  // 此规则被禁用
      description: '已禁用的旧规则'
    }
  ],
  
  // ========== 简单规则（传统 Clash 风格，可选） ==========
  simpleRules: {
    // 前置规则（最高优先级）
    prepend: [
      // {
      //   type: 'DOMAIN-SUFFIX',
      //   value: 'special.example.com',
      //   group: 'DIRECT'
      // }
    ],
    
    // 后置规则（MATCH 之前）
    append: [
      // {
      //   type: 'PROCESS-NAME',
      //   value: 'wechat.exe',
      //   group: '🟢 China Direct'
      // }
    ]
  },
  
  // ========== 自定义代理组（可选） ==========
  groups: [
    // {
    //   name: '🎯 My Custom Group',
    //   type: 'select',
    //   proxies: ['DIRECT', 'REJECT', '🫧 Proxy A 🫧', '🍀 Proxy B 🍀']
    // }
  ]
};

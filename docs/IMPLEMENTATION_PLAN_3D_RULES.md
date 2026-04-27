# 用户自定义三维规则系统实现方案

## 📋 概述

本实现采用 **Proxifier GUI 风格**的三维规则配置模式，通过 **进程(process) × 域名(hosts) × 端口(ports)** 的组合来构建 Mihomo 的 AND 逻辑规则。

## 🎯 设计目标

1. ✅ **用户友好**：配置格式直观，类似 Proxifier 的三维规则界面
2. ✅ **类型安全**：完整的 TypeScript 类型定义
3. ✅ **Mihomo 兼容**：严格遵循 Mihomo AND 规则语法
4. ✅ **自动转换**：自动将三维规则转换为 Mihomo AND 规则
5. ✅ **规则验证**：构建时自动验证规则有效性
6. ✅ **灵活配置**：支持所有 Mihomo 域名和进程匹配类型

## 📁 文件结构

```
src/
├── config/
│   ├── UserCustomRules.ts              # 类型定义和默认配置
│   ├── UserCustomRulesConverter.ts     # 规则转换器
│   ├── UserCustomRules.test.ts         # 类型测试
│   ├── UserCustomRulesConverter.test.ts # 转换器测试
│   └── user-rules.example.ts           # 示例配置（旧版，保留兼容）
│
├── AutoRoutingConfig.ts                # 集成用户规则到构建流程
└── types/
    └── build.d.ts                      # 全局类型声明

custom-rules-config/
├── user-rules.ts                       # 用户实际编辑的规则文件
├── user-rules.full-example.ts          # 完整示例
├── package.json                        # NPM 脚本
├── README.md                           # 使用说明
└── .gitignore                          # 忽略用户规则文件

docs/
├── USER_CUSTOM_RULES_3D.md             # 三维规则详细文档
└── USER_CUSTOM_RULES.md                # 旧版文档（保留）
```

## 🔧 核心实现

### 1. 类型定义 (`UserCustomRules.ts`)

```typescript
// 三维规则接口
export interface User3DRule {
  process: string | ProcessRule;  // 进程匹配
  hosts: HostRule[];              // 域名匹配（必填）
  ports?: number[];               // 端口（可选）
  group: string;                  // 代理组
  noResolve?: boolean;            // 跳过 DNS
  enabled?: boolean;              // 规则开关
  description?: string;           // 备注
}

// 域名匹配类型
export type HostMatchType = 
  | 'DOMAIN' | 'DOMAIN-SUFFIX' | 'DOMAIN-KEYWORD'
  | 'DOMAIN-WILDCARD' | 'DOMAIN-REGEX'
  | 'GEOSITE' | 'IP-CIDR' | 'IP-CIDR6'
  | 'IP-SUFFIX' | 'IP-ASN' | 'GEOIP';

// 进程匹配类型
export type ProcessMatchType = 
  | 'PROCESS-NAME' | 'PROCESS-NAME-WILDCARD' | 'PROCESS-NAME-REGEX'
  | 'PROCESS-PATH' | 'PROCESS-PATH-WILDCARD' | 'PROCESS-PATH-REGEX';
```

### 2. 规则转换器 (`UserCustomRulesConverter.ts`)

**转换逻辑**：

```
输入三维规则：
{
  process: 'chrome.exe',
  hosts: [
    { type: 'DOMAIN-SUFFIX', value: 'google.com' },
    { type: 'DOMAIN-SUFFIX', value: 'youtube.com' }
  ],
  ports: [80, 443],
  group: '🫧 Proxy A 🫧'
}

↓ 笛卡尔积展开

输出 Mihomo AND 规则（4条）：
AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,google.com),(DST-PORT,80)),🫧 Proxy A 🫧
AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,google.com),(DST-PORT,443)),🫧 Proxy A 🫧
AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,youtube.com),(DST-PORT,80)),🫧 Proxy A 🫧
AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,youtube.com),(DST-PORT,443)),🫧 Proxy A 🫧
```

**核心函数**：

```typescript
// 转换单个三维规则
export function convert3DRuleToMihomoANDRules(rule: User3DRule): string[]

// 批量转换
export function convert3DRulesToMihomoRules(rules: User3DRule[]): string[]

// 验证规则
export function validate3DRule(rule: User3DRule): { valid: boolean; errors: string[] }
```

### 3. 集成到构建流程 (`AutoRoutingConfig.ts`)

```typescript
buildRules() {
  const rules: string[] = [];
  
  // 1. 用户自定义三维规则（最高优先级）
  if (this.userRules.rules3D && this.userRules.rules3D.length > 0) {
    // 验证规则
    const validationResults = validate3DRules(this.userRules.rules3D);
    
    // 转换有效规则
    const validRules = this.userRules.rules3D.filter(rule => rule.enabled !== false);
    const convertedRules = convert3DRulesToMihomoRules(validRules);
    rules.push(...convertedRules);
  }
  
  // 2. 用户自定义简单前置规则
  // 3. 系统规则（GFW、Proxy 等）
  // ...
  // 11. 用户自定义简单后置规则
  // 12. MATCH 兜底规则
}
```

### 4. Webpack 配置 (`webpack.base.ts`)

```typescript
// 加载用户规则文件
let userCustomRules = { rules3D: [], simpleRules: { prepend: [], append: [] }, groups: [] };
if (args['user-rules']) {
  const userRulesModule = await import(args['user-rules']);
  userCustomRules = userRulesModule.userCustomRules || {};
}

// 注入到编译时代码
new DefinePlugin({
  __USER_CUSTOM_RULES__: JSON.stringify(userCustomRules),
})
```

## 📊 规则优先级

```
1. 用户原始规则（从 CVR 客户端配置）
2. 用户自定义三维规则（转换为 AND 规则） ← 新增
3. 用户自定义简单前置规则
4. 系统规则（GFW、Proxy、Telegram 等）
5. 用户自定义简单后置规则
6. MATCH 兜底规则
```

## 💡 使用示例

### 示例 1：你提供的 JSON 格式

**原始 JSON**（`t.json`）：
```json
[
  {
    "process": "*",
    "hosts": [
      { "type": "DOMAIN-SUFFIX", "value": "qoder.com" }
    ],
    "ports": [4399, 4400]
  }
]
```

**转换为 TypeScript**：
```typescript
{
  process: '*',
  hosts: [
    { type: 'DOMAIN-SUFFIX', value: 'qoder.com' }
  ],
  ports: [4399, 4400],
  group: 'DIRECT',
  description: 'qoder.com 特定端口直连'
}
```

**转换为 Mihomo 规则**：
```
DOMAIN-SUFFIX,qoder.com,DIRECT
```

> 注意：`process="*"` 表示所有进程，在 AND 规则中会省略进程条件

### 示例 2：Steam 社区代理

```typescript
{
  process: 'steam.exe',
  hosts: [
    { type: 'DOMAIN-WILDCARD', value: '*.steamcommunity.*' }
  ],
  group: '🫧 Proxy A 🫧'
}
```

**转换为**：
```
AND,((PROCESS-NAME,steam.exe),(DOMAIN-WILDCARD,*.steamcommunity.*)),🫧 Proxy A 🫧
```

### 示例 3：Steam 下载直连（带端口）

```typescript
{
  process: 'steam.exe',
  hosts: [
    { type: 'DOMAIN-WILDCARD', value: '*.steamcontent.com' }
  ],
  ports: [80, 443],
  group: 'DIRECT'
}
```

**转换为**（2 条规则）：
```
AND,((PROCESS-NAME,steam.exe),(DOMAIN-WILDCARD,*.steamcontent.com),(DST-PORT,80)),DIRECT
AND,((PROCESS-NAME,steam.exe),(DOMAIN-WILDCARD,*.steamcontent.com),(DST-PORT,443)),DIRECT
```

## ✅ 验证规则

构建时会自动验证规则：

```bash
$ npm run build:cvr:auto:custom

⚠️ 发现无效的用户规则:
  - 未命名规则: hosts 数组不能为空，至少需要一个域名匹配规则
✅ 加载用户自定义三维规则: 3 条 → 5 条 Mihomo AND 规则
```

## 🎨 UI 集成建议

如果需要图形界面，建议采用类似 Proxifier 的设计：

### 规则编辑器界面

```
┌─────────────────────────────────────────────────┐
│ 规则 #1: Steam 下载直连                          │
├─────────────────────────────────────────────────┤
│ 进程: [steam.exe                    ] [浏览...] │
│                                                 │
│ 域名匹配:                                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ [DOMAIN-WILDCARD ▼] [*.steamcontent.com  ] │ │
│ │ [DOMAIN-WILDCARD ▼] [*.steamserver.net   ] │ │
│ └─────────────────────────────────────────────┘ │
│ [+ 添加] [- 删除]                               │
│                                                 │
│ 端口: [80] [443] [+ 添加]                       │
│                                                 │
│ 代理组: [DIRECT                      ▼]         │
│                                                 │
│ ☑ 启用  ☐ 跳过 DNS 解析                         │
│ 备注: [Steam 下载直连                        ]  │
└─────────────────────────────────────────────────┘
```

### 规则列表

```
┌─────────────────────────────────────────────────┐
│ ☑ 1. qoder.com 直连                  [编辑] [↑] │
│ ☑ 2. Steam 社区代理                  [编辑] [↓] │
│ ☑ 3. Steam 下载直连                  [编辑] [↓] │
│ ☐ 4. 旧规则（已禁用）               [编辑] [↓] │
└─────────────────────────────────────────────────┘
[+ 添加规则] [批量导入] [导出]
```

## 📚 参考文档

- [Mihomo AND 规则官方文档](https://wiki.metacubex.one/en/config/rules/#and--or--not)
- [用户自定义规则详细文档](./USER_CUSTOM_RULES_3D.md)
- [示例配置文件](../custom-rules-config/user-rules.full-example.ts)

## 🔄 向后兼容

保留了旧版简单规则支持：

```typescript
simpleRules: {
  prepend: [...],  // 传统 Clash 风格规则
  append: [...]
}
```

这样可以平滑过渡，用户可以选择使用三维规则或简单规则。

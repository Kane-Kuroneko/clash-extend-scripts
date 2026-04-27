# 用户自定义分流规则使用说明（Proxifier 风格）

## 📋 功能概述

本功能采用类似 **Proxifier GUI** 的三维规则配置模式，通过 **进程(process) × 域名(hosts) × 端口(ports)** 的组合来构建 Mihomo 的 AND 逻辑规则。

### 核心特性

- ✅ **三维规则配置**：进程 × 域名 × 端口的直观配置方式
- ✅ **自动转换**：自动转换为 Mihomo AND 规则
- ✅ **规则验证**：构建时自动验证规则有效性
- ✅ **灵活匹配**：支持所有 Mihomo 域名和进程匹配类型
- ✅ **可选端口**：端口条件可选，不填则匹配所有端口
- ✅ **规则开关**：支持临时禁用规则（`enabled: false`）

## 🚀 快速开始

### 1. 编辑规则文件

打开 `custom-rules-config/user-rules.ts`：

```typescript
import type { UserCustomRulesConfig } from '../src/config/UserCustomRules';

export const userCustomRules: UserCustomRulesConfig = {
  rules3D: [
    {
      process: 'chrome.exe',  // 进程名
      hosts: [                // 域名匹配（至少一个）
        { type: 'DOMAIN-SUFFIX', value: 'google.com' }
      ],
      ports: [80, 443],       // 端口（可选）
      group: '🫧 Proxy A 🫧'  // 代理组
    }
  ]
};
```

### 2. 构建配置

```bash
# 使用自定义规则构建
npm run build:cvr:auto:custom

# 或其他客户端
npm run build:cfw:auto:custom
npm run build:party:auto:custom
```

### 3. 查看效果

构建日志会显示：

```
✅ 加载用户自定义三维规则: 3 条 → 5 条 Mihomo AND 规则
```

## 📖 规则配置详解

### 三维规则结构

```typescript
{
  process: string | ProcessRule,  // 进程匹配
  hosts: HostRule[],              // 域名/IP 匹配（必填，至少一个）
  ports?: number[],               // 目标端口（可选）
  group: string,                  // 代理组名称
  noResolve?: boolean,            // 跳过 DNS 解析（可选）
  enabled?: boolean,              // 规则开关（默认 true）
  description?: string            // 规则备注（可选）
}
```

### 规则逻辑

```
最终匹配 = process AND (host1 OR host2 OR ...) AND (port1 OR port2 OR ...)
```

**展开示例**：

```typescript
{
  process: 'chrome.exe',
  hosts: [
    { type: 'DOMAIN-SUFFIX', value: 'google.com' },
    { type: 'DOMAIN-SUFFIX', value: 'youtube.com' }
  ],
  ports: [80, 443],
  group: '🫧 Proxy A 🫧'
}
```

会展开为 **4 条** Mihomo AND 规则：

```
AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,google.com),(DST-PORT,80)),🫧 Proxy A 🫧
AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,google.com),(DST-PORT,443)),🫧 Proxy A 🫧
AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,youtube.com),(DST-PORT,80)),🫧 Proxy A 🫧
AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,youtube.com),(DST-PORT,443)),🫧 Proxy A 🫧
```

### 进程匹配 (process)

#### 简写形式（字符串）

```typescript
// 匹配特定进程
process: 'chrome.exe'

// 匹配所有进程
process: '*'
```

#### 完整形式（对象）

```typescript
// 进程名通配符
process: {
  type: 'PROCESS-NAME-WILDCARD',
  value: '*chrome*'
}

// 进程名正则
process: {
  type: 'PROCESS-NAME-REGEX',
  value: '.*chrome.*'
}

// 进程路径
process: {
  type: 'PROCESS-PATH',
  value: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
}
```

**支持的进程匹配类型**：

| 类型 | 说明 | 示例 |
|------|------|------|
| `PROCESS-NAME` | 进程名匹配 | `chrome.exe` |
| `PROCESS-NAME-WILDCARD` | 进程名通配符 | `*chrome*` |
| `PROCESS-NAME-REGEX` | 进程名正则 | `.*chrome.*` |
| `PROCESS-PATH` | 进程完整路径 | `C:\\Program Files\\...` |
| `PROCESS-PATH-WILDCARD` | 进程路径通配符 | `*\\chrome.exe` |
| `PROCESS-PATH-REGEX` | 进程路径正则 | `.*Application\\\\chrome.*` |

### 域名/IP 匹配 (hosts)

```typescript
hosts: [
  // 域名后缀
  { type: 'DOMAIN-SUFFIX', value: 'google.com' },
  
  // 完整域名
  { type: 'DOMAIN', value: 'api.google.com' },
  
  // 域名关键词
  { type: 'DOMAIN-KEYWORD', value: 'google' },
  
  // 域名通配符
  { type: 'DOMAIN-WILDCARD', value: '*.google.*' },
  
  // 域名正则
  { type: 'DOMAIN-REGEX', value: '^.*\\.google\\.com$' },
  
  // Geosite
  { type: 'GEOSITE', value: 'google' },
  
  // IPv4 网段
  { type: 'IP-CIDR', value: '192.168.1.0/24' },
  
  // GeoIP
  { type: 'GEOIP', value: 'CN' }
]
```

**支持的域名/IP 匹配类型**：

| 类型 | 说明 | 示例值 |
|------|------|--------|
| `DOMAIN` | 完整域名 | `api.example.com` |
| `DOMAIN-SUFFIX` | 域名后缀 | `example.com` |
| `DOMAIN-KEYWORD` | 域名关键词 | `google` |
| `DOMAIN-WILDCARD` | 域名通配符 | `*.example.*` |
| `DOMAIN-REGEX` | 域名正则 | `^.*\\.example\\.com$` |
| `GEOSITE` | Geosite 规则集 | `google` |
| `IP-CIDR` | IPv4 网段 | `192.168.1.0/24` |
| `IP-CIDR6` | IPv6 网段 | `::1/128` |
| `IP-SUFFIX` | IP 后缀 | `8.8.8.8/24` |
| `IP-ASN` | IP ASN | `13335` |
| `GEOIP` | GeoIP 国家代码 | `CN` |

### 端口 (ports)

```typescript
// 单个端口
ports: [443]

// 多个端口
ports: [80, 443, 8080]

// 不填或 [] 表示匹配所有端口
ports: []  // 或不写此字段
```

### 代理组 (group)

**预设代理组**：

| 代理组名称 | 说明 |
|-----------|------|
| `DIRECT` | 直连 |
| `REJECT` | 拒绝 |
| `🫧 Proxy A 🫧` | 手动代理 A |
| `🍀 Proxy B 🍀` | 手动代理 B |
| `❄️ GFW` | GFW 代理 |
| `🌍 Foreign Media` | 国外媒体 |
| `🦚 Region Media` | 地区媒体 |
| `📲 Telegram` | Telegram |
| `🖥 AI` | AI 服务 |
| `Ⓜ️ Microsoft` | 微软服务 |
| `🍎 Apple` | 苹果服务 |
| `📥 Download` | 下载 |
| `🐟 Final` | 漏网之鱼 |
| `🟢 China Direct` | 中国直连 |

也可以使用自定义代理组（需要在 `groups` 中定义）。

## 💡 实用示例

### 示例 1：qoder.com 直连（所有进程）

```typescript
{
  process: '*',  // 所有进程
  hosts: [
    { type: 'DOMAIN-SUFFIX', value: 'qoder.com' }
  ],
  group: 'DIRECT',
  description: 'qoder.com 直连'
}
```

**转换为**：
```
DOMAIN-SUFFIX,qoder.com,DIRECT
```

### 示例 2：Chrome 访问 Google 走代理

```typescript
{
  process: 'chrome.exe',
  hosts: [
    { type: 'DOMAIN-SUFFIX', value: 'google.com' },
    { type: 'DOMAIN-SUFFIX', value: 'googleapis.com' }
  ],
  group: '🫧 Proxy A 🫧',
  description: 'Chrome 访问 Google 走代理 A'
}
```

**转换为**：
```
AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,google.com)),🫧 Proxy A 🫧
AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,googleapis.com)),🫧 Proxy A 🫧
```

### 示例 3：Steam 下载直连（带端口限制）

```typescript
{
  process: 'steam.exe',
  hosts: [
    { type: 'DOMAIN-WILDCARD', value: '*.steamcontent.com' },
    { type: 'DOMAIN-WILDCARD', value: '*.steamserver.net' }
  ],
  ports: [80, 443],
  group: 'DIRECT',
  description: 'Steam 下载直连'
}
```

**转换为**（4 条规则）：
```
AND,((PROCESS-NAME,steam.exe),(DOMAIN-WILDCARD,*.steamcontent.com),(DST-PORT,80)),DIRECT
AND,((PROCESS-NAME,steam.exe),(DOMAIN-WILDCARD,*.steamcontent.com),(DST-PORT,443)),DIRECT
AND,((PROCESS-NAME,steam.exe),(DOMAIN-WILDCARD,*.steamserver.net),(DST-PORT,80)),DIRECT
AND,((PROCESS-NAME,steam.exe),(DOMAIN-WILDCARD,*.steamserver.net),(DST-PORT,443)),DIRECT
```

### 示例 4：内网 IP 直连（跳过 DNS）

```typescript
{
  process: 'myapp.exe',
  hosts: [
    { type: 'IP-CIDR', value: '192.168.1.0/24' },
    { type: 'IP-CIDR', value: '10.0.0.0/8' }
  ],
  group: 'DIRECT',
  noResolve: true,  // 跳过 DNS 解析
  description: '内网 IP 直连'
}
```

**转换为**：
```
AND,((PROCESS-NAME,myapp.exe),(IP-CIDR,192.168.1.0/24)),DIRECT,no-resolve
AND,((PROCESS-NAME,myapp.exe),(IP-CIDR,10.0.0.0/8)),DIRECT,no-resolve
```

### 示例 5：临时禁用规则

```typescript
{
  process: 'old-app.exe',
  hosts: [
    { type: 'DOMAIN-SUFFIX', value: 'example.com' }
  ],
  group: '🫧 Proxy A 🫧',
  enabled: false,  // 此规则不会生效
  description: '已禁用的旧规则'
}
```

## 🔧 高级用法

### 简单规则（传统 Clash 风格）

如果不需要 AND 逻辑，可以使用简单规则：

```typescript
simpleRules: {
  prepend: [
    {
      type: 'DOMAIN-SUFFIX',
      value: 'special.example.com',
      group: 'DIRECT'
    }
  ],
  append: [
    {
      type: 'PROCESS-NAME',
      value: 'wechat.exe',
      group: '🟢 China Direct'
    }
  ]
}
```

### 自定义代理组

```typescript
groups: [
  {
    name: '🎯 My Custom Group',
    type: 'select',
    proxies: ['DIRECT', 'REJECT', '🫧 Proxy A 🫧', '🍀 Proxy B 🍀']
  }
]
```

## ⚠️ 注意事项

1. **hosts 必填**：每个三维规则必须至少有一个 host 匹配规则
2. **进程匹配**：Windows 需要 `.exe` 后缀，macOS/Linux 不需要
3. **端口范围**：端口必须是 1-65535 之间的数字
4. **规则数量**：多个 hosts × 多个 ports 会展开为笛卡尔积，注意规则数量
5. **no-resolve**：仅对 IP 相关规则有效（IP-CIDR、GEOIP 等）

## 🐛 故障排查

### 规则未生效

1. 检查 `enabled` 是否为 `false`
2. 查看构建日志中的验证警告
3. 确认代理组名称正确

### 构建失败

```bash
# 验证 TypeScript 语法
cd custom-rules-config
npm run validate
```

### 规则数量过多

检查是否不必要地设置了多个 ports，考虑简化规则：

```typescript
// ❌ 会生成 10 条规则
hosts: [{ type: 'DOMAIN-SUFFIX', value: 'example.com' }],
ports: [80, 443, 8080, 8443, 9090, 9443, 10000, 10443, 11000, 11443]

// ✅ 只保留常用端口
hosts: [{ type: 'DOMAIN-SUFFIX', value: 'example.com' }],
ports: [80, 443]
```

## 📚 参考资源

- [Mihomo AND 规则文档](https://wiki.metacubex.one/en/config/rules/#and--or--not)
- [示例规则文件](../custom-rules-config/user-rules.ts)
- [类型定义](../src/config/UserCustomRules.ts)
- [转换器实现](../src/config/UserCustomRulesConverter.ts)

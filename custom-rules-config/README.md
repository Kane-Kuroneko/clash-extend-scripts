# 自定义规则配置目录（Proxifier 风格）

这个目录用于存放你的 Clash Parser 用户自定义规则配置。

## 🚀 快速开始

### 1. 编辑规则文件

打开 `user-rules.ts` 文件，配置你的三维规则：

```typescript
rules3D: [
  {
    process: 'chrome.exe',  // 进程名
    hosts: [                // 域名匹配
      { type: 'DOMAIN-SUFFIX', value: 'google.com' }
    ],
    ports: [80, 443],       // 端口（可选）
    group: '🫧 Proxy A 🫧'  // 代理组
  }
]
```

### 2. 构建配置

```bash
# 自动路由模式（使用自定义规则）
npm run build:auto

# 全局代理模式（使用自定义规则）
npm run build:global
```

### 3. 验证配置

```bash
# 验证 TypeScript 语法
npm run validate

# 编辑规则文件（使用 VS Code）
npm run edit
```

## 📁 目录结构

```
custom-rules-config/
├── package.json          # NPM 脚本配置
├── user-rules.ts         # 你的自定义规则（主要编辑此文件）
└── README.md            # 本文件
```

## 📖 规则配置说明

### prepend vs append

- **prepend**: 插入到规则列表最前面（最高优先级）
  - 适合：必须优先匹配的规则（如公司内网、特定服务）
  
- **append**: 插入到 MATCH 规则之前（兜底规则之上）
  - 适合：补充规则（如特殊域名、进程匹配）

### 可用代理组

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

### 规则类型

| 类型 | 说明 | 示例值 |
|------|------|--------|
| `DOMAIN-SUFFIX` | 域名后缀 | `example.com` |
| `DOMAIN` | 完整域名 | `api.example.com` |
| `DOMAIN-KEYWORD` | 域名关键词 | `github` |
| `IP-CIDR` | IPv4 网段 | `192.168.1.0/24` |
| `IP-CIDR6` | IPv6 网段 | `::1/128` |
| `GEOIP` | 地理位置 | `CN` |
| `PROCESS-NAME` | 进程名 | `wechat.exe` |
| `DST-PORT` | 目标端口 | `80` |
| `SRC-PORT` | 源端口 | `12345` |

## 💡 使用技巧

### 多配置文件管理

你可以创建多个规则文件，按需使用：

```bash
# 创建工作规则
cp user-rules.ts work-rules.ts

# 创建个人规则
cp user-rules.ts personal-rules.ts

# 使用特定配置构建
cd ..
npm run build:cvr:auto -- --user-rules ./custom-rules-config/work-rules.ts
```

### 规则注释

使用注释来临时禁用规则：

```typescript
prepend: [
  // 临时禁用
  // {
  //   type: 'DOMAIN-SUFFIX',
  //   value: 'example.com',
  //   group: 'DIRECT'
  // },
  
  // 启用中
  {
    type: 'DOMAIN-SUFFIX',
    value: 'qoder.com',
    group: 'DIRECT'
  }
]
```

## ⚠️ 注意事项

1. **默认不生效**: 规则文件存在但为空数组时，不会添加任何规则
2. **语法检查**: 构建前运行 `npm run validate` 检查语法
3. **代理组名称**: 确保使用的代理组名称已定义
4. **规则优先级**: prepend 规则优先级最高，会覆盖系统规则

## 🐛 故障排查

### 构建失败

```bash
# 检查语法
npm run validate

# 查看详细错误
cd ..
npm run build:cvr:auto -- --user-rules ./custom-rules-config/user-rules.ts
```

### 规则未生效

1. 确认规则未注释
2. 检查代理组名称是否正确
3. 查看构建日志中的加载信息

## 📚 更多帮助

查看完整文档：`../docs/USER_CUSTOM_RULES.md`

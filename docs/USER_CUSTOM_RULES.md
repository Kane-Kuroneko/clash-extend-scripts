# 用户自定义分流规则使用说明

## 📋 功能概述

本功能允许用户在构建 Clash 配置时添加自定义的分流规则，支持：
- **prepend 规则**：插入到规则列表最前面（最高优先级）
- **append 规则**：插入到 MATCH 兜底规则之前
- **自定义代理组**：添加用户自己的代理组

## 🚀 快速开始

### 1. 创建用户规则文件

复制示例文件到你的自定义配置目录：

```bash
# 示例：在用户主目录创建配置文件夹
mkdir -p ~/.clash-parser

# 复制示例文件
cp src/config/user-rules.example.ts ~/.clash-parser/user-rules.ts
```

### 2. 编辑规则文件

打开 `~/.clash-parser/user-rules.ts`，根据需要修改规则：

```typescript
import type { UserCustomRulesConfig } from '../../config/UserCustomRules';

export const userCustomRules: UserCustomRulesConfig = {
  // 前置规则（最高优先级）
  prepend: [
    {
      type: 'DOMAIN-SUFFIX',
      value: 'qoder.com',
      group: 'DIRECT'
    }
  ],
  
  // 后置规则（MATCH 之前）
  append: [
    // 你的规则...
  ],
  
  // 自定义代理组（可选）
  groups: [
    // 你的代理组...
  ]
};
```

### 3. 构建时加载规则

在构建命令中添加 `--user-rules` 参数：

```bash
# 基础用法
npm run build:cvr:auto -- --user-rules ~/.clash-parser/user-rules.ts

# 其他客户端
npm run build:cfw:auto -- --user-rules ~/.clash-parser/user-rules.ts
npm run build:party:auto -- --user-rules ~/.clash-parser/user-rules.ts
```

## 📖 规则配置详解

### 规则类型 (type)

支持以下 Clash 规则类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| `DOMAIN-SUFFIX` | 域名后缀匹配 | `qoder.com` |
| `DOMAIN` | 完整域名匹配 | `api.qoder.com` |
| `DOMAIN-KEYWORD` | 域名关键词匹配 | `github` |
| `IP-CIDR` | IPv4 网段匹配 | `192.168.1.0/24` |
| `IP-CIDR6` | IPv6 网段匹配 | `::1/128` |
| `GEOIP` | 地理位置 IP 匹配 | `CN` |
| `PROCESS-NAME` | 进程名匹配 | `wechat.exe` |
| `DST-PORT` | 目标端口匹配 | `80` |
| `SRC-PORT` | 源端口匹配 | `12345` |

### 代理组名称 (group)

可以使用以下预设代理组：

- `DIRECT` - 直连
- `REJECT` - 拒绝
- `🫧 Proxy A 🫧` - 手动代理 A
- `🍀 Proxy B 🍀` - 手动代理 B
- `❄️ GFW` - GFW 代理
- `🌍 Foreign Media` - 国外媒体
- `🦚 Region Media` - 地区媒体
- `📲 Telegram` - Telegram
- `🖥 AI` - AI 服务
- `Ⓜ️ Microsoft` - 微软服务
- `🍎 Apple` - 苹果服务
- `📥 Download` - 下载
- `🐟 Final` - 漏网之鱼
- `🟢 China Direct` - 中国直连

也可以使用自定义代理组名称（需要先定义在 `groups` 中）。

### 完整示例

```typescript
export const userCustomRules: UserCustomRulesConfig = {
  prepend: [
    // 1. 公司内网直连（最高优先级）
    {
      type: 'DOMAIN-SUFFIX',
      value: 'company.com',
      group: 'DIRECT'
    },
    {
      type: 'IP-CIDR',
      value: '10.0.0.0/8',
      group: 'DIRECT',
      resolve: 'no-resolve'
    },
    
    // 2. 特定服务走指定代理
    {
      type: 'DOMAIN-KEYWORD',
      value: 'openai',
      group: '🫧 Proxy A 🫧'
    }
  ],
  
  append: [
    // 3. 特殊域名处理（在系统规则之后）
    {
      type: 'DOMAIN',
      value: 'special.example.com',
      group: '🍀 Proxy B 🍀'
    },
    
    // 4. 进程匹配
    {
      type: 'PROCESS-NAME',
      value: 'steam.exe',
      group: '📥 Download'
    }
  ],
  
  groups: [
    // 5. 自定义代理组
    {
      name: '🎯 Custom Group',
      type: 'select',
      proxies: [
        'DIRECT',
        'REJECT',
        '🫧 Proxy A 🫧',
        '🍀 Proxy B 🍀'
      ]
    }
  ]
};
```

## 🔧 高级用法

### 多个规则文件管理

你可以创建多个规则文件，按需启用：

```bash
# 工作配置
~/.clash-parser/work-rules.ts

# 个人配置
~/.clash-parser/personal-rules.ts

# 游戏配置
~/.clash-parser/game-rules.ts
```

构建时选择需要的配置：

```bash
npm run build:cvr:auto -- --user-rules ~/.clash-parser/work-rules.ts
```

### 规则优先级

规则匹配顺序：

```
用户 prepend 规则（最高）
  ↓
系统规则（GFW、Proxy、Telegram 等）
  ↓
用户 append 规则
  ↓
MATCH 兜底规则（最低）
```

### 禁用用户规则

不添加 `--user-rules` 参数即可：

```bash
# 不使用任何用户自定义规则
npm run build:cvr:auto
```

## 🎨 UI 集成建议

如果你需要图形界面来管理用户规则，建议：

1. **规则文件选择器**
   - 显示可用规则文件列表
   - 支持勾选启用/禁用
   - 支持新建规则文件

2. **规则编辑器**
   - 提供表单式编辑界面
   - 下拉选择规则类型和代理组
   - 实时验证规则格式

3. **预览功能**
   - 显示规则插入位置
   - 预览最终生成的配置
   - 规则冲突检测

## ⚠️ 注意事项

1. **规则格式验证**：确保规则格式正确，否则可能导致构建失败
2. **代理组名称**：使用的代理组名称必须存在（预设或自定义）
3. **性能影响**：过多的自定义规则可能影响匹配性能
4. **规则冲突**：避免与系统规则重复，prepend 规则优先级最高

## 🐛 故障排查

### 构建失败

检查规则文件格式是否正确：

```bash
# 验证 TypeScript 语法
npx tsc --noEmit ~/.clash-parser/user-rules.ts
```

### 规则未生效

1. 确认 `--user-rules` 参数路径正确
2. 检查导出的变量名是否为 `userCustomRules`
3. 查看构建日志是否有加载成功的提示

### 日志输出

成功加载时会显示：

```
✅ 用户自定义规则加载成功: prepend=2, append=1, groups=1
✅ 加载用户自定义前置规则: 2 条
✅ 加载用户自定义后置规则: 1 条
✅ 加载用户自定义代理组: 1 个
```

## 📚 参考资源

- [Clash 规则文档](https://github.com/Dreamacro/clash/wiki/premium-core-features)
- [示例规则文件](../src/config/user-rules.example.ts)
- [类型定义](../src/config/UserCustomRules.ts)

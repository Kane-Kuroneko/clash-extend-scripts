# 📁 目录结构说明

## 总体架构

```
/parser
├── custom-rules-config/           # 👤 用户预设配置目录（用户编辑）
│   ├── README.md                  # 用户使用指南
│   ├── user-rules.ts              # 用户规则配置文件
│   └── user-rules.full-example.ts # 完整示例配置
│
├── src/
│   ├── types/                     # 📦 共享类型定义
│   │   ├── user-rules.d.ts        # ← Proxifier 风格三维规则类型
│   │   ├── build.d.ts             # 构建相关类型
│   │   ├── clash.d.ts             # Clash 相关类型
│   │   └── client.d.ts            # 客户端相关类型
│   │
│   ├── config/                    # ⚙️ 配置转换引擎和服务
│   │   ├── UserCustomRules.ts     # 类型重新导出（向后兼容）
│   │   ├── UserCustomRulesConverter.ts    # 三维规则 → Mihomo AND 转换器
│   │   ├── UserCustomRulesConverter.test.ts # 转换器测试
│   │   ├── ConfigFactory.ts       # 配置工厂
│   │   ├── GlobalRestrictedGroup.ts
│   │   └── RoutingConfig.ts
│   │
│   ├── adapters/                  # 客户端适配器
│   ├── clients/                   # 客户端入口
│   └── ...
│
└── ...
```

## 各目录职责

### 1. `custom-rules-config/` - 用户预设配置

**用途**: 存放用户自定义的分流规则配置文件

**特点**:
- 👤 用户直接编辑的目录
- 📝 使用 TypeScript 格式，有完整的类型提示
- 🎯 Proxifier 风格的三维规则配置
- 🔧 构建时通过 `--user-rules` 参数加载

**关键文件**:
- `user-rules.ts` - 用户实际使用的规则配置
- `user-rules.full-example.ts` - 完整的示例配置（参考用）
- `README.md` - 用户使用指南

**使用方式**:
```bash
npm run build:cvr:auto:custom -- --user-rules=./custom-rules-config/user-rules.ts
```

---

### 2. `src/types/` - 共享类型定义

**用途**: 存放全局共享的 TypeScript 类型定义

**特点**:
- 📦 被多个模块共享使用
- 🔗 `custom-rules-config/` 和 `src/config/` 都从这里导入类型
- 🎯 保持类型一致性

**关键文件**:
- `user-rules.d.ts` - Proxifier 风格三维规则类型（核心）
  - `User3DRule` - 三维规则接口
  - `HostRule` - 域名匹配规则
  - `ProcessRule` - 进程匹配规则
  - `UserCustomRulesConfig` - 完整配置接口

**导入示例**:
```typescript
// 用户配置文件
import type { UserCustomRulesConfig } from '../src/types/user-rules';

// 转换器文件
import type { User3DRule, HostRule } from '../types/user-rules';
```

---

### 3. `src/config/` - 配置转换引擎

**用途**: 配置解析、转换、验证等服务

**特点**:
- ⚙️ 业务逻辑层
- 🔄 负责将用户配置转换为 Mihomo 格式
- ✅ 包含验证逻辑

**关键文件**:
- `UserCustomRulesConverter.ts` - 核心转换器
  - `convert3DRuleToMihomoANDRules()` - 单条规则转换
  - `convert3DRulesToMihomoRules()` - 批量转换
  - `validate3DRule()` - 规则验证
  
- `UserCustomRules.ts` - 类型重新导出（向后兼容）
  - 从 `src/types/user-rules` 重新导出类型
  - 保持旧代码的导入路径可用

---

## 数据流

```
用户编辑
  ↓
custom-rules-config/user-rules.ts
  ↓ (导入类型)
src/types/user-rules.d.ts
  ↓ (构建时加载)
webpack.base.ts (DefinePlugin 注入)
  ↓ (转换)
src/config/UserCustomRulesConverter.ts
  ↓ (生成)
Mihomo AND 规则
  ↓ (集成)
src/AutoRoutingConfig.ts
  ↓ (构建)
dist/cvr/cvr-auto-routing.js
```

---

## 规则转换示例

**用户配置** (`custom-rules-config/user-rules.ts`):
```typescript
{
  process: 'chrome.exe',
  hosts: [
    { type: 'DOMAIN-SUFFIX', value: 'google.com' }
  ],
  ports: [80, 443],
  group: '🫧 Proxy A 🫧'
}
```

**转换后** (Mihomo AND 规则):
```
AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,google.com),(DST-PORT,80)),🫧 Proxy A 🫧
AND,((PROCESS-NAME,chrome.exe),(DOMAIN-SUFFIX,google.com),(DST-PORT,443)),🫧 Proxy A 🫧
```

---

## 设计原则

1. **类型共享**: 所有类型定义在 `src/types/`，避免重复
2. **关注点分离**: 
   - `custom-rules-config/` - 用户配置（数据）
   - `src/config/` - 转换逻辑（行为）
   - `src/types/` - 类型定义（契约）
3. **向后兼容**: `src/config/UserCustomRules.ts` 保留为重新导出入口
4. **用户友好**: 用户配置文件有完整的 TypeScript 类型提示

---

## 常见问题

### Q: 为什么要分三个目录？

**A**: 
- `custom-rules-config/` 是用户的工作区，不应该被代码污染
- `src/config/` 是转换引擎，不应该包含用户配置
- `src/types/` 是共享契约，让两边都能使用相同的类型

### Q: 我能直接在 `src/config/` 下改配置吗？

**A**: 不建议。`src/config/` 是源码目录，应该只放转换逻辑。用户配置请放在 `custom-rules-config/`。

### Q: 类型定义为什么要放在 `src/types/` 而不是 `src/config/`？

**A**: 因为类型需要被两个地方共享：
1. 用户配置文件 (`custom-rules-config/user-rules.ts`)
2. 转换引擎 (`src/config/UserCustomRulesConverter.ts`)

放在 `src/types/` 可以避免循环依赖，也符合 TypeScript 项目的最佳实践。

# Windows 代理分流工具 - 竞品分析与产品构想

> 📅 2025-04-22 | 来源: 用户需求对话

---

## 🎯 痛点背景

用户原有翻墙工作流:
- **Proxifier**: 前置分流 (Process × Host × Port 三维组合)
- **Clash-Verge-Rev**: 配置文件自动分流 + 代理流量
- **Clash-Party**: 接收 Proxifier 判定为 global-proxy 的流量

更换 VPN 供应商后（新供应商使用 **Hy2 协议**），Proxifier 不支持 UDP 流量，工作流失效。被迫使用 CVR TUN 模式后出现以下痛点:

1. ❌ **无前置分流流程** — 无法方便 & 透明地修改代理规则
2. ❌ **流量控制不精确** — 自动分流和前置分流混为一谈，掌控度下降
3. ❌ **无法实现白名单机制** — 不像 Proxifier 那样可以精细控制
4. ❌ **UDP 支持缺失** — 新协议 Hy2 需要 UDP，Proxifier 不支持

---

## 📊 竞品全景分析

### 竞品能力对比矩阵

| 工具 | TUN虚拟网卡 | Process路由 | Host路由 | Port路由 | 多服务器路由 | UDP支持 | UX质量 | 平台 |
|---|---|---|---|---|---|---|---|---|
| **Proxifier** | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ⭐⭐⭐⭐⭐ | Win/Mac |
| **ProxyBridge** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ⭐⭐⭐ | Win/Mac/Linux |
| **Netch** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ⭐⭐⭐ | Win |
| **sing-box** | ✅ | ✅⚠️ | ✅ | ✅ | ✅ | ✅ | ⭐⭐ | 全平台 |
| **mihomo (Clash Meta)** | ✅ | ✅⚠️ | ✅ | ✅ | ✅ | ✅ | ⭐⭐⭐ | 全平台 |
| **Surge** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⭐⭐⭐⭐⭐ | **Mac Only** |
| **目标工具** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⭐⭐⭐⭐⭐ | Windows |

> ⚠️ 表示有已知缺陷或限制

---

### 各竞品详细分析

#### 1. ProxyBridge（最新兴竞品）

| 项目 | 信息 |
|---|---|
| 技术栈 | WinDivert（内核级拦截）/ Avalonia UI |
| 开发状态 | 活跃（2025年新项目） |
| GitHub | https://github.com/InterceptSuite/ProxyBridge |

**✅ 支持**:
- Process-based 流量控制
- UDP + TCP 完整支持
- 内核级 WinDivert 拦截
- 高级规则（process + IP + port + protocol + hostname）
- 规则导入/导出

**❌ 不支持**:
- **无虚拟网卡/TUN 模式**
- **只能指向单一代理服务器**，无多出口路由
- AND 组合逻辑有限

**结论**: 本质上是 Proxifier 的 UDP 补丁，不是完整的分流路由工具。

---

#### 2. Netch（Windows 老牌工具）

| 项目 | 信息 |
|---|---|
| 技术栈 | Netfilter Driver + WinTUN |
| 开发状态 | 基本停滞 |
| GitHub | https://github.com/netchx/netch |

**✅ 支持**:
- Process 模式（进程级拦截）
- TUN 模式（虚拟网卡）
- UDP 支持

**❌ 不支持**:
- **每次只能连接一个服务器**，无策略路由
- Host × Port 路由维度极其有限
- 主要面向游戏加速，非通用代理分流

**结论**: 功能受限，开发停滞，不适合作为参考。

---

#### 3. sing-box（最接近全能的内核）

| 项目 | 信息 |
|---|---|
| 技术栈 | 纯 Go |
| 开发状态 | 活跃 |
| GitHub | https://github.com/SagerNet/sing-box |

**✅ 支持**:
- TUN 虚拟网卡
- 多出口（多服务器）
- Process 路由（部分有效）
- UDP + TCP

**⚠️ 已知缺陷**:
- **Windows 上 process_name 无法匹配 UDP 流量**（GitHub Issue #2801）
- 无官方 GUI，配置文件复杂
- UX 远不如 Proxifier

**结论**: 内核能力强，但 Windows 上 process+UDP 组合有明确 bug，且缺乏 GUI 用户体验。

---

#### 4. mihomo (Clash Meta)

| 项目 | 信息 |
|---|---|
| 技术栈 | Go |
| 开发状态 | 活跃 |
| GitHub | https://github.com/MetaCubeX/mihomo |

**✅ 支持**:
- TUN 模式
- PROCESS-NAME 规则
- 多 Proxy Group（多服务器路由）
- UDP + TCP

**⚠️ 局限性**:
- Windows TUN + Process 路由有已知限制
- TUN 模式下不支持 Port 级别的路由
- 规则系统主要针对域名/IP，非 Process×Host×Port 组合

**结论**: 优秀的代理内核，但分流维度不符合用户需求。

---

#### 5. Surge（唯一完整实现）

| 项目 | 信息 |
|---|---|
| 技术栈 | 闭源 |
| 平台 | **Mac Only** |
| 价格 | 付费（Mac App Store） |

**✅ 支持**:
- TUN Enhanced Mode（虚拟网卡）
- PROCESS + HOST + PORT 多维路由
- 多 Policy Group（多服务器路由）
- UDP + TCP
- **极致 UX 体验**

**❌ 不支持**:
- **无 Windows 版本，从未发布**

**结论**: 唯一完全覆盖需求的工具，证明了这个产品模型的市场价值。

---

## 🧭 市场缺口总结

```
                 TUN虚拟网卡
                     ↑
     Surge ────────────────── sing-box
   (Mac only)               (无GUI/UX差)
                     │
     Netch ──────────┼───────── ProxyBridge
   (单服务器)                  (无TUN/单服务器)
                     ↓
  Process×Host×Port×多服务器路由 + UDP + 好UX
                    ← 目标区域（空白）
```

**核心发现**: Windows 上至今没有任何工具能同时满足以下 5 个需求:
1. ✅ Process × Host × Port 三维分流
2. ✅ 虚拟网卡 TUN 模式接管系统流量
3. ✅ 支持配置多个 Server
4. ✅ 按分流结果将流量传递给不同 Server（支持 UDP/TCP）
5. ✅ 优于或等于 Proxifier 的 UX 体验

---

## 🚀 产品构想

### 目标定位

> **Windows 平台上的 Surge 等价物** — 提供 TUN 模式 + Proxifier 级别的进程分流 UX + 多服务器策略路由

### 核心价值主张

- 🎯 **精确流量控制** — 恢复 Process×Host×Port 三维前置分流能力
- 🌐 **完整协议支持** — 解决 Hy2/VLESS 等新协议的 UDP 需求
- 🔀 **智能分流** — 将流量按规则精确分发到不同代理服务器
- 📝 **白名单机制** — 提供类似 Proxifier 的精细控制能力
- ✨ **优秀 UX** — 达到或超越 Proxifier 的用户体验

### 主要技术挑战

1. **Windows 上内核级进程追踪 UDP 流量** — WinDivert 需要额外工作
2. **TUN 入站 + WinDivert 进程匹配的协同** — 需要避免循环拦截
3. **多服务器路由引擎设计** — 支持任意协议出口（包括 Hy2）

### 推荐技术栈

| 组件 | 推荐方案 |
|---|---|
| 内核拦截 | WinDivert (用户态) 或 NDIS 驱动 (内核态) |
| TUN 虚拟网卡 | WinTUN (WireGuard 同款) |
| 路由引擎 | 自研 或 sing-box 内核集成 |
| GUI 框架 | Tauri (Rust + Web) 或 WPF/.NET 8 |
| 代理协议 | 集成 Clash Meta / sing-box 内核处理出站 |

---

## 📝 相关 Issue

- sing-box process_name 无法匹配 UDP: https://github.com/SagerNet/sing-box/issues/2801
- ProxyBridge GitHub: https://github.com/InterceptSuite/ProxyBridge
- Netch GitHub: https://github.com/netchx/netch
- mihomo GitHub: https://github.com/MetaCubeX/mihomo
- sing-box GitHub: https://github.com/SagerNet/sing-box

---

*本文档基于 2025-04-22 用户对话整理*

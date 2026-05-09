# VPN Server 快速启动指南

## 首次使用

### 1. 安装依赖

```bash
# 在主项目目录
cd Z:\parser
npm install

# 在 NCR-AutoClash-Server 目录
cd VPN-Servers/NCR-AutoClash-Server
npm install
```

### 2. 编译 CVR Auto-Routing 脚本

```bash
cd Z:\parser
npm run build:cvr:auto
```

### 3. 启动服务

**Windows (PowerShell):**
```powershell
cd Z:\parser\VPN-Servers\NCR-AutoClash-Server
npm start
```

**Linux/Mac/Git Bash:**
```bash
cd Z:/parser/VPN-Servers/NCR-AutoClash-Server
npm start
```

## 在 Clash 中使用

1. 打开 Clash Verge Rev
2. 添加订阅
3. 输入: `http://<服务器IP>:3456?url=<原始订阅地址>`（将 `<服务器IP>` 替换为实际 IP）
4. 保存并更新

## 示例

```bash
# 启动服务（默认端口 3456）
npm start

# 指定端口 8000
npx tsx ./server.ts 8000
```

**Clash 订阅地址示例：**
```
http://192.168.0.10:3456?url=https://example.com/sub?token=abc123
```

> **提示**：将 `192.168.0.10` 替换为运行该服务的实际服务器 IP 地址。

## 验证服务

浏览器访问: `http://localhost:3456/?url=<你的订阅地址>`

应该看到 YAML 格式的 Clash 配置内容。

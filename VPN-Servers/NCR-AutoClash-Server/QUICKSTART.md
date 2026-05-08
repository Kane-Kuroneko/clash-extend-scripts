# VPN Server 快速启动指南

## 首次使用

### 1. 安装依赖

```bash
# 在主项目目录
cd Z:\parser
npm install

# 在 vpn-server 目录
cd vpn-server
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
cd Z:\parser\vpn-server
npx tsx ./server.ts "你的订阅链接" 6000
```

**Linux/Mac/Git Bash:**
```bash
cd Z:\parser/vpn-server
chmod +x start.sh
./start.sh "你的订阅链接" 6000
```

## 在 Clash 中使用

1. 打开 Clash Verge Rev
2. 添加订阅
3. 输入: `http://localhost:6000/`
4. 保存并更新

## 示例

```bash
# 使用默认端口 6000
npx tsx ./server.ts "https://example.com/sub?token=abc123"

# 指定端口 8000
npx tsx ./server.ts "https://example.com/sub?token=abc123" 8000
```

## 验证服务

浏览器访问: `http://localhost:6000/`

应该看到 Base64 编码的配置内容。

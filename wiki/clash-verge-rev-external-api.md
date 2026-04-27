# Clash Verge Rev 外部 API 控制指南

## 快速开始（零代码）

### 第一步：在 GUI 中开启外部控制器

1. 打开 Clash Verge Rev
2. 进入 **设置** → **Clash 设置**
3. 找到 **External Controller（外部控制器）** 开关
4. **打开开关**（无需修改任何代码或配置文件）

✅ 完成！默认监听地址：`127.0.0.1:9097`

---

## 常用 API 速查

### 1. 切换节点（最常用）

```bash
curl -X PUT "http://127.0.0.1:9097/proxies/代理组名" \
  -H "Content-Type: application/json" \
  -d '{"name":"目标节点名"}'
```

**示例：**
```bash
curl -X PUT "http://127.0.0.1:9097/proxies/Proxy" \
  -H "Content-Type: application/json" \
  -d '{"name":"日本节点-01"}'
```

### 2. 获取所有代理组和节点

```bash
curl http://127.0.0.1:9097/proxies
```

### 3. 切换运行模式

```bash
# 规则模式（默认）
curl -X PUT "http://127.0.0.1:9097/configs" \
  -H "Content-Type: application/json" \
  -d '{"mode":"rule"}'

# 全局模式
curl -X PUT "http://127.0.0.1:9097/configs" \
  -H "Content-Type: application/json" \
  -d '{"mode":"global"}'

# 直连模式
curl -X PUT "http://127.0.0.1:9097/configs" \
  -H "Content-Type: application/json" \
  -d '{"mode":"direct"}'
```

### 4. 关闭连接

```bash
# 关闭所有连接（切换节点后推荐执行）
curl -X DELETE "http://127.0.0.1:9097/connections"

# 关闭指定连接
curl -X DELETE "http://127.0.0.1:9097/connections/{连接ID}"
```

### 5. 获取当前配置

```bash
curl http://127.0.0.1:9097/configs
```

### 6. 查看活动连接

```bash
curl http://127.0.0.1:9097/connections
```

---

## 实战代码示例

### Python 脚本

```python
import requests
import json

BASE_URL = "http://127.0.0.1:9097"

def get_proxies():
    """获取所有代理组"""
    response = requests.get(f"{BASE_URL}/proxies")
    return response.json()

def switch_proxy(group_name, proxy_name):
    """切换代理组节点"""
    response = requests.put(
        f"{BASE_URL}/proxies/{group_name}",
        headers={"Content-Type": "application/json"},
        data=json.dumps({"name": proxy_name})
    )
    return response.status_code == 204

def change_mode(mode):
    """修改运行模式"""
    response = requests.put(
        f"{BASE_URL}/configs",
        headers={"Content-Type": "application/json"},
        data=json.dumps({"mode": mode})
    )
    return response.status_code == 204

# 使用示例
if __name__ == "__main__":
    # 获取代理列表
    proxies = get_proxies()
    print("代理组:", list(proxies['proxies'].keys()))
    
    # 切换到指定节点
    switch_proxy("Proxy", "日本节点-01")
    
    # 关闭旧连接
    requests.delete(f"{BASE_URL}/connections")
    
    # 切换到全局模式
    change_mode("global")
```

### Node.js 脚本

```javascript
const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:9097';

async function getProxies() {
  const response = await axios.get(`${BASE_URL}/proxies`);
  return response.data;
}

async function switchProxy(groupName, proxyName) {
  await axios.put(`${BASE_URL}/proxies/${groupName}`, {
    name: proxyName
  });
}

async function changeMode(mode) {
  await axios.put(`${BASE_URL}/configs`, {
    mode: mode
  });
}

// 使用示例
(async () => {
  // 获取代理列表
  const proxies = await getProxies();
  console.log('代理组:', Object.keys(proxies.proxies));
  
  // 切换到指定节点
  await switchProxy('Proxy', '日本节点-01');
  
  // 关闭旧连接
  await axios.delete(`${BASE_URL}/connections`);
  
  // 切换到规则模式
  await changeMode('rule');
})();
```

---

## 高级用法：WebSocket 实时监控

### 实时流量监控

```javascript
const ws = new WebSocket('ws://127.0.0.1:9097/traffic');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('上传:', data.up, 'bytes/s');
  console.log('下载:', data.down, 'bytes/s');
};
```

### 实时日志订阅

```javascript
const ws = new WebSocket('ws://127.0.0.1:9097/logs');

ws.onmessage = (event) => {
  const log = JSON.parse(event.data);
  console.log(`[${log.type}] ${log.payload}`);
};
```

---

## 常见问题

### Q: 如何修改监听端口？
A: 在 Clash Verge Rev 设置中直接修改 External Controller 端口，无需编辑配置文件。

### Q: 能否从其他电脑访问？
A: 默认只监听 `127.0.0.1`（仅本机）。如需远程访问，需在设置中将地址改为 `0.0.0.0`，但建议配置认证。

### Q: 切换节点后需要关闭现有连接吗？
A: 建议执行 `DELETE /connections` 关闭旧连接，让新流量走新节点。

### Q: 返回状态码说明
- `204` - 成功
- `400` - 请求参数错误
- `404` - 代理组或节点不存在
- `500` - 服务器内部错误

---

## 完整 API 端点列表

| 端点 | 方法 | 说明 |
|------|------|------|
| `/proxies` | GET | 获取所有代理组和节点 |
| `/proxies/{groupName}` | GET | 获取指定代理组详情 |
| `/proxies/{groupName}` | PUT | 切换代理组的节点 |
| `/configs` | GET | 获取当前配置 |
| `/configs` | PUT | 修改配置（mode、port等） |
| `/connections` | GET | 获取活动连接列表 |
| `/connections` | DELETE | 关闭所有连接 |
| `/connections/{id}` | DELETE | 关闭指定连接 |
| `/traffic` | WS | 实时流量监控 |
| `/logs` | WS | 实时日志订阅 |

---

## 总结

| 项目 | 说明 |
|------|------|
| **开启方式** | GUI 设置中打开 External Controller 开关 |
| **默认地址** | `127.0.0.1:9097` |
| **通信协议** | HTTP REST API + WebSocket |
| **需要改代码** | ❌ 不需要 |
| **需要编译** | ❌ 不需要 |

**核心要点：在 GUI 中打开开关 → 使用 HTTP API 控制 → 零代码改动**

---

*文档创建时间: 2026-04-26*
*基于 Clash Verge Rev 项目分析*

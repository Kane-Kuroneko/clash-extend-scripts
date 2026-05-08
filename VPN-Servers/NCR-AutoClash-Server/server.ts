import http from 'http';
import { URL } from 'url';
import { YAML } from './yaml-wrapper.js';

// 从命令行参数获取配置
const args = process.argv.slice(2);
const origVpnUrl = args[0];
const port = parseInt(args[1] || '6000', 10);
const host = args[2] || '192.168.0.10'; // 默认监听局域网 IP，避免 Clash TUN 模式冲突

if (!origVpnUrl) {
	console.error('错误: 必须提供原始 VPN 订阅链接');
	console.error('用法: tsx ./server.ts <orig-vpn-url> [port]');
	console.error('示例: tsx ./server.ts "https://example.com/subscribe?token=xxx" 6000');
	process.exit(1);
}

console.log(`📡 原始订阅链接: ${origVpnUrl}`);
console.log(`🔧 处理模式: cvr/auto-routing`);
console.log(`🌐 服务端口: ${port}\n`);

const server = http.createServer(async (req, res) => {
	// 只处理 GET 请求
	if (req.method !== 'GET') {
		res.writeHead(405, { 'Content-Type': 'text/plain' });
		res.end('Method Not Allowed');
		return;
	}

	try {
		console.log(`\n[${new Date().toISOString()}] 收到订阅请求`);
		
		// 1. 获取原始订阅（可能是 Base64 或 YAML）
		console.log('⬇️  正在获取原始订阅...');
		const response = await fetch(origVpnUrl, {
			headers: {
				'User-Agent': 'ClashMetaForAndroid/2.11.5.Meta Mihomo/0.19',
			},
		});
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		const rawSubscription = await response.text();
		
		// 保留原始订阅的响应头信息
		let subscriptionUserinfo = response.headers.get('subscription-userinfo');
		let profileTitle = response.headers.get('profile-title');
		let profileUpdateInterval = response.headers.get('profile-update-interval');
		let contentDisposition = response.headers.get('content-disposition');
		
		// 从 content-disposition 中提取文件名（如果存在）
		if (!profileTitle && contentDisposition) {
			// 匹配 filename*=UTF-8'' 或 filename=""
			const utf8Match = contentDisposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/i);
			const regularMatch = contentDisposition.match(/filename=["']?([^"';]+)["']?/i);
			
			if (utf8Match) {
				// URL 解码 UTF-8 编码的文件名，并添加 NCR Modified 标识
				const originalName = decodeURIComponent(utf8Match[1].trim());
				profileTitle = `${originalName} - NCR Modified`;
				// 同时更新 content-disposition 响应头
				const encodedName = encodeURIComponent(profileTitle);
				contentDisposition = `attachment;filename*=UTF-8''${encodedName}`;
				console.log(`📝 从 content-disposition 提取名称: ${profileTitle}`);
			} else if (regularMatch) {
				const originalName = regularMatch[1].trim();
				profileTitle = `${originalName} - NCR Modified`;
				// 同时更新 content-disposition 响应头（使用 URL 编码）
				const encodedName = encodeURIComponent(profileTitle);
				contentDisposition = `attachment;filename*=UTF-8''${encodedName}`;
				console.log(`📝 从 content-disposition 提取名称: ${profileTitle}`);
			}
		}
		
		let clashProxies: any[];
		
		// 2. 检测订阅格式：YAML 或 Base64
		if (rawSubscription.includes('proxies:') || rawSubscription.includes('mixed-port:')) {
			// YAML 格式
			console.log('📋 检测到 YAML 格式订阅');
			const yamlConfig = YAML.parse(rawSubscription);
			clashProxies = yamlConfig.proxies || [];
			console.log(`✅ 从 YAML 中提取到 ${clashProxies.length} 个节点`);
			
			// 如果原始订阅没有提供元数据，尝试从 YAML 内容中提取节点名称作为 profile 名称
			if (!profileTitle && clashProxies.length > 0) {
				// 策略 1: 尝试从节点名称中识别提供商名称（常见模式）
				// 跳过特殊节点（流量信息、到期时间等），找到第一个真正的地理位置节点
				const providerPatterns = [
					{ pattern: /新加坡/, name: 'Singapore' },
					{ pattern: /美国/, name: 'USA' },
					{ pattern: /香港/, name: 'HongKong' },
					{ pattern: /日本/, name: 'Japan' },
					{ pattern: /台湾/, name: 'Taiwan' },
					{ pattern: /韩国/, name: 'Korea' },
					{ pattern: /英国/, name: 'UK' },
					{ pattern: /德国/, name: 'Germany' },
					{ pattern: /法国/, name: 'France' },
					{ pattern: /加拿大/, name: 'Canada' },
					{ pattern: /澳大利亚/, name: 'Australia' },
					{ pattern: /aws/i, name: 'AWS' },
					{ pattern: /do/i, name: 'DigitalOcean' },
					{ pattern: /ak/i, name: 'Akamai' },
					{ pattern: /BGP/i, name: 'BGP' },
					{ pattern: /HKT/i, name: 'HKT' },
				];
						
				let detectedProvider = 'Proxy';
				for (const proxy of clashProxies) {
					// 跳过特殊节点（包含流量、天、套餐等关键字）
					if (proxy.name?.match(/剩余流量|距离下次|套餐到期|客户端设置|电报群|防失联|有20多个/)) {
						continue;
					}
							
					// 尝试匹配地理位置或提供商模式
					for (const { pattern, name } of providerPatterns) {
						if (pattern.test(proxy.name)) {
							detectedProvider = name;
							break;
						}
					}
							
					if (detectedProvider !== 'Proxy') {
						break;
					}
				}
						
				// 生成 profile 标题：包含提供商信息和节点数量（仅使用英文字符），并添加 NCR Modified 标识
				profileTitle = `Auto-Routing ${detectedProvider} (${clashProxies.length} nodes) - NCR Modified`;
				console.log(`📝 自动生成配置名称: ${profileTitle}`);
			}
			
			// 如果没有 subscription-userinfo，但 YAML 中有节点信息，生成默认的流量信息
			if (!subscriptionUserinfo) {
				// 设置为未知流量信息（0/0/0/0 表示未提供）
				subscriptionUserinfo = 'upload=0; download=0; total=0; expire=0';
				console.log('📊 原始订阅未提供流量信息，使用默认值');
			}
		} else {
			// Base64 格式
			console.log('🔓 正在解码 Base64...');
			const decodedNodes = decodeBase64Subscription(rawSubscription);
			const nodeLines = decodedNodes.split('\n').filter(n => n.trim());
			console.log(`✅ 解析到 ${nodeLines.length} 个节点`);
			
			// 3. 解析节点并转换为 Clash 格式
			console.log('🔄 正在转换节点格式...');
			clashProxies = parseNodesToClash(decodedNodes);
			console.log(`✅ 成功转换 ${clashProxies.length} 个节点`);
		}
		
		// 4. 使用 AutoRouting 处理配置
		console.log('⚙️  正在应用 Auto-Routing 规则...');
		const clashConfig = await applyAutoRouting(clashProxies);
		
		// 5. 转换为 YAML
		console.log('📝 正在生成 YAML 配置...');
		const yamlConfig = YAML.stringify(clashConfig);
		
		// 6. 构建响应头（保留原始订阅的元数据）
		const headers: Record<string, string> = {
			'Content-Type': 'text/yaml; charset=utf-8',
			'Content-Length': Buffer.byteLength(yamlConfig).toString(),
			'Access-Control-Allow-Origin': '*',
		};
		
		// 保留原始订阅的 subscription-userinfo（流量信息）
		if (subscriptionUserinfo) {
			headers['Subscription-Userinfo'] = subscriptionUserinfo;
			console.log('📊 保留流量信息:', subscriptionUserinfo);
		}
		
		// 保留原始订阅的 profile-title（配置文件名称）
		if (profileTitle) {
			// Clash 支持 base64 编码的 Profile-Title，可以包含中文和 emoji
			// 格式：Profile-Title: base64:<base64_encoded_utf8>
			const base64Title = Buffer.from(profileTitle, 'utf-8').toString('base64');
			headers['Profile-Title'] = `base64:${base64Title}`;
			console.log('📛 保留配置名称:', profileTitle);
		}
		
		// 保留原始订阅的 content-disposition（如果有）
		if (contentDisposition) {
			headers['Content-Disposition'] = contentDisposition;
			console.log('📎 保留 content-disposition:', contentDisposition);
		}
		
		// 保留原始订阅的 profile-update-interval（更新间隔）
		if (profileUpdateInterval) {
			headers['Profile-Update-Interval'] = profileUpdateInterval;
		} else {
			headers['Profile-Update-Interval'] = '24'; // 默认 24 小时
		}
		
		// 7. 返回结果
		res.writeHead(200, headers);
		res.end(yamlConfig);
		
		console.log('✅ 订阅处理完成并返回');
		
	} catch (error) {
		console.error('❌ 处理订阅时发生错误:', error);
		res.writeHead(500, {
			'Content-Type': 'text/plain; charset=utf-8',
			'Access-Control-Allow-Origin': '*',
		});
		res.end(`Internal Server Error: ${error.message}`);
	}
});

server.listen(port, host, () => {
	const localUrl = `http://localhost:${port}`;
	const lanUrl = `http://<your-lan-ip>:${port}`;
	console.log(`\n✅ 服务已启动: ${localUrl}`);
	console.log(`📋 Clash 订阅链接: ${localUrl}/`);
	console.log(`🌐 局域网访问: ${lanUrl}/`);
	console.log(`🔒 监听地址: ${host}:${port}\n`);
	console.log('⏳ 等待请求...\n');
});

/**
 * 获取原始订阅（Base64 编码）
 */
async function fetchRawSubscription(url: string): Promise<string> {
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'ClashMetaForAndroid/2.11.5.Meta Mihomo/0.19',
		},
	});
	
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}
	
	return await response.text();
}

/**
 * Base64 解码订阅内容
 */
function decodeBase64Subscription(base64Content: string): string {
	try {
		// 处理 URL-Safe Base64
		let normalized = base64Content.replace(/-/g, '+').replace(/_/g, '/');
		
		// 移除所有空白字符
		normalized = normalized.replace(/\s/g, '');
		
		// 填充 = 号
		const padding = normalized.length % 4;
		if (padding) {
			normalized += '='.repeat(4 - padding);
		}
		
		return Buffer.from(normalized, 'base64').toString('utf-8');
	} catch (error) {
		throw new Error(`Base64 解码失败: ${error.message}`);
	}
}

/**
 * 解析节点 URL 为 Clash 格式
 */
function parseNodesToClash(nodesText: string): any[] {
	const lines = nodesText.split('\n').filter(line => line.trim());
	const proxies: any[] = [];
	
	console.log(`📊 总共有 ${lines.length} 行需要解析`);
	
	for (const line of lines) {
		try {
			const trimmedLine = line.trim();
			console.log(`🔍 尝试解析: ${trimmedLine.substring(0, 30)}...`);
			const proxy = parseNodeUrl(trimmedLine);
			if (proxy) {
				proxies.push(proxy);
				console.log(`✅ 成功: ${proxy.name}`);
			} else {
				console.log(`❌ 不支持的格式`);
			}
		} catch (error) {
			console.warn(`⚠️  解析节点失败: ${line.substring(0, 50)}... - ${error.message}`);
		}
	}
	
	return proxies;
}

/**
 * 解析单个节点 URL
 */
function parseNodeUrl(url: string): any | null {
	if (!url.includes('://')) {
		return null;
	}
	
	const [protocol, ...rest] = url.split('://');
	const fullRest = rest.join('://');
	
	switch (protocol.toLowerCase()) {
		case 'hysteria2':
		case 'hy2':
			return parseHysteria2(fullRest);
		case 'vless':
			return parseVLESS(fullRest);
		case 'trojan':
			return parseTrojan(fullRest);
		default:
			console.warn(`⚠️  不支持的协议: ${protocol}`);
			return null;
	}
}

/**
 * 解析 Hysteria2 节点
 */
function parseHysteria2(rest: string): any {
	const [authAndServer, ...queryParts] = rest.split('?');
	const [password, serverAndPort] = authAndServer.split('@');
	
	const [server, port] = serverAndPort.split(':');
	const query = queryParts.join('?');
	const params = new URLSearchParams(query);
	
	// 从 URL fragment 获取名称
	const nameMatch = rest.match(/#(.+)$/);
	const name = nameMatch ? decodeURIComponent(nameMatch[1]) : `${server}:${port}`;
	
	const insecure = params.get('insecure') === '1';
	const sni = params.get('sni') || server;
	
	const proxy: any = {
		name,
		type: 'hysteria2',
		server,
		port: parseInt(port),
		password,
		sni,
	};
	
	if (insecure) {
		proxy['skip-cert-verify'] = true;
	}
	
	// 处理 obfs
	const obfs = params.get('obfs');
	if (obfs) {
		proxy.obfs = obfs;
		proxy['obfs-password'] = params.get('obfs-password') || '';
	}
	
	return proxy;
}

/**
 * 解析 VLESS 节点
 */
function parseVLESS(rest: string): any {
	const [uuidAndServer, query] = rest.split('?');
	const [uuid, serverAndPort] = uuidAndServer.split('@');
	
	const [server, port] = serverAndPort.split(':');
	const params = new URLSearchParams(query);
	
	const nameMatch = rest.match(/#(.+)$/);
	const name = nameMatch ? decodeURIComponent(nameMatch[1]) : `${server}:${port}`;
	
	const proxy: any = {
		name,
		type: 'vless',
		server,
		port: parseInt(port),
		uuid,
		network: params.get('type') || 'tcp',
		tls: params.get('security') === 'reality' || params.get('security') === 'tls',
	};
	
	if (proxy.tls) {
		proxy.sni = params.get('sni') || server;
		
		if (params.get('security') === 'reality') {
			proxy['reality-opts'] = {
				'public-key': params.get('pbk') || '',
				'short-id': params.get('sid') || '',
			};
		}
	}
	
	// flow
	const flow = params.get('flow');
	if (flow) {
		proxy.flow = flow;
	}
	
	return proxy;
}

/**
 * 解析 Trojan 节点
 */
function parseTrojan(rest: string): any {
	const [authAndServer, ...queryParts] = rest.split('?');
	const [password, serverAndPort] = authAndServer.split('@');
	
	const [server, port] = serverAndPort.split(':');
	const query = queryParts.join('?');
	const params = new URLSearchParams(query);
	
	const nameMatch = rest.match(/#(.+)$/);
	const name = nameMatch ? decodeURIComponent(nameMatch[1]) : `${server}:${port}`;
	
	const proxy: any = {
		name,
		type: 'trojan',
		server,
		port: parseInt(port),
		password,
		sni: params.get('sni') || server,
		network: params.get('type') || 'tcp',
	};
	
	return proxy;
}

/**
 * 应用 Auto-Routing 规则（使用编译后的脚本）
 */
async function applyAutoRouting(proxies: any[]): Promise<any> {
	const path = await import('path');
	const { fileURLToPath } = await import('url');
	const { readFileSync } = await import('fs');
	
	const __filename = fileURLToPath(import.meta.url);
	const currentDir = path.dirname(__filename);
	// 从 VPN-Servers/auto-routing/ 向上两级到 parser/
	const projectRoot = path.resolve(currentDir, '../..');
	const scriptPath = path.join(projectRoot, 'dist/cvr/auto-routing.js');
	
	// 读取编译后的脚本
	const scriptContent = readFileSync(scriptPath, 'utf-8');
	
	// 编译后的脚本使用 var main 导出，需要在全局作用域执行
	// 创建一个函数来执行脚本并返回 main 函数
	const scriptFn = new Function(scriptContent + '; return main;');
	const main = scriptFn();
	
	if (typeof main !== 'function') {
		throw new Error('编译后的脚本未正确导出 main 函数');
	}
	
	// 构建基础 Clash 配置
	const baseConfig = {
		port: 7890,
		'socks-port': 7891,
		'allow-lan': true,
		mode: 'Rule',
		'log-level': 'info',
		dns: {
			enable: true,
			ipv6: true,
			'enhanced-mode': 'fake-ip',
			'fake-ip-range': '198.18.0.1/16',
			nameserver: [
				'https://doh.pub/dns-query',
				'https://dns.alidns.com/dns-query',
			],
		},
		proxies,
		'proxy-groups': [],
		rules: [],
	};
	
	console.log('⚙️  调用 Auto-Routing 处理配置...');
	// 调用 main 函数处理配置
	const processedConfig = main(baseConfig, 'vpn-server-profile');
	
	return processedConfig;
}

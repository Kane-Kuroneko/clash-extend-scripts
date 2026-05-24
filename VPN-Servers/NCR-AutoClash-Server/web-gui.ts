/**
 * Web GUI 模块
 *
 * 基于标准 `ws` 库实现：
 *  1. WebSocket 服务端（noServer 模式，由外层 http server 转发 upgrade）
 *  2. 内嵌 HTML 页面，浏览器侧通过 WS 接收 server log
 *  3. console.log/warn/error/info 拦截，同时进 stdout 与 WS 广播
 *  4. 自动打开本机默认浏览器
 *  5. 网页关闭后自动停止 server（带 3 秒缓冲，期间重新连接可取消）
 *  6. 心跳 ping/pong，避免中间链路 idle 断开 + 检测掉线客户端
 */
import http from 'http';
import { spawn } from 'child_process';
import type { Socket } from 'net';
import { WebSocketServer, WebSocket } from 'ws';

const SHUTDOWN_GRACE_MS = 3000;
const PING_INTERVAL_MS = 25000;
const LOG_BUFFER_MAX = 300;

const logBuffer: string[] = [];
let hasEverConnected = false;
let shutdownTimer: NodeJS.Timeout | null = null;
let pingTimer: NodeJS.Timeout | null = null;

// 懒初始化的 WebSocketServer（noServer 模式，由 handleUpgrade 转发握手）
const wss = new WebSocketServer({ noServer: true });

// 在 ws 实例上挂一个 isAlive 标志，用于心跳检测
type AliveWs = WebSocket & { isAlive?: boolean };

// ---------------- 自动停止逻辑 ----------------

function origLog(...args: any[]): void {
	const fn = (console.log as any).__origLog ?? console.log;
	fn(...args);
}

function scheduleShutdownIfEmpty(): void {
	if (wss.clients.size > 0 || !hasEverConnected) return;
	if (shutdownTimer) return;
	origLog(`\n🔌 网页已关闭，${SHUTDOWN_GRACE_MS / 1000} 秒后停止服务...`);
	shutdownTimer = setTimeout(() => {
		origLog('👋 服务已停止');
		process.exit(0);
	}, SHUTDOWN_GRACE_MS);
}

function cancelShutdown(): void {
	if (!shutdownTimer) return;
	clearTimeout(shutdownTimer);
	shutdownTimer = null;
	origLog('🔄 检测到网页重新连接，取消停止');
}

// ---------------- 对外 API ----------------

export function broadcast(text: string): void {
	for (const client of wss.clients) {
		if (client.readyState === WebSocket.OPEN) {
			try {
				client.send(text);
			} catch {
				// ignore
			}
		}
	}
}

/** 拦截 console.* 转发到所有 WS 客户端，同时保留 stdout */
export function interceptConsole(): void {
	const origLogFn = console.log.bind(console);
	const origWarn = console.warn.bind(console);
	const origError = console.error.bind(console);
	const origInfo = console.info.bind(console);

	const stringify = (args: any[]) =>
		args
			.map((a) => {
				if (typeof a === 'string') return a;
				if (a instanceof Error) return a.stack ?? a.message;
				try {
					return JSON.stringify(a);
				} catch {
					return String(a);
				}
			})
			.join(' ');

	const wrap = (orig: (...a: any[]) => void, level: string) => {
		const fn = (...args: any[]) => {
			orig(...args);
			const ts = new Date().toLocaleTimeString();
			const line = `[${ts}] [${level}] ${stringify(args)}`;
			logBuffer.push(line);
			if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();
			broadcast(line);
		};
		(fn as any).__origLog = orig;
		return fn;
	};

	console.log = wrap(origLogFn, 'INFO');
	console.warn = wrap(origWarn, 'WARN');
	console.error = wrap(origError, 'ERROR');
	console.info = wrap(origInfo, 'INFO');
}

/**
 * 处理 HTTP upgrade 事件 → 完成 WebSocket 握手
 * 返回 true 表示已处理（调用方不要再做别的）
 */
export function handleUpgrade(
	req: http.IncomingMessage,
	socket: Socket,
	head: Buffer
): boolean {
	if (req.url !== '/ws') {
		socket.destroy();
		return true;
	}
	wss.handleUpgrade(req, socket, head, (ws) => {
		wss.emit('connection', ws, req);
	});
	return true;
}

wss.on('connection', (ws: AliveWs) => {
	ws.isAlive = true;
	hasEverConnected = true;
	cancelShutdown();

	ws.on('pong', () => {
		ws.isAlive = true;
	});

	ws.on('close', () => {
		scheduleShutdownIfEmpty();
	});

	ws.on('error', () => {
		// ws 库会自动 close，无需重复处理
	});

	// 回放最近的日志
	for (const line of logBuffer) {
		try {
			ws.send(line);
		} catch {
			// ignore
		}
	}
	try {
		ws.send(`[${new Date().toLocaleTimeString()}] [SYS] ✅ Web GUI 已连接`);
	} catch {
		// ignore
	}
});

/** 处理 HTTP 请求（仅 / 和 /index.html）；返回 true 表示已处理 */
export function handleHttpRequest(
	req: http.IncomingMessage,
	res: http.ServerResponse
): boolean {
	if (req.url === '/' || req.url === '/index.html') {
		res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
		res.end(GUI_HTML);
		return true;
	}
	return false;
}

/** 启动服务端定期 ping，避免代理/防火墙因 idle 关闭连接 + 检测掉线 */
export function startKeepAlive(): void {
	if (pingTimer) return;
	pingTimer = setInterval(() => {
		for (const client of wss.clients) {
			const aliveWs = client as AliveWs;
			if (aliveWs.isAlive === false) {
				try {
					aliveWs.terminate();
				} catch {
					// ignore
				}
				continue;
			}
			aliveWs.isAlive = false;
			try {
				aliveWs.ping();
			} catch {
				// ignore
			}
		}
		if (wss.clients.size === 0) scheduleShutdownIfEmpty();
	}, PING_INTERVAL_MS);
	pingTimer.unref?.();
}

/** 跨平台打开默认浏览器（设置 NCR_NO_OPEN_BROWSER=1 可跳过，用于 CI / 脱机调试） */
export function openBrowser(url: string): void {
	if (process.env.NCR_NO_OPEN_BROWSER) return;
	try {
		if (process.platform === 'win32') {
			spawn('cmd', ['/c', 'start', '""', url], {
				detached: true,
				stdio: 'ignore',
				shell: false,
			}).unref();
		} else if (process.platform === 'darwin') {
			spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
		} else {
			spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
		}
	} catch (err) {
		const origWarn = (console.warn as any).__origLog ?? console.warn;
		origWarn('⚠️ 自动打开浏览器失败:', (err as Error).message);
	}
}

// ---------------- 内嵌 HTML ----------------

const GUI_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NCR-AutoClash-Server · Web GUI</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: 'Consolas', 'Menlo', 'Microsoft YaHei', monospace; background: #1e1e1e; color: #d4d4d4; }
  header { padding: 12px 20px; background: #252526; border-bottom: 1px solid #333; }
  header h1 { margin: 0; font-size: 15px; font-weight: 600; }
  #status { font-size: 12px; color: #4ec9b0; margin-top: 6px; }
  #status.disconnected { color: #f48771; }
  #log { padding: 10px 20px 60px; height: calc(100vh - 60px); overflow-y: auto; white-space: pre-wrap; word-break: break-all; font-size: 12.5px; line-height: 1.55; }
  .row { padding: 1px 0; }
  .lv-INFO  { color: #d4d4d4; }
  .lv-WARN  { color: #dcdcaa; }
  .lv-ERROR { color: #f48771; }
  .lv-SYS   { color: #569cd6; }
  footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 8px 20px; background: #252526; border-top: 1px solid #333; font-size: 12px; color: #888; display: flex; justify-content: space-between; }
  #count { color: #888; }
</style>
</head>
<body>
<header>
  <h1>🚀 NCR-AutoClash-Server · Web GUI</h1>
  <div id="status">连接中...</div>
</header>
<main id="log"></main>
<footer>
  <span>关闭此页面后服务将自动停止</span>
  <span id="count">0 行</span>
</footer>
<script>
  var status = document.getElementById('status');
  var logEl  = document.getElementById('log');
  var countEl = document.getElementById('count');
  var ws, lines = 0;

  function append(level, text) {
    var div = document.createElement('div');
    div.className = 'row lv-' + level;
    div.textContent = text;
    logEl.appendChild(div);
    lines++;
    countEl.textContent = lines + ' 行';
    logEl.scrollTop = logEl.scrollHeight;
  }

  function connect() {
    var url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
    ws = new WebSocket(url);
    ws.onopen = function () {
      status.textContent = '● 已连接 ' + location.host;
      status.classList.remove('disconnected');
    };
    ws.onmessage = function (ev) {
      var text = String(ev.data);
      var level = 'INFO';
      var m = text.match(/\\[(INFO|WARN|ERROR|SYS)\\]/);
      if (m) level = m[1];
      append(level, text);
    };
    ws.onclose = function () {
      status.textContent = '● 已断开';
      status.classList.add('disconnected');
      append('SYS', '[client] 与服务器的连接已断开');
    };
    ws.onerror = function () { /* noop */ };
  }

  connect();
</script>
</body>
</html>`;

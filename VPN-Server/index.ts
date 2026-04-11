import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const confDir = path.join(__dirname, 'conf.ymls');

// 从命令行参数获取配置
const args = process.argv.slice(2);
const configFile = args[0] || 'fastlink.yaml';
const port = parseInt(args[1] || '6666', 10);

const server = http.createServer((req, res) => {
  // 只处理 GET 请求
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  const filePath = path.join(confDir, configFile);

  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`Configuration file '${configFile}' not found`);
    return;
  }

  // 读取并返回文件
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.writeHead(200, {
      'Content-Type': 'text/yaml',
      'Content-Length': Buffer.byteLength(content),
      'Access-Control-Allow-Origin': '*', // 允许跨域访问
    });
    res.end(content);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`\n✅ Server running at ${url}`);
  console.log(`📄 Serving: ${configFile}`);
  console.log(`🔗 Clash URL: ${url}/\n`);
});
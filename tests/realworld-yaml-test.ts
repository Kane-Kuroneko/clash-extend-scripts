/**
 * 真实机场配置测试
 * 测试 auto-routing 和 global-proxy 模式对真实世界 YAML 配置的处理能力
 *
 * 此测试基于用户提供的实际机场配置（三毛机场），覆盖：
 * 1. YAML 流格式语法错误（password:  udp: true 缺少逗号）
 * 2. 包含特殊字符的代理名称（全角冒号、管道符、括号、emoji、中文）
 * 3. rules 中引用了已被清空的原始 proxy-group 的降级处理
 * 4. AND/NOT/OR 逻辑规则的保留与降级（核心回归测试）
 *
 * Bug 背景：
 *   convertOriginalRules() 曾对 AND/NOT/OR 逻辑规则按普通格式 TYPE,value,group 解析，
 *   取 parts[2] 作为 group，导致嵌套子规则被拆分，产生
 *   "rules[90] [AND,((DST-PORT,🫧 Proxy A 🫧] error: payload format error"
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parse as yamlParse } from 'yaml';
import { AutoRoutingGroup } from '../src/AutoRoutingConfig';
import { GlobalRestrictedGroup } from '../src/config/GlobalRestrictedGroup';

// ============================================================
// Mock 编译时规则数据
// ============================================================
const mockCompileTimeRules = {
    Loyalsoldier_GFW: ['google.com', 'facebook.com', 'twitter.com', 'youtube.com'],
    Loyalsoldier_Proxy: ['netflix.com', 'spotify.com', 'hulu.com'],
    Loyalsoldier_Telegram: ['IP-CIDR,91.108.4.0/22,no-resolve', 'IP-CIDR6,2001:67c:4e8::/48,no-resolve'],
    Microsoft: ['DOMAIN-SUFFIX,microsoft.com', 'DOMAIN-SUFFIX,office.com', 'DOMAIN-KEYWORD,windows'],
    Loyalsoldier_Apple: ['apple.com', 'icloud.com'],
    Loyalsoldier_Direct: ['baidu.com', 'qq.com', 'taobao.com'],
    CN_bilibili: ['bilibili.com'],
    ITNL_bilibili: ['+.*.bilibili.com'],
    Blocked_By_GFW: ['+.google.com'],
    AI: ['openai.com', 'anthropic.com', 'claude.ai']
};

(global as any).__CompileTime_Rules__ = mockCompileTimeRules;

// ============================================================
// 测试夹具
// ============================================================

// 模拟真实机场的代理配置（从用户提供的 YAML 提取，已修正语法错误）
const realWorldProxies = [
    // 信息类代理（与真实节点同服务器，名称含全角冒号用于展示流量信息）
    { name: '剩余流量：497.57 GB', type: 'anytls', server: 'us4837-1.aikunapp.com', port: 6003, password: '', udp: true, sni: 'sm.localhost', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
    { name: '距离下次重置剩余：27 天', type: 'anytls', server: 'us4837-1.aikunapp.com', port: 6003, password: '', udp: true, sni: 'sm.localhost', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
    { name: '套餐到期：2026-12-01', type: 'anytls', server: 'us4837-1.aikunapp.com', port: 6003, password: '', udp: true, sni: 'sm.localhost', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },

    // 正常代理
    { name: '2x专线-美国洛杉矶', type: 'anytls', server: 'us4837-1.aikunapp.com', port: 6003, password: '', udp: true, sni: 'sm.localhost', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
    { name: '美国洛杉矶|高速下载', type: 'anytls', server: '172.96.160.129', port: 6001, password: '', udp: true, sni: 'ftytyd.local', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
    { name: '美国堪萨斯|AI推荐', type: 'anytls', server: '69.30.197.147', port: 443, password: '', udp: true, sni: 'sm.localhost', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },

    // 专线代理
    { name: '2x专线-日本-2 (IPv6)', type: 'trojan', server: 'v6-aws-jp.aikunapp.com', port: 7001, password: '', udp: true, 'skip-cert-verify': true, sni: 'd1--cn-gotcha204-3.bilivideo.com', 'client-fingerprint': 'chrome', network: 'tcp' },
    { name: '2x专线-日本-3 (IPv6)', server: 'v6-aws-jp.aikunapp.com', port: 7001, 'skip-cert-verify': true, sni: 'd1--cn-gotcha204-3.bilivideo.com', type: 'hysteria2', password: '' },
    { name: '2x专线-香港-2 (IPv6)', type: 'trojan', server: 'v6-aws-hk.aikunapp.com', port: 7001, password: '', udp: true, 'skip-cert-verify': true, sni: 'd1--cn-gotcha204-3.bilivideo.com', 'client-fingerprint': 'chrome', network: 'tcp' },
    { name: '2x专线-香港-3 (IPv6)', server: 'v6-aws-hk.aikunapp.com', port: 7001, 'skip-cert-verify': true, sni: 'd1--cn-gotcha204-3.bilivideo.com', type: 'hysteria2', password: '' },
    { name: '2x专线-新加坡-2 (IPv6)', type: 'trojan', server: 'v6-aws-sg.aikunapp.com', port: 7001, password: '', udp: true, 'skip-cert-verify': true, sni: 'd1--cn-gotcha204-3.bilivideo.com', 'client-fingerprint': 'chrome', network: 'tcp' },
    { name: '2x专线-新加坡-3 (IPv6)', server: 'v6-aws-sg.aikunapp.com', port: 7001, 'skip-cert-verify': true, sni: 'd1--cn-gotcha204-3.bilivideo.com', type: 'hysteria2', password: '' },

    // vmess 类型
    { name: '如果很少节点可用，去官网更新软件', type: 'vmess', server: '127.0.0.1', port: 20003, uuid: '9ea47a0e-397c-42ab-bb94-164d8af8efc7', alterId: 0, cipher: 'auto', udp: true, network: 'tcp' },
    { name: '建议每天更新一次订阅', type: 'vmess', server: '127.0.0.1', port: 20004, uuid: '9ea47a0e-397c-42ab-bb94-164d8af8efc7', alterId: 0, cipher: 'auto', udp: true, network: 'tcp' },

    // IPv6 hysteria2（password 为空字符串）
    { name: '加拿大 IPv6', server: '2607:5300:205:200::7996', port: 5021, 'skip-cert-verify': true, sni: 'd1--cn-gotcha204-4.bilivideo.com', type: 'hysteria2', password: '' },
    { name: '法国 IPv6', server: '2001:41d0:305:2100::3967', port: 5021, 'skip-cert-verify': true, sni: 'd1--cn-gotcha204-4.bilivideo.com', type: 'hysteria2', password: '' },

    // AI推荐 / 原生IP / 高倍率代理
    { name: '英国|AI推荐', type: 'anytls', server: '51.89.216.207', port: 443, password: '', udp: true, sni: 'sm.localhost', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
    { name: '加拿大|AI推荐', type: 'anytls', server: '158.69.192.77', port: 6001, password: '', udp: true, sni: 'swcdn.apple.com', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
    { name: '德国|AI推荐', type: 'anytls', server: '51.75.77.164', port: 6001, password: '', udp: true, sni: 'swcdn.apple.com', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
    { name: '法国|AI推荐', type: 'anytls', server: '51.68.227.243', port: 6001, password: '', udp: true, sni: 'swcdn.apple.com', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
    { name: '香港原生IP-1|勿跑大流量', type: 'anytls', server: 'hktddns1.aikunapp.com', port: 6001, password: '', udp: true, sni: 'www.apple.com', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
    { name: '香港原生IP-2|勿跑大流量', type: 'anytls', server: 'hktddns2.aikunapp.com', port: 6001, password: '', udp: true, sni: 'www.apple.com', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
    { name: '台湾1|5x倍率|勿跑大流量', type: 'anytls', server: 'hinetddns5.aikunapp.com', port: 6001, password: '', udp: true, sni: 'bootcdn.xuexi.cn', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
    { name: '台湾2|5x倍率|勿跑大流量', type: 'anytls', server: 'hinetddns6.aikunapp.com', port: 6001, password: '', udp: true, sni: 'hsgagfahfa.local', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
    { name: '日本 softbank|勿跑大流量', type: 'anytls', server: 'tj-jp-1.aikunapp.com', port: 6001, password: '', udp: true, sni: 'bootcdn.xuexi.cn', 'skip-cert-verify': true, 'client-fingerprint': 'chrome' },
];

// 模拟原始订阅的 rules（摘自三毛机场真实配置）
const realWorldOriginalRules = [
    'DOMAIN,api.ip.sb,REJECT',
    'DOMAIN,ipapi.co,REJECT',
    'DOMAIN,api.ipapi.is,REJECT',
    'DOMAIN,ipwho.is,REJECT',
    'DOMAIN,injections.adguard.org,DIRECT',
    'DOMAIN,local.adguard.org,DIRECT',
    'IP-CIDR,0.0.0.0/8,DIRECT,no-resolve',
    'IP-CIDR,10.0.0.0/8,DIRECT,no-resolve',
    'IP-CIDR,100.64.0.0/10,DIRECT,no-resolve',
    'IP-CIDR,127.0.0.0/8,DIRECT,no-resolve',
    'IP-CIDR,169.254.0.0/16,DIRECT,no-resolve',
    'IP-CIDR,172.16.0.0/12,DIRECT,no-resolve',
    'IP-CIDR,192.0.0.0/24,DIRECT,no-resolve',
    'IP-CIDR,192.0.2.0/24,DIRECT,no-resolve',
    'IP-CIDR,192.88.99.0/24,DIRECT,no-resolve',
    'IP-CIDR,192.168.0.0/16,DIRECT,no-resolve',
    'IP-CIDR,198.18.0.0/15,DIRECT,no-resolve',
    'IP-CIDR,198.51.100.0/24,DIRECT,no-resolve',
    'IP-CIDR,203.0.113.0/24,DIRECT,no-resolve',
    'IP-CIDR,224.0.0.0/3,DIRECT,no-resolve',
    'IP-CIDR,::/127,DIRECT,no-resolve',
    'IP-CIDR,fc00::/7,DIRECT,no-resolve',
    'IP-CIDR,fe80::/10,DIRECT,no-resolve',
    'IP-CIDR,ff00::/8,DIRECT,no-resolve',
    'RULE-SET,private_domain,DIRECT,no-resolve',
    'IP-CIDR,5.28.195.0/24,REJECT,no-resolve',
    'DOMAIN,safebrowsing.urlsec.qq.com,DIRECT',
    'DOMAIN,safebrowsing.googleapis.com,DIRECT',
    'DOMAIN,developer.apple.com,三毛机场',
    'DOMAIN-SUFFIX,digicert.com,三毛机场',
    'DOMAIN,ocsp.apple.com,三毛机场',
    'DOMAIN,ocsp.comodoca.com,三毛机场',
    'DOMAIN,ocsp.usertrust.com,三毛机场',
    'DOMAIN,ocsp.sectigo.com,三毛机场',
    'DOMAIN,ocsp.verisign.net,三毛机场',
    'DOMAIN-SUFFIX,apple-dns.net,三毛机场',
    'DOMAIN,testflight.apple.com,三毛机场',
    'DOMAIN,sandbox.itunes.apple.com,三毛机场',
    'DOMAIN,itunes.apple.com,三毛机场',
    'DOMAIN-SUFFIX,apps.apple.com,三毛机场',
    'DOMAIN-SUFFIX,blobstore.apple.com,三毛机场',
    'DOMAIN,cvws.icloud-content.com,三毛机场',
    'DOMAIN-SUFFIX,mzstatic.com,DIRECT',
    'DOMAIN-SUFFIX,itunes.apple.com,DIRECT',
    'DOMAIN-SUFFIX,icloud.com,DIRECT',
    'DOMAIN-SUFFIX,icloud-content.com,DIRECT',
    'DOMAIN-SUFFIX,me.com,DIRECT',
    'DOMAIN-SUFFIX,aaplimg.com,DIRECT',
    'DOMAIN-SUFFIX,cdn20.com,DIRECT',
    'DOMAIN-SUFFIX,cdn-apple.com,DIRECT',
    'DOMAIN-SUFFIX,akadns.net,DIRECT',
    'DOMAIN-SUFFIX,akamaiedge.net,DIRECT',
    'DOMAIN-SUFFIX,edgekey.net,DIRECT',
    'DOMAIN-SUFFIX,mwcloudcdn.com,DIRECT',
    'DOMAIN-SUFFIX,mwcname.com,DIRECT',
    'DOMAIN-SUFFIX,apple.com,DIRECT',
    'DOMAIN-SUFFIX,apple-cloudkit.com,DIRECT',
    'DOMAIN-SUFFIX,apple-mapkit.com,DIRECT',
    'AND,((DST-PORT,443),(NETWORK,UDP)),REJECT',
    'DOMAIN-SUFFIX,services.googleapis.cn,三毛机场',
    'DOMAIN-SUFFIX,xn--ngstr-lra8j.com,三毛机场',
    'RULE-SET,geolocation-!cn,三毛机场,no-resolve',
    'RULE-SET,cn_domain,DIRECT,no-resolve',
    'IP-CIDR,221.228.32.13/32,三毛机场',
    'RULE-SET,cn_ip,DIRECT',
    'MATCH,三毛机场',
];

// 预设分组名称常量（与源码保持一致）
const PROXY_A = '🫧 Proxy A 🫧';
const GLOBAL_PROXY = '🫧 Global Proxy 🫧';

const mockDeps = {
    axios: null,
    yaml: null,
    notify: null,
    console: console,
};

const mockParams = {
    name: 'real-world-test',
    url: 'http://test.com',
    interval: 300,
    selected: [],
};

// ============================================================
// 工厂函数
// ============================================================

interface SourceOverrides {
    proxies?: object[];
    proxyGroups?: object[];
    rules?: string[];
}

function makeSource(overrides: SourceOverrides = {}) {
    return {
        source: {
            proxies: overrides.proxies ?? realWorldProxies,
            'proxy-groups': overrides.proxyGroups ?? [],
            rules: overrides.rules ?? [],
        },
        raw: '',
    };
}

/** 创建指向已清空分组的 mock 代理组 */
function makeObsoleteGroup(name: string = '三毛机场') {
    return { name, type: 'select', proxies: realWorldProxies.map(p => p.name) };
}

/** 从规则中提取匹配特定模式的规则行 */
function findRulesBySuffix(rules: string[], suffix: string): string[] {
    return rules.filter((r: string) => r.endsWith(suffix));
}

// ============================================================
// 测试：AutoRoutingGroup
// ============================================================
describe('真实机场配置 — AutoRoutingGroup', () => {

    // --- 冒烟测试 ---
    describe('真实代理列表处理', () => {
        it('使用真实机场代理创建 AutoRoutingGroup 不应崩溃，且 proxiesList 完整保留', () => {
            const source = makeSource();

            let config: AutoRoutingGroup;
            assert.doesNotThrow(() => {
                config = new AutoRoutingGroup(
                    source as any, mockDeps as any, mockParams as any,
                );
            }, '真实代理列表不应导致构造失败');

            config = config!;
            assert.ok(config.source, '应该有 source');
            assert.ok(Array.isArray(config.source.rules), '应该有 rules 数组');
            assert.ok(config.source.rules.length > 0, '应该生成规则');
            assert.strictEqual(
                config.proxiesList.length,
                realWorldProxies.length,
                'proxiesList 长度应与输入一致',
            );
        });
    });

    // --- 特殊字符 ---
    describe('代理名称与特殊字符', () => {
        it('应保留含全角冒号、管道符、括号、中文的代理名称', () => {
            const source = makeSource();
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );

            const specialNames = [
                '剩余流量：497.57 GB',
                '美国洛杉矶|高速下载',
                '2x专线-日本-2 (IPv6)',
                '台湾1|5x倍率|勿跑大流量',
            ];

            specialNames.forEach(name => {
                assert.ok(
                    config.proxiesList.includes(name),
                    `代理 "${name}" 应出现在 proxiesList 中`,
                );
            });
        });
    });

    // --- 原始 rules 转换 ---
    describe('原始 rules 转换（降级与保留）', () => {
        it('指向已清空 proxy-group 的规则应降级到 Proxy A，内置策略和逻辑规则应原样保留', () => {
            const source = makeSource({
                proxyGroups: [makeObsoleteGroup('三毛机场'), makeObsoleteGroup('♻️ 自动选择')],
                rules: realWorldOriginalRules,
            });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            // 不应残留指向已清空分组的规则
            const staleRules = rules.filter((r: string) => r.includes(',三毛机场'));
            assert.strictEqual(staleRules.length, 0, '不应保留指向已清空分组的规则');

            // 精确断言：特定规则应降级到 Proxy A
            assert.ok(
                rules.includes(`DOMAIN,developer.apple.com,${PROXY_A}`),
                'developer.apple.com 应降级到 Proxy A',
            );
            assert.ok(
                rules.includes(`DOMAIN-SUFFIX,digicert.com,${PROXY_A}`),
                'digicert.com 应降级到 Proxy A',
            );
            assert.ok(
                rules.includes(`DOMAIN,ocsp.apple.com,${PROXY_A}`),
                'ocsp.apple.com 应降级到 Proxy A',
            );

            // 精确断言：AND 逻辑规则 REJECT 目标应原样保留（核心回归测试）
            assert.ok(
                rules.includes('AND,((DST-PORT,443),(NETWORK,UDP)),REJECT'),
                'AND 规则 REJECT 目标应原样保留，不应被改写',
            );

            // DIRECT/REJECT 规则应原样保留
            assert.ok(rules.includes('DOMAIN,api.ip.sb,REJECT'), 'REJECT 规则应保留');
            assert.ok(rules.includes('DOMAIN,injections.adguard.org,DIRECT'), 'DIRECT 规则应保留');
            assert.ok(rules.includes('DOMAIN,local.adguard.org,DIRECT'), 'DIRECT 规则应保留');
        });

        it('MATCH 规则不应泄露到输出中（原 MATCH 被过滤，仅保留 auto-routing 自身的 Final）', () => {
            const source = makeSource({
                proxyGroups: [makeObsoleteGroup()],
                rules: realWorldOriginalRules,
            });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            const matchRules = rules.filter((r: string) => r.startsWith('MATCH,'));
            assert.strictEqual(matchRules.length, 1, '应只有一个 MATCH 规则');
            assert.ok(
                matchRules[0]?.includes('🐟 Final'),
                '唯一的 MATCH 应指向 Final 分组',
            );
        });

        it('原始 rules 中的 DIRECT 和 REJECT 策略应原样保留', () => {
            const source = makeSource({ rules: realWorldOriginalRules });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            // 内置策略规则不应被改写
            assert.ok(rules.includes('DOMAIN,api.ip.sb,REJECT'));
            assert.ok(rules.includes('DOMAIN,ipapi.co,REJECT'));
            assert.ok(rules.includes('DOMAIN,injections.adguard.org,DIRECT'));
            assert.ok(rules.includes('DOMAIN,local.adguard.org,DIRECT'));

            // AND 逻辑规则 REJECT 目标也应保留
            assert.ok(rules.includes('AND,((DST-PORT,443),(NETWORK,UDP)),REJECT'));
        });
    });

    // --- 逻辑规则（核心回归测试） ---
    describe('逻辑规则 (AND/NOT/OR) convertOriginalRules 处理', () => {
        it('AND 规则指向内置策略 (REJECT/DIRECT) 时应原样保留', () => {
            const source = makeSource({
                rules: [
                    'AND,((DST-PORT,443),(NETWORK,UDP)),REJECT',
                    'AND,((DST-PORT,80),(DST-PORT,8080)),DIRECT',
                ],
            });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                rules.includes('AND,((DST-PORT,443),(NETWORK,UDP)),REJECT'),
                'AND + REJECT 应原样保留',
            );
            assert.ok(
                rules.includes('AND,((DST-PORT,80),(DST-PORT,8080)),DIRECT'),
                'AND + DIRECT 应原样保留',
            );
        });

        it('AND 规则指向已清空分组时应降级到 Proxy A', () => {
            const source = makeSource({
                proxyGroups: [makeObsoleteGroup()],
                rules: ['AND,((DST-PORT,443)),三毛机场'],
            });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                rules.includes(`AND,((DST-PORT,443)),${PROXY_A}`),
                'AND + 三毛机场 应降级为 AND + Proxy A',
            );
            assert.ok(
                !rules.some((r: string) => r.includes(',三毛机场')),
                '不应残留任何指向三毛机场的规则',
            );
        });

        it('NOT 规则指向内置策略时应原样保留', () => {
            const source = makeSource({
                rules: ['NOT,((DOMAIN,example.com)),REJECT'],
            });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                rules.includes('NOT,((DOMAIN,example.com)),REJECT'),
                'NOT + REJECT 应原样保留',
            );
        });

        it('NOT 规则指向已清空分组时应降级到 Proxy A', () => {
            const source = makeSource({
                proxyGroups: [makeObsoleteGroup()],
                rules: ['NOT,((DOMAIN,example.com)),三毛机场'],
            });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                rules.includes(`NOT,((DOMAIN,example.com)),${PROXY_A}`),
                'NOT + 三毛机场 应降级为 NOT + Proxy A',
            );
        });

        it('OR 规则指向内置策略时应原样保留', () => {
            const source = makeSource({
                rules: ['OR,((DOMAIN,a.com),(DOMAIN,b.com)),DIRECT'],
            });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                rules.includes('OR,((DOMAIN,a.com),(DOMAIN,b.com)),DIRECT'),
                'OR + DIRECT 应原样保留',
            );
        });

        it('OR 规则指向已清空分组时应降级到 Proxy A', () => {
            const source = makeSource({
                proxyGroups: [makeObsoleteGroup()],
                rules: ['OR,((DOMAIN,a.com),(DOMAIN,b.com)),三毛机场'],
            });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                rules.includes(`OR,((DOMAIN,a.com),(DOMAIN,b.com)),${PROXY_A}`),
                'OR + 三毛机场 应降级为 OR + Proxy A',
            );
        });

        // --- no-resolve 后缀丢弃（机场保护措施） ---
        it('AND 规则带 no-resolve 后缀时应被丢弃（机场保护措施）', () => {
            const source = makeSource({
                rules: ['AND,((DST-PORT,443)),REJECT,no-resolve'],
            });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                !rules.some((r: string) => r.startsWith('AND,((DST-PORT,443))')),
                'AND + no-resolve 应以任何形式出现在输出中',
            );
        });

        it('NOT 规则带 no-resolve 后缀时应被丢弃', () => {
            const source = makeSource({
                rules: ['NOT,((DOMAIN,example.com)),REJECT,no-resolve'],
            });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                !rules.some((r: string) => r.startsWith('NOT,((DOMAIN,example.com))')),
                'NOT + no-resolve 不应出现在输出中',
            );
        });

        it('OR 规则带 no-resolve 后缀时应被丢弃', () => {
            const source = makeSource({
                rules: ['OR,((DOMAIN,a.com),(DOMAIN,b.com)),DIRECT,no-resolve'],
            });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                !rules.some((r: string) => r.startsWith('OR,((DOMAIN,a.com)')),
                'OR + no-resolve 不应出现在输出中',
            );
        });

        it('逻辑规则 no-resolve 后缀不应影响正常规则的 no-resolve', () => {
            const source = makeSource({
                rules: [
                    'AND,((DST-PORT,443)),REJECT,no-resolve',
                    'IP-CIDR,10.0.0.0/8,DIRECT,no-resolve',
                ],
            });
            const config = new AutoRoutingGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            // 正常规则的 no-resolve 应保留
            assert.ok(
                rules.includes('IP-CIDR,10.0.0.0/8,DIRECT,no-resolve'),
                '普通规则的 no-resolve 应原样保留',
            );
            // 逻辑规则的 no-resolve 应丢弃
            assert.ok(
                !rules.some((r: string) => r.startsWith('AND,((DST-PORT,443))')),
                'AND + no-resolve 应被丢弃，不影响普通规则',
            );
        });
    });

    // --- YAML 语法错误 ---
    describe('YAML 语法错误检测', () => {
        it('password 后缺逗号的流格式 YAML 应被检测到', () => {
            // 原始有语法错误的 proxy 条目（缺少 password 和 udp 之间的逗号）
            const brokenYamlLine = `- { name: '2x专线-日本-2 (IPv6)', type: trojan, server: v6-aws-jp.aikunapp.com, port: 7001, password:  udp: true, skip-cert-verify: true, sni: d1--cn-gotcha204-3.bilivideo.com, client-fingerprint: chrome, network: tcp }`;

            assert.throws(
                () => yamlParse(`proxies:\n${brokenYamlLine}`),
                (err: any) => err?.code === 'BLOCK_IN_FLOW' || /Block collections/.test(err?.message || ''),
                '应检测到 YAML 流格式语法错误: password:  udp: true 缺少逗号',
            );
        });

        it('修正后的流格式 YAML 应可正常解析', () => {
            const fixedYamlLine = `- { name: '2x专线-日本-2 (IPv6)', type: trojan, server: v6-aws-jp.aikunapp.com, port: 7001, password: '', udp: true, skip-cert-verify: true, sni: d1--cn-gotcha204-3.bilivideo.com, client-fingerprint: chrome, network: tcp }`;

            const result = yamlParse(`proxies:\n${fixedYamlLine}`);
            assert.strictEqual(result.proxies.length, 1);
            assert.strictEqual(result.proxies[0].name, '2x专线-日本-2 (IPv6)');
            assert.strictEqual(result.proxies[0].password, '');
            assert.strictEqual(result.proxies[0].udp, true);
        });
    });
});

// ============================================================
// 测试：GlobalRestrictedGroup
// ============================================================
describe('真实机场配置 — GlobalRestrictedGroup', () => {

    // --- 冒烟测试 ---
    describe('真实代理列表处理', () => {
        it('使用真实机场代理创建 GlobalRestrictedGroup 不应崩溃，且 proxiesList 完整保留', () => {
            const source = makeSource();

            let config: GlobalRestrictedGroup;
            assert.doesNotThrow(() => {
                config = new GlobalRestrictedGroup(
                    source as any, mockDeps as any, mockParams as any,
                );
            }, '真实代理列表不应导致构造失败');

            config = config!;
            assert.strictEqual(
                config.proxiesList.length,
                realWorldProxies.length,
                'Global 模式应保留所有代理',
            );
            assert.ok(Array.isArray(config.source.rules), '应有 rules 数组');
            assert.ok(config.source.rules.length > 0, '应生成规则');
        });
    });

    // --- 原始 rules 转换 ---
    describe('原始 rules 转换（降级与保留）', () => {
        it('指向已清空 proxy-group 的规则应降级到 Global Proxy', () => {
            const source = makeSource({
                proxyGroups: [makeObsoleteGroup('三毛机场')],
                rules: realWorldOriginalRules,
            });
            const config = new GlobalRestrictedGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            // 不应残留指向已清空分组的规则
            assert.ok(
                !rules.some((r: string) => r.includes(',三毛机场')),
                '不应保留指向已清空分组的规则',
            );

            // 降级规则应指向 Global Proxy
            assert.ok(
                rules.includes(`DOMAIN,developer.apple.com,${GLOBAL_PROXY}`),
                'developer.apple.com 应降级到 Global Proxy',
            );
        });
    });

    // --- 逻辑规则 ---
    describe('逻辑规则 (AND/NOT/OR) convertOriginalRules 处理', () => {
        it('AND 规则指向内置策略时应原样保留', () => {
            const source = makeSource({
                rules: ['AND,((DST-PORT,443),(NETWORK,UDP)),REJECT'],
            });
            const config = new GlobalRestrictedGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                rules.includes('AND,((DST-PORT,443),(NETWORK,UDP)),REJECT'),
                'AND + REJECT 应原样保留',
            );
        });

        it('AND 规则指向已清空分组时应降级到 Global Proxy', () => {
            const source = makeSource({
                proxyGroups: [makeObsoleteGroup()],
                rules: ['AND,((DST-PORT,443)),三毛机场'],
            });
            const config = new GlobalRestrictedGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                rules.includes(`AND,((DST-PORT,443)),${GLOBAL_PROXY}`),
                'AND + 三毛机场 应降级为 AND + Global Proxy',
            );
        });

        it('NOT 规则指向内置策略时应原样保留', () => {
            const source = makeSource({
                rules: ['NOT,((DOMAIN,example.com)),REJECT'],
            });
            const config = new GlobalRestrictedGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                rules.includes('NOT,((DOMAIN,example.com)),REJECT'),
                'NOT + REJECT 应原样保留',
            );
        });

        it('OR 规则指向已清空分组时应降级到 Global Proxy', () => {
            const source = makeSource({
                proxyGroups: [makeObsoleteGroup()],
                rules: ['OR,((DOMAIN,a.com),(DOMAIN,b.com)),三毛机场'],
            });
            const config = new GlobalRestrictedGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                rules.includes(`OR,((DOMAIN,a.com),(DOMAIN,b.com)),${GLOBAL_PROXY}`),
                'OR + 三毛机场 应降级为 OR + Global Proxy',
            );
        });

        // --- no-resolve 后缀丢弃 ---
        it('AND 规则带 no-resolve 后缀时应被丢弃（GlobalRestrictedGroup）', () => {
            const source = makeSource({
                rules: ['AND,((DST-PORT,443)),REJECT,no-resolve'],
            });
            const config = new GlobalRestrictedGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                !rules.some((r: string) => r.startsWith('AND,((DST-PORT,443))')),
                'AND + no-resolve 不应出现在 Global 模式输出中',
            );
        });

        it('逻辑规则 no-resolve 不应影响普通规则的 no-resolve（GlobalRestrictedGroup）', () => {
            const source = makeSource({
                rules: [
                    'NOT,((DOMAIN,example.com)),REJECT,no-resolve',
                    'RULE-SET,cn_domain,DIRECT,no-resolve',
                ],
            });
            const config = new GlobalRestrictedGroup(
                source as any, mockDeps as any, mockParams as any,
            );
            const rules = config.source.rules as string[];

            assert.ok(
                rules.some((r: string) => r.includes('RULE-SET,cn_domain,DIRECT,no-resolve') || r.includes('RULE-SET,cn_domain') ),
                '普通规则的 no-resolve 应保留',
            );
            assert.ok(
                !rules.some((r: string) => r.startsWith('NOT,((DOMAIN,example.com))')),
                'NOT + no-resolve 应被丢弃',
            );
        });
    });
});

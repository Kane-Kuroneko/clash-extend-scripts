# AI 分流规则修复记录

## 结论

OpenAI / ChatGPT 域名漏到 `MATCH` 的根因不是“已有 GitHub 规则被媒体过滤器过滤掉”，而是当前工程接入的规则源没有提供独立 AI 服务规则；RFM 项目虽然提供 `openai`、`anthropic`、`gemini` 等独立规则集，但本工程当前只接入了它的 basic `gfw.yaml`，没有接入 universal AI 规则集。

本次修复采用本地稳定域名清单生成 `DOMAIN-SUFFIX,...,🖥 AI` 规则，并把 AI 规则放在通用 GFW / Microsoft / Proxy 规则之前，避免将来上游通用规则新增 `openai.com` 或 `microsoft.com` 相关命中时抢先分流。

## 规则源核对

当前工程配置的 GitHub 规则源来自：

- `Loyalsoldier/clash-rules@release/gfw.txt`
- `Loyalsoldier/clash-rules@release/proxy.txt`
- `xixu-me/RFM@basic/yaml/gfw.yaml`
- `zhanyeye/clash-rules-lite@main/microsoft-rules.txt`

核对结果：

- `Loyalsoldier` 的 `gfw.txt` / `proxy.txt` 当前没有命中 `openai`、`sentinel.openai.com`、`cdn.openai.com`、`auth.openai.com`、`bzrcdn.openai.com`。
- `zhanyeye` 的 `microsoft-rules.txt` 是 Microsoft 通用规则，不覆盖 OpenAI / ChatGPT 域名。
- `xixu-me/RFM` 的 README 明确列出了 `RULE-SET,openai,OpenAI`，以及 `openai.mrs`、`anthropic.mrs`、`google-gemini.mrs` 等 provider；但这些位于 universal 服务规则集，当前工程未接入。

因此这些域名原先在 auto-routing 中没有服务级 AI 规则可命中，最后会继续向后匹配，最差情况下落到 `MATCH,🐟 Final`。

另外，集成测试暴露了两个独立遮蔽问题：

- 订阅原始配置中的 `MATCH,DIRECT` 会被前置保留下来，导致 auto-routing 后续生成的 AI / GFW / Microsoft / Proxy 规则全部不可达。
- 订阅原始配置中的 `DOMAIN-SUFFIX,google.com,GLOBAL` 会先于 `gemini.google.com` 的 AI 规则命中，导致 Gemini 走通用代理组而不是 AI 组。

这些问题会让“已经生成了 AI 规则”仍然表现为漏到 `MATCH` 或误入其他通用分组。修复后，原始 `MATCH` 不再合并进生成规则，原始订阅规则整体降级为 AI 服务规则之后的兼容补充。

## 修复点

- 新增 `CompileTimeScripts/fetch-rules/ai-services.ts`，维护主流 AI 厂商的稳定域名入口。
- `fetchRules()` 增加 `AI` 编译期规则。
- `AutoRoutingConfig.buildRules()` 将 AI 规则插入到通用 GFW / Microsoft / Proxy 规则之前。
- auto-routing / global-proxy 都丢弃原始配置中的 `MATCH`，避免它遮蔽当前模式生成的后续规则；auto-routing 中的原始订阅规则放到 AI 服务规则之后。
- 集成测试不再只检查规则字符串存在，而是模拟 Clash 从上到下的首条规则匹配，断言主流 AI 域名首条命中 `🖥 AI`，且不会落到 `MATCH`。
- 单元测试增加 AI 优先级断言，覆盖 `openai.com` 同时存在于 GFW 规则时的遮蔽风险。

## 说明

`sentinel.openai.com`、`cdn.openai.com`、`auth.openai.com`、`bzrcdn.openai.com` 都可被 `DOMAIN-SUFFIX,openai.com,🖥 AI` 覆盖；测试仍显式列出这些主机名，是为了验证真实首条匹配结果，而不是要求为每个子域名维护重复规则。

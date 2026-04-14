# 测试快速参考

## 🚀 常用命令

```bash
# 构建所有产物
npm run build:all

# 运行所有测试
npm test

# 构建 + 测试（完整流程）
npm run test:all
```

## 📋 测试分类

| 命令 | 说明 | 测试数量 |
|------|------|---------|
| `npm run test:build` | 构建产物验证 | 16个 |
| `npm run test:logic` | 业务逻辑测试 | 7个 |
| `npm run test:main` | Main函数导出验证 | 13个 |
| `npm test` | 运行所有测试 | 36个 |

## ✅ 测试检查清单

每次修改代码后：

- [ ] 运行 `npm run build:all` 重新构建
- [ ] 运行 `npm test` 验证所有测试通过
- [ ] 检查测试输出，确保没有失败

## 🎯 测试覆盖

### 客户端
- ✅ CFW (Clash for Windows)
- ✅ CVR (Clash Verge)
- ✅ Clash Party (Mihomo Party)

### 模式
- ✅ global-proxy (全局代理)
- ✅ auto-routing (自动路由)

### 验证项
- ✅ 构建产物存在性和完整性
- ✅ 业务逻辑正确性
- ✅ CVR/Clash Party 顶层 main 函数
- ✅ 严格模式兼容性
- ✅ 回归测试

## 📊 当前状态

```
✅ 36/36 测试通过
✅ 0 失败
✅ 100% 通过率
```

## 🔧 故障排除

### 测试失败？
1. 检查构建是否成功: `npm run build:all`
2. 查看具体失败信息
3. 检查 dist 目录是否有对应产物

### 需要调试？
```bash
# 运行单个测试文件
tsx --test tests/build-validation.test.ts
```

## 📖 更多信息

- 详细文档: `tests/README.md`
- 测试总结: `tests/TEST_SUMMARY.md`

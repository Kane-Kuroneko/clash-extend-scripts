# TODO & Work Session Log

## 2026-04-15: Git 历史敏感信息清理与远程仓库配置

### 已完成任务

#### 1. 敏感信息检查与清理
- ✅ 检查 Git 历史记录中的敏感信息
- ✅ 发现真实代理服务器密码：`a3fae92f-dee0-4807-9363-739f8090df7e`
- ✅ 发现代理服务器地址：`abondon.hefnfnwbbsbehgshes.com`
- ✅ 使用 `git filter-branch` 从历史中清除敏感文件
- ✅ 清理 Git 备份引用和垃圾回收
- ✅ 验证敏感信息已完全清除

**清除的文件：**
- `src/assets/DuangCloud-Config.js`
- `src/assets/duangcloud-rules.js`

**保留的文件：**
- 测试文件中的测试密码（test-password, test）- 安全
- VPN-Server 配置文件 - 从未被提交过

#### 2. 远程仓库配置
- ✅ 添加远程仓库：`git@github.com:Kane-Kuroneko/clash-extend-scripts.git`
- ✅ 推送 master 分支到远端
- ✅ 设置上游分支跟踪

---

### 待处理任务

#### 🔲 私有配置文件管理方案

**需求：**
- 将敏感文件（VPN 配置等）存储到仓库中但对公众不可见
- 实现自动化私有文件的版本控制

**考虑的方案：**

1. **GitHub Secrets + GitHub Actions（推荐）**
   - 将配置文件编码为 Base64 存储在 GitHub Secrets 中
   - 使用 GitHub Actions 工作流在 CI/CD 时解码并生成文件
   - 优点：完全私有、自动化、安全
   - 注意：单个 Secret 限制 64 KB

2. **Git Submodule**
   - 创建私有仓库存储敏感文件
   - 在公开仓库中通过 submodule 引用
   - 优点：完全隔离、可控访问权限
   - 缺点：需要维护两个仓库

3. **加密存储（git-crypt / SOPS）**
   - 加密敏感文件后提交到仓库
   - 有密钥的人才能查看
   - 优点：文件在仓库中但已加密
   - 缺点：需要管理加密密钥

**下一步行动：**
- [ ] 确认配置文件大小
- [ ] 选择最终方案
- [ ] 实施选定的方案
- [ ] 创建 GitHub Actions 工作流（如选择方案 1）
- [ ] 测试自动化流程

---

### 技术笔记

#### Git 历史清理命令
```bash
# 使用 filter-branch 删除文件
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch <file-path>' \
  --prune-empty --tag-name-filter cat -- --all

# 清理备份引用
rm -rf .git/refs/original/

# 清理 reflog
git reflog expire --expire=now --all

# 垃圾回收
git gc --prune=now --aggressive

# 验证清理结果
git log --all -p | grep -c "<sensitive-data>"
```

#### GitHub Secrets 使用示例
```bash
# 编码文件为 Base64
cat <file> | base64 -w 0

# 在 GitHub 设置中添加 Secret
# Settings → Secrets and variables → Actions → New repository secret
```

---

### 参考资料
- [Git Filter Branch 文档](https://git-scm.com/docs/git-filter-branch)
- [GitHub Secrets 文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

# 部署指南

## 方式一：手动创建 GitHub 仓库（推荐）

1. **访问 GitHub**
   - 打开 https://github.com/new
   - 登录你的 GitHub 账号

2. **创建新仓库**
   - Repository name: `xiaohongshu-bomb-finder`
   - Description: 小红书爆款文章查找工具 - 发现低粉高赞的优质内容
   - 选择 **Private** 或 **Public**（根据你的需求）
   - **不要** 勾选 "Add a README file"
   - **不要** 选择 .gitignore 模板
   - **不要** 选择许可证
   - 点击 "Create repository"

3. **推送代码到 GitHub**
   ```bash
   cd /Users/cayden/.jvs/.openclaw/workspace/xiaohongshu-bomb-finder
   
   # 如果之前添加了错误的 remote，先删除
   git remote remove origin 2>/dev/null || true
   
   # 添加正确的 remote（替换 cayden 为你的 GitHub 用户名）
   git remote add origin git@github.com:cayden/xiaohongshu-bomb-finder.git
   
   # 推送到 GitHub
   git push -u origin main
   ```

4. **完成！**
   - 访问 https://github.com/cayden/xiaohongshu-bomb-finder
   - 你的代码已经成功上传

## 方式二：使用 GitHub CLI

如果你安装了 GitHub CLI：

```bash
# 创建仓库
gh repo create xiaohongshu-bomb-finder --private --source=. --remote=origin --push
```

## 安装到 Chrome

1. **打开 Chrome 扩展管理页面**
   - 地址：`chrome://extensions/`
   - 或者：菜单 → 更多工具 → 扩展程序

2. **启用开发者模式**
   - 点击右上角的"开发者模式"开关

3. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择 `xiaohongshu-bomb-finder` 文件夹
   - 或者从 GitHub 下载后解压

4. **开始使用**
   - 访问 https://www.xiaohongshu.com
   - 点击浏览器工具栏中的插件图标
   - 输入关键词开始搜索爆款文章

## 常见问题

### Q: 推送时出现权限错误？
A: 确保：
- GitHub 用户名正确
- SSH key 已添加到 GitHub（https://github.com/settings/keys）
- 或者使用 HTTPS 方式：`git remote add origin https://github.com/cayden/xiaohongshu-bomb-finder.git`

### Q: 如何更新插件？
A: 
```bash
# 修改代码后
git add -A
git commit -m "feat: 更新说明"
git push
```

然后在 Chrome 扩展页面点击"刷新"按钮重新加载扩展。

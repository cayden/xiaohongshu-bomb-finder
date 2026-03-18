# 🔥 小红书爆款 finder

一个 Chrome 扩展，帮助你在小红书网页版上快速发现**低粉高赞**的爆款文章。

## ✨ 功能特点

- 🎯 **智能识别**：自动分析文章的点赞数、收藏数与作者粉丝数的比例
- 🔥 **爆款标注**：用不同颜色高亮标注超爆款和潜力爆款文章
- 📊 **实时统计**：显示当前页面的爆款发现率和统计数据
- 💾 **数据导出**：一键导出爆款文章数据为 CSV 文件
- ⚙️ **灵活配置**：可自定义爆款判定标准（点赞/粉丝比、收藏/粉丝比等）

## 📦 安装方法

### 方法一：从 Chrome 网上应用店安装（推荐）
> 待发布

### 方法二：开发者模式安装

1. **下载插件**
   ```bash
   git clone https://github.com/cayden/xiaohongshu-bomb-finder.git
   cd xiaohongshu-bomb-finder
   ```

2. **打开 Chrome 扩展管理页面**
   - 地址栏输入：`chrome://extensions/`
   - 或者：菜单 → 更多工具 → 扩展程序

3. **启用开发者模式**
   - 点击右上角的"开发者模式"开关

4. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择 `xiaohongshu-bomb-finder` 文件夹

5. **安装完成**
   - 扩展图标会出现在 Chrome 工具栏

## 🚀 使用指南

### 基本使用

1. **访问小红书**
   - 打开 [小红书官网](https://www.xiaohongshu.com)
   - 登录你的账号

2. **搜索关键词**
   - 在小红书搜索框输入你想查找的关键词（如：护肤、穿搭、美食）
   - 或者点击插件图标，在 popup 中输入关键词

3. **查看爆款标注**
   - 插件会自动分析搜索结果页面
   - **红色边框 + 🔥** = 超爆款文章（点赞/粉丝比 ≥ 10 且 收藏/粉丝比 ≥ 5）
   - **橙色边框 + ⭐** = 潜力爆款文章

4. **导出数据**
   - 点击页面右上角的火焰按钮打开控制面板
   - 点击"导出数据"按钮，下载 CSV 文件

### 自定义爆款标准

点击插件图标，在设置面板中可以调整：

- **点赞/粉丝比**：默认 10（即点赞数是粉丝数的 10 倍）
- **收藏/粉丝比**：默认 5
- **最少点赞数**：默认 100

## 🎨 界面说明

### Popup 界面
- 关键词输入框
- 搜索按钮
- 爆款判定标准设置
- 状态提示

### 页面控制面板
- 总笔记数统计
- 爆款文章数量
- 发现率百分比
- 导出数据按钮
- 清除标注按钮

## 📁 项目结构

```
xiaohongshu-bomb-finder/
├── manifest.json          # Chrome 扩展配置文件
├── popup.html             # 弹出窗口界面
├── src/
│   ├── popup.js           # Popup 逻辑
│   ├── content.js         # 页面注入脚本（核心功能）
│   ├── content.css        # 页面标注样式
│   └── background.js      # 后台服务脚本
├── icons/
│   ├── icon16.png         # 16x16 图标
│   ├── icon48.png         # 48x48 图标
│   └── icon128.png        # 128x128 图标
├── package.json           # Node.js 项目配置
└── README.md              # 项目说明文档
```

## 🔧 技术实现

### 爆款判定算法

```javascript
// 超爆款条件
likeToFansRatio >= 10 && 
collectToFansRatio >= 5 && 
likes >= 100

// 潜力爆款条件
(likeToFansRatio >= 7 || collectToFansRatio >= 3.5) && 
likes >= 50
```

### 核心功能

- **Content Script**：注入到小红书页面，解析 DOM 提取文章数据
- **MutationObserver**：监听页面变化，动态加载内容
- **Chrome Storage**：保存用户设置
- **Message Passing**：Popup 与 Content Script 通信

## ⚠️ 注意事项

1. **数据准确性**
   - 粉丝数、点赞数等数据依赖小红书页面的显示
   - 如果页面结构变化，可能需要更新解析逻辑

2. **使用限制**
   - 仅在小红书搜索结果页面有效
   - 需要登录小红书账号才能查看完整数据

3. **隐私安全**
   - 插件不会收集或上传任何用户数据
   - 所有数据处理都在本地完成

## 🐛 常见问题

### Q: 插件没有反应？
A: 请尝试以下步骤：
1. 刷新小红书页面
2. 检查是否在正确的域名（www.xiaohongshu.com）
3. 在 `chrome://extensions/` 中重新启用插件

### Q: 标注显示不正确？
A: 可能是小红书页面结构更新了，请：
1. 检查浏览器控制台是否有错误信息
2. 提交 Issue 并附上错误日志

### Q: 导出的 CSV 是乱码？
A: 请使用支持 UTF-8 的编辑器打开，如：
- VS Code
- Numbers
- Google Sheets

## 📝 更新日志

### v1.0.0 (2026-03-18)
- ✨ 初始版本发布
- 🔥 爆款文章识别和标注
- 📊 实时统计面板
- 💾 CSV 数据导出
- ⚙️ 可配置的判定标准

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [GitHub 仓库](https://github.com/cayden/xiaohongshu-bomb-finder)
- [Chrome 网上应用店](待发布)

---

**Made with ❤️ for 小红书 content creators**

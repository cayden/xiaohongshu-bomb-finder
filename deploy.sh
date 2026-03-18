#!/bin/bash
# 小红书爆款 finder - 快速部署脚本

echo "🔥 小红书爆款 finder - GitHub 部署助手"
echo ""

# 检查 gh 是否安装
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) 未安装"
    echo ""
    echo "请先安装 GitHub CLI:"
    echo "  brew install gh"
    echo ""
    echo "或者手动创建仓库:"
    echo "  1. 访问 https://github.com/new"
    echo "  2. 仓库名：xiaohongshu-bomb-finder"
    echo "  3. 创建后运行：git push -u origin main"
    exit 1
fi

# 检查是否已登录
echo "检查 GitHub 登录状态..."
if ! gh auth status &> /dev/null; then
    echo "❌ 未登录 GitHub"
    echo ""
    echo "正在启动登录流程..."
    gh auth login
fi

# 检查 remote
echo ""
echo "检查 Git remote 配置..."
if ! git remote get-url origin &> /dev/null; then
    echo "创建 remote origin..."
    git remote add origin git@github.com:cayden/xiaohongshu-bomb-finder.git
fi

# 尝试创建仓库
echo ""
echo "尝试创建 GitHub 仓库..."
gh repo create cayden/xiaohongshu-bomb-finder --private --source=. --remote=origin --push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 部署成功!"
    echo ""
    echo "仓库地址：https://github.com/cayden/xiaohongshu-bomb-finder"
    echo ""
    echo "安装到 Chrome:"
    echo "  1. 访问 chrome://extensions/"
    echo "  2. 开启「开发者模式」"
    echo "  3. 点击「加载已解压的扩展程序」"
    echo "  4. 选择本项目的文件夹"
else
    echo ""
    echo "❌ 自动创建失败"
    echo ""
    echo "请手动创建仓库:"
    echo "  1. 访问 https://github.com/new"
    echo "  2. 仓库名：xiaohongshu-bomb-finder"
    echo "  3. 选择 Public 或 Private"
    echo "  4. 创建后运行：git push -u origin main"
fi

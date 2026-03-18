#!/bin/bash
# 使用 macOS 系统工具创建简单的图标

cd /Users/cayden/.jvs/.openclaw/workspace/xiaohongshu-bomb-finder/icons

# 使用 sips 创建简单的彩色图标（如果没有现成的图片工具，创建占位符）
# 创建一个 128x128 的红色正方形 PNG
echo "Creating placeholder icons..."

# 使用 ImageMagick 如果可用
if command -v convert &> /dev/null; then
    convert -size 128x128 xc:'#ff2442' -gravity center -pointsize 60 -fill white -annotate 0 '🔥' icon128.png
    convert -size 48x48 xc:'#ff2442' -gravity center -pointsize 24 -fill white -annotate 0 '🔥' icon48.png
    convert -size 16x16 xc:'#ff2442' -gravity center -pointsize 10 -fill white -annotate 0 '🔥' icon16.png
    echo "Icons created with ImageMagick"
else
    # 创建简单的纯色 PNG（使用 base64 编码的 1x1 红色像素，然后缩放）
    # 这里我们使用一个简化的方法：创建 SVG 并转换
    
    # 创建 SVG 图标
    cat > icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="56" fill="#ff2442"/>
  <text x="64" y="78" font-size="60" text-anchor="middle" fill="white">🔥</text>
</svg>
EOF
    
    # 尝试使用 rsvg-convert
    if command -v rsvg-convert &> /dev/null; then
        rsvg-convert -w 128 -h 128 icon.svg -o icon128.png
        rsvg-convert -w 48 -h 48 icon.svg -o icon48.png
        rsvg-convert -w 16 -h 16 icon.svg -o icon16.png
        rm icon.svg
        echo "Icons created with rsvg-convert"
    else
        echo "No image conversion tools available. Please install ImageMagick or librsvg."
        echo "For now, creating placeholder files..."
        touch icon16.png icon48.png icon128.png
    fi
fi

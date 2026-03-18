#!/usr/bin/env python3
# 生成简单的红色圆形图标

from PIL import Image, ImageDraw

sizes = [16, 48, 128]

for size in sizes:
    # 创建圆形背景
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 绘制红色圆形
    margin = size // 8
    draw.ellipse([margin, margin, size - margin, size - margin], 
                 fill=(255, 36, 66, 255))  # 小红书红色
    
    # 绘制火焰 emoji 或文字
    if size >= 48:
        # 绘制"爆"字
        try:
            font_size = size // 2
            # 使用默认字体
            draw.text((size//2, size//2), '🔥', 
                     fill=(255, 255, 255, 255),
                     anchor='mm',
                     font_size=font_size//2)
        except:
            # 如果字体加载失败，只绘制圆形
            pass
    
    # 保存
    img.save(f'/Users/cayden/.jvs/.openclaw/workspace/xiaohongshu-bomb-finder/icons/icon{size}.png')
    print(f'Generated icon{size}.png')

print('All icons generated!')

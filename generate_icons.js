const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [16, 48, 128];

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 清空画布
  ctx.clearRect(0, 0, size, size);
  
  // 绘制红色圆形背景
  const margin = size / 8;
  const radius = (size - 2 * margin) / 2;
  const centerX = size / 2;
  const centerY = size / 2;
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ff2442';
  ctx.fill();
  
  // 绘制火焰 emoji
  ctx.font = `${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🔥', centerX, centerY);
  
  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icons/icon${size}.png`, buffer);
  console.log(`Generated icon${size}.png`);
});

console.log('All icons generated!');

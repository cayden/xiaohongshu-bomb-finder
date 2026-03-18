// Background Service Worker - 处理扩展后台逻辑

// 安装时初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('小红书爆款 finder 已安装', details);
  
  // 设置默认配置
  chrome.storage.sync.set({
    likeRatio: 10,
    collectRatio: 5,
    minLikes: 100
  });
});

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVersion') {
    sendResponse({ version: chrome.runtime.getManifest().version });
  }
  return true;
});

// 扩展图标点击时（可选：打开小红书搜索页）
chrome.action.onClicked.addListener(async (tab) => {
  // 如果当前不在小红书，打开小红书
  if (!tab.url || !tab.url.includes('xiaohongshu.com')) {
    chrome.tabs.create({
      url: 'https://www.xiaohongshu.com/search'
    });
  }
});

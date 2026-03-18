// Popup 主逻辑
document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.getElementById('searchBtn');
  const keywordInput = document.getElementById('keyword');
  const likeRatioInput = document.getElementById('likeRatio');
  const collectRatioInput = document.getElementById('collectRatio');
  const minLikesInput = document.getElementById('minLikes');
  const statusDiv = document.getElementById('status');

  // 加载保存的设置
  chrome.storage.sync.get(['likeRatio', 'collectRatio', 'minLikes'], (result) => {
    if (result.likeRatio) likeRatioInput.value = result.likeRatio;
    if (result.collectRatio) collectRatioInput.value = result.collectRatio;
    if (result.minLikes) minLikesInput.value = result.minLikes;
  });

  // 保存设置
  function saveSettings() {
    chrome.storage.sync.set({
      likeRatio: parseInt(likeRatioInput.value) || 10,
      collectRatio: parseInt(collectRatioInput.value) || 5,
      minLikes: parseInt(minLikesInput.value) || 100
    });
  }

  // 监听设置变化
  [likeRatioInput, collectRatioInput, minLikesInput].forEach(input => {
    input.addEventListener('change', saveSettings);
  });

  // 搜索按钮点击
  searchBtn.addEventListener('click', async () => {
    const keyword = keywordInput.value.trim();
    
    if (!keyword) {
      showStatus('请输入搜索关键词', 'error');
      return;
    }

    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('无法获取当前标签页', 'error');
      return;
    }

    // 检查是否在小红书网站
    if (!tab.url || !tab.url.includes('xiaohongshu.com')) {
      showStatus('请先访问小红书网站 (www.xiaohongshu.com)', 'error');
      return;
    }

    // 保存设置
    saveSettings();

    // 发送消息到 content script
    try {
      showStatus('正在搜索...', 'info');
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'search',
        keyword: keyword,
        settings: {
          likeRatio: parseInt(likeRatioInput.value) || 10,
          collectRatio: parseInt(collectRatioInput.value) || 5,
          minLikes: parseInt(minLikesInput.value) || 100
        }
      });

      if (response && response.success) {
        showStatus(`找到 ${response.bombCount} 篇爆款文章！`, 'success');
      } else {
        showStatus(response?.message || '搜索完成', 'info');
      }
    } catch (error) {
      console.error('Error:', error);
      showStatus('请刷新小红书页面后重试', 'error');
    }
  });

  // 显示状态消息
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // 3 秒后自动隐藏
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
});

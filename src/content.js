// 小红书爆款文章检测 - Content Script

(function() {
  'use strict';

  // 防止重复注入
  if (window.xhsBombFinderInjected) {
    return;
  }
  window.xhsBombFinderInjected = true;

  // 存储找到的爆款文章
  let bombArticles = [];
  let controlPanel = null;

  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'search') {
      handleSearch(request.keyword, request.settings)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, message: error.message }));
      return true; // 保持消息通道开放以发送异步响应
    }
  });

  // 处理搜索请求
  async function handleSearch(keyword, settings) {
    showLoading(true);
    
    try {
      // 等待页面加载
      await waitForElement('.search-result-container, .notes-container', 5000);
      
      // 解析所有笔记卡片
      const notes = parseNotesFromPage();
      
      // 分析爆款文章
      bombArticles = analyzeBombs(notes, settings);
      
      // 高亮标注
      highlightBombs(bombArticles);
      
      // 显示控制面板
      showControlPanel(bombArticles.length, notes.length);
      
      showLoading(false);
      
      return {
        success: true,
        bombCount: bombArticles.length,
        totalNotes: notes.length
      };
    } catch (error) {
      console.error('搜索失败:', error);
      showLoading(false);
      return {
        success: false,
        message: '分析失败：' + error.message
      };
    }
  }

  // 从页面解析笔记数据
  function parseNotesFromPage() {
    const notes = [];
    
    // 小红书搜索结果中的笔记卡片选择器
    const noteSelectors = [
      '.search-result-container .note-item',
      '.notes-container .note-item',
      '[data-type="note"]',
      '.note-container'
    ];
    
    let noteElements = [];
    for (const selector of noteSelectors) {
      noteElements = document.querySelectorAll(selector);
      if (noteElements.length > 0) break;
    }
    
    if (noteElements.length === 0) {
      // 尝试更通用的选择器
      noteElements = document.querySelectorAll('[class*="note"], [class*="Note"]');
    }
    
    noteElements.forEach((element, index) => {
      try {
        const noteData = extractNoteData(element, index);
        if (noteData) {
          notes.push(noteData);
        }
      } catch (error) {
        console.warn('解析笔记失败:', error);
      }
    });
    
    return notes;
  }

  // 提取单个笔记的数据
  function extractNoteData(element, index) {
    const data = {
      id: index,
      element: element,
      title: '',
      author: '',
      authorFans: 0,
      likes: 0,
      collects: 0,
      comments: 0
    };
    
    // 提取标题
    const titleEl = element.querySelector('h3, [class*="title"], [class*="Title"]');
    if (titleEl) {
      data.title = titleEl.textContent.trim();
    }
    
    // 提取作者信息
    const authorEl = element.querySelector('[class*="author"], [class*="Author"], [class*="nickname"]');
    if (authorEl) {
      data.author = authorEl.textContent.trim();
    }
    
    // 提取粉丝数
    const fansEl = element.querySelector('[class*="fans"], [class*="Fans"]');
    if (fansEl) {
      const fansText = fansEl.textContent.trim();
      data.authorFans = parseNumber(fansText);
    }
    
    // 提取点赞数
    const likeEl = element.querySelector('[class*="like"], [class*="Like"]');
    if (likeEl) {
      const likeText = likeEl.textContent.trim();
      data.likes = parseNumber(likeText);
    }
    
    // 提取收藏数
    const collectEl = element.querySelector('[class*="collect"], [class*="Collect"], [class*="star"]');
    if (collectEl) {
      const collectText = collectEl.textContent.trim();
      data.collects = parseNumber(collectText);
    }
    
    // 提取评论数
    const commentEl = element.querySelector('[class*="comment"], [class*="Comment"]');
    if (commentEl) {
      const commentText = commentEl.textContent.trim();
      data.comments = parseNumber(commentText);
    }
    
    return data;
  }

  // 解析数字（处理 1.2 万、12.3k 等格式）
  function parseNumber(text) {
    if (!text) return 0;
    
    // 移除表情符号和非数字字符（保留小数点和中文单位）
    const cleaned = text.replace(/[👍⭐💬❤️]/g, '').trim();
    
    // 处理中文单位
    if (cleaned.includes('万')) {
      const num = parseFloat(cleaned.replace('万', ''));
      return Math.round(num * 10000);
    }
    
    if (cleaned.includes('千')) {
      const num = parseFloat(cleaned.replace('千', ''));
      return Math.round(num * 1000);
    }
    
    // 处理英文单位
    if (cleaned.toLowerCase().includes('k')) {
      const num = parseFloat(cleaned.toLowerCase().replace('k', ''));
      return Math.round(num * 1000);
    }
    
    // 纯数字
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num);
  }

  // 分析爆款文章
  function analyzeBombs(notes, settings) {
    const { likeRatio, collectRatio, minLikes } = settings;
    const bombs = [];
    
    notes.forEach(note => {
      // 跳过数据不完整的笔记
      if (note.likes === 0) return;
      
      // 计算比率（如果粉丝数为 0，设为 1 避免除零）
      const fans = note.authorFans || 1;
      const likeToFansRatio = note.likes / fans;
      const collectToFansRatio = note.collects / fans;
      
      // 计算综合得分
      let score = 0;
      let isSuperBomb = false;
      let isPotentialBomb = false;
      
      // 超爆款：点赞/粉丝比 >= 设定值 且 收藏/粉丝比 >= 设定值 且 点赞数 >= 最小值
      if (likeToFansRatio >= likeRatio && 
          collectToFansRatio >= collectRatio && 
          note.likes >= minLikes) {
        isSuperBomb = true;
        score = likeToFansRatio * 0.6 + collectToFansRatio * 0.4;
      }
      // 潜力爆款：满足任一比率条件
      else if ((likeToFansRatio >= likeRatio * 0.7 || 
                collectToFansRatio >= collectRatio * 0.7) && 
               note.likes >= minLikes * 0.5) {
        isPotentialBomb = true;
        score = likeToFansRatio * 0.5 + collectToFansRatio * 0.3;
      }
      
      if (isSuperBomb || isPotentialBomb) {
        bombs.push({
          ...note,
          isSuperBomb,
          isPotentialBomb,
          score,
          likeToFansRatio,
          collectToFansRatio
        });
      }
    });
    
    // 按得分排序
    bombs.sort((a, b) => b.score - a.score);
    
    return bombs;
  }

  // 高亮标注爆款文章
  function highlightBombs(bombs) {
    // 先清除之前的标注
    clearHighlights();
    
    bombs.forEach(bomb => {
      const element = bomb.element;
      if (!element) return;
      
      // 添加对应的样式类
      if (bomb.isSuperBomb) {
        element.classList.add('xhs-bomb-super');
      } else if (bomb.isPotentialBomb) {
        element.classList.add('xhs-bomb-potential');
      }
      
      // 添加数据标签
      const badge = document.createElement('div');
      badge.className = 'xhs-bomb-badge';
      badge.textContent = `👍 ${formatNumber(bomb.likes)} | ⭐ ${formatNumber(bomb.collects)}`;
      element.style.position = 'relative';
      element.appendChild(badge);
    });
  }

  // 清除之前的标注
  function clearHighlights() {
    document.querySelectorAll('.xhs-bomb-super, .xhs-bomb-potential, .xhs-bomb-badge').forEach(el => {
      el.classList.remove('xhs-bomb-super', 'xhs-bomb-potential');
      if (el.classList.contains('xhs-bomb-badge')) {
        el.remove();
      }
    });
  }

  // 显示控制面板
  function showControlPanel(bombCount, totalCount) {
    // 移除旧的控制面板
    if (controlPanel) {
      controlPanel.remove();
    }
    
    // 创建切换按钮
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'xhs-bomb-toggle';
    toggleBtn.textContent = '🔥';
    toggleBtn.title = '爆款统计';
    toggleBtn.onclick = () => {
      if (controlPanel) {
        controlPanel.style.display = controlPanel.style.display === 'none' ? 'block' : 'none';
      }
    };
    document.body.appendChild(toggleBtn);
    
    // 创建控制面板
    controlPanel = document.createElement('div');
    controlPanel.className = 'xhs-bomb-control-panel';
    controlPanel.innerHTML = `
      <h3>爆款统计</h3>
      <div class="xhs-bomb-stats">
        <div class="xhs-bomb-stat-item">
          <span class="xhs-bomb-stat-label">总笔记数</span>
          <span class="xhs-bomb-stat-value">${totalCount}</span>
        </div>
        <div class="xhs-bomb-stat-item">
          <span class="xhs-bomb-stat-label">🔥 超爆款</span>
          <span class="xhs-bomb-stat-value">${bombCount}</span>
        </div>
        <div class="xhs-bomb-stat-item">
          <span class="xhs-bomb-stat-label">发现率</span>
          <span class="xhs-bomb-stat-value">${totalCount > 0 ? ((bombCount / totalCount) * 100).toFixed(1) : 0}%</span>
        </div>
      </div>
      <div class="xhs-bomb-actions">
        <button class="xhs-bomb-btn xhs-bomb-btn-primary" onclick="window.xhsBombFinder.exportData()">导出数据</button>
        <button class="xhs-bomb-btn xhs-bomb-btn-secondary" onclick="window.xhsBombFinder.clearHighlights()">清除标注</button>
      </div>
    `;
    document.body.appendChild(controlPanel);
    
    // 导出功能
    window.xhsBombFinder = {
      exportData: () => exportBombData(bombs),
      clearHighlights: () => {
        clearHighlights();
        if (controlPanel) controlPanel.remove();
        if (toggleBtn) toggleBtn.remove();
      }
    };
  }

  // 导出爆款数据
  function exportBombData(bombs) {
    const csvContent = [
      ['标题', '作者', '粉丝数', '点赞数', '收藏数', '评论数', '点赞/粉丝比', '收藏/粉丝比', '类型'],
      ...bombs.map(bomb => [
        bomb.title,
        bomb.author,
        bomb.authorFans,
        bomb.likes,
        bomb.collects,
        bomb.comments,
        bomb.likeToFansRatio.toFixed(2),
        bomb.collectToFansRatio.toFixed(2),
        bomb.isSuperBomb ? '超爆款' : '潜力爆款'
      ])
    ].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `小红书爆款_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  // 显示/隐藏加载动画
  function showLoading(show) {
    let loadingEl = document.querySelector('.xhs-bomb-loading');
    
    if (show && !loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.className = 'xhs-bomb-loading';
      loadingEl.innerHTML = `
        <div class="xhs-bomb-loading-spinner"></div>
        <div class="xhs-bomb-loading-text">正在分析爆款文章...</div>
      `;
      document.body.appendChild(loadingEl);
    } else if (!show && loadingEl) {
      loadingEl.remove();
    }
  }

  // 等待元素出现
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error('等待元素超时'));
      }, timeout);
    });
  }

  // 格式化数字
  function formatNumber(num) {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  console.log('🔥 小红书爆款 finder 已注入');
})();

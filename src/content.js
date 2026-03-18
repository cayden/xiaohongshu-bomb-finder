// 小红书爆款文章检测 - Content Script
// 适配小红书实际页面结构

(function() {
  'use strict';

  // 防止重复注入
  if (window.xhsBombFinderInjected) {
    return;
  }
  window.xhsBombFinderInjected = true;

  console.log('🔥 小红书爆款 finder 已注入');

  // 存储找到的爆款文章
  let bombArticles = [];
  let controlPanel = null;
  let noteDataCache = new Map();

  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'search') {
      handleSearch(request.settings)
        .then(result => sendResponse(result))
        .catch(error => {
          console.error('搜索错误:', error);
          sendResponse({ success: false, message: error.message });
        });
      return true;
    }
  });

  // 处理搜索请求
  async function handleSearch(settings) {
    showLoading(true);
    
    try {
      // 等待页面加载
      await waitForElement('.reds-note-card', 8000);
      
      // 解析所有笔记卡片
      const notes = parseNotesFromPage();
      
      console.log(`找到 ${notes.length} 篇笔记`);
      
      if (notes.length === 0) {
        showLoading(false);
        return {
          success: false,
          message: '未找到笔记，请确保已在小红书搜索页面'
        };
      }
      
      // 尝试获取互动数据（从页面或 API）
      await fetchInteractionData(notes);
      
      // 分析爆款文章
      bombArticles = analyzeBombs(notes, settings);
      
      console.log(`找到 ${bombArticles.length} 篇爆款`);
      
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
    
    // 小红书实际的卡片选择器
    const noteElements = document.querySelectorAll('.reds-note-card');
    
    noteElements.forEach((element, index) => {
      try {
        const noteData = extractNoteData(element, index);
        if (noteData) {
          notes.push(noteData);
          noteDataCache.set(noteData.id, noteData);
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
      id: element.id || `note_${index}`,
      element: element,
      title: '',
      author: '',
      authorFans: 0,
      likes: 0,
      collects: 0,
      comments: 0,
      url: ''
    };
    
    // 提取标题
    const titleEl = element.querySelector('.reds-note-title');
    if (titleEl) {
      data.title = titleEl.textContent.trim();
    }
    
    // 提取作者信息
    const authorEl = element.querySelector('.reds-note-user');
    if (authorEl) {
      // 尝试从 img 的 name 属性或 alt 属性获取作者名
      const imgEl = authorEl.querySelector('img');
      if (imgEl) {
        data.author = imgEl.getAttribute('name') || imgEl.getAttribute('alt') || authorEl.textContent.trim();
      } else {
        data.author = authorEl.textContent.trim();
      }
    }
    
    // 提取笔记链接
    const linkEl = element.querySelector('a');
    if (linkEl) {
      data.url = linkEl.href;
    } else {
      // 尝试从父级查找链接
      const parentLink = element.closest('a');
      if (parentLink) {
        data.url = parentLink.href;
      }
    }
    
    // 注意：搜索卡片上不显示互动数据，需要后续获取
    return data;
  }

  // 获取互动数据（尝试从多种来源）
  async function fetchInteractionData(notes) {
    // 方法 1：尝试从页面已有的数据属性中获取
    notes.forEach(note => {
      const element = note.element;
      
      // 尝试从 data 属性获取
      const likeData = element.querySelector('[class*="like"] [class*="count"], [class*="interact"]');
      if (likeData) {
        note.likes = parseNumber(likeData.textContent);
      }
      
      const collectData = element.querySelector('[class*="collect"], [class*="star"], [class*="mark"]');
      if (collectData) {
        note.collects = parseNumber(collectData.textContent);
      }
    });
    
    // 方法 2：监听网络请求（如果可能）
    // 由于内容脚本限制，这里主要依赖页面已有的数据
    
    // 方法 3：对于没有数据的笔记，使用估算或标记为"需要查看详情"
    notes.forEach(note => {
      if (note.likes === 0 && note.url) {
        // 标记为需要进一步分析
        note.needsDetailFetch = true;
      }
    });
  }

  // 分析爆款文章
  function analyzeBombs(notes, settings) {
    const { likeRatio, collectRatio, minLikes } = settings;
    const bombs = [];
    
    notes.forEach(note => {
      // 跳过没有互动数据的笔记
      if (note.likes === 0 && !note.needsDetailFetch) return;
      
      // 如果需要获取详情数据，暂时跳过或标记
      if (note.needsDetailFetch) {
        // 可以标记为"待分析"
        return;
      }
      
      // 计算比率（如果粉丝数为 0，设为 1 避免除零）
      const fans = note.authorFans || 1;
      const likeToFansRatio = note.likes / fans;
      const collectToFansRatio = note.collects / fans;
      
      // 计算综合得分
      let score = 0;
      let isSuperBomb = false;
      let isPotentialBomb = false;
      
      // 超爆款判定
      if (likeToFansRatio >= likeRatio && 
          collectToFansRatio >= collectRatio && 
          note.likes >= minLikes) {
        isSuperBomb = true;
        score = likeToFansRatio * 0.6 + collectToFansRatio * 0.4;
      }
      // 潜力爆款判定
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
    
    // 标记需要进一步分析的笔记
    const needsAnalysis = document.querySelectorAll('.reds-note-card');
    needsAnalysis.forEach(el => {
      if (!el.classList.contains('xhs-bomb-super') && 
          !el.classList.contains('xhs-bomb-potential')) {
        el.classList.add('xhs-bomb-pending');
      }
    });
  }

  // 清除之前的标注
  function clearHighlights() {
    document.querySelectorAll('.xhs-bomb-super, .xhs-bomb-potential, .xhs-bomb-badge').forEach(el => {
      el.classList.remove('xhs-bomb-super', 'xhs-bomb-potential', 'xhs-bomb-pending');
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
      <div style="margin-top:10px;font-size:11px;color:#999;">
        💡 提示：搜索卡片不显示互动数据，请点击笔记查看详情
      </div>
    `;
    document.body.appendChild(controlPanel);
    
    // 导出功能
    window.xhsBombFinder = {
      exportData: () => exportBombData(bombArticles),
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
      ['标题', '作者', '粉丝数', '点赞数', '收藏数', '评论数', '点赞/粉丝比', '收藏/粉丝比', '类型', 'URL'],
      ...bombs.map(bomb => [
        bomb.title,
        bomb.author,
        bomb.authorFans,
        bomb.likes,
        bomb.collects,
        bomb.comments,
        bomb.likeToFansRatio.toFixed(2),
        bomb.collectToFansRatio.toFixed(2),
        bomb.isSuperBomb ? '超爆款' : '潜力爆款',
        bomb.url
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
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else {
          reject(new Error(`等待元素超时：${selector}`));
        }
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

  // 解析数字（处理 1.2 万、12.3k 等格式）
  function parseNumber(text) {
    if (!text) return 0;
    
    // 移除表情符号和非数字字符
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

})();

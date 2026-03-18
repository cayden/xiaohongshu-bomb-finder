// 小红书爆款文章检测 - Content Script
// 适配小红书实际页面结构 - 支持搜索页和详情页

(function() {
  'use strict';

  // 防止重复注入
  if (window.xhsBombFinderInjected) {
    return;
  }
  window.xhsBombFinderInjected = true;

  console.log('🔥 小红书爆款 finder 已注入');

  // 存储当前笔记数据
  let currentNoteData = null;
  let analysisResult = null;

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
    
    if (request.action === 'analyze') {
      // 分析当前详情页笔记
      analyzeCurrentNote(request.settings)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, message: error.message }));
      return true;
    }
  });

  // 处理搜索请求（搜索页面）
  async function handleSearch(settings) {
    showLoading(true);
    
    try {
      // 检查是搜索页还是详情页
      const isSearchPage = window.location.pathname.includes('/search');
      
      if (isSearchPage) {
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
        
        // 在搜索页面，标注所有笔记为"待分析"状态
        highlightNotesForAnalysis(notes);
        
        showLoading(false);
        
        return {
          success: true,
          bombCount: 0,
          totalNotes: notes.length,
          message: `已标注 ${notes.length} 篇笔记，请点击笔记查看详情获取完整数据`
        };
      } else {
        // 详情页 - 分析当前笔记
        return await analyzeCurrentNote(settings);
      }
    } catch (error) {
      console.error('搜索失败:', error);
      showLoading(false);
      return {
        success: false,
        message: '分析失败：' + error.message
      };
    }
  }

  // 从页面解析笔记数据（搜索页）
  function parseNotesFromPage() {
    const notes = [];
    const noteElements = document.querySelectorAll('.reds-note-card');
    
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
      const imgEl = authorEl.querySelector('img');
      if (imgEl) {
        data.author = imgEl.getAttribute('name') || imgEl.getAttribute('alt') || authorEl.textContent.trim();
      } else {
        data.author = authorEl.textContent.trim();
      }
    }
    
    // 提取笔记链接
    const linkEl = element.closest('a');
    if (linkEl) {
      data.url = linkEl.href;
    }
    
    return data;
  }

  // 在搜索页标注所有笔记
  function highlightNotesForAnalysis(notes) {
    // 清除之前的标注
    clearHighlights();
    
    notes.forEach((note, index) => {
      const element = note.element;
      if (!element) return;
      
      // 添加待分析样式
      element.classList.add('xhs-bomb-pending');
      
      // 添加序号标签
      const badge = document.createElement('div');
      badge.className = 'xhs-bomb-badge xhs-bomb-badge-pending';
      badge.textContent = `📝 ${index + 1}`;
      badge.title = '点击查看详情获取完整数据';
      element.style.position = 'relative';
      element.appendChild(badge);
    });
    
    // 显示提示面板
    showSearchTips(notes.length);
  }

  // 分析当前详情页笔记
  async function analyzeCurrentNote(settings) {
    showLoading(true);
    
    try {
      // 等待详情页加载
      await waitForElement('[class*="note-content"], [class*="detail"]', 5000);
      
      // 提取当前笔记的完整数据
      const noteData = extractDetailNoteData();
      
      if (!noteData) {
        showLoading(false);
        return {
          success: false,
          message: '无法获取笔记数据'
        };
      }
      
      // 分析是否为爆款
      const analysis = analyzeBomb(noteData, settings);
      analysisResult = analysis;
      
      // 标注当前笔记
      highlightDetailNote(analysis);
      
      showLoading(false);
      
      return {
        success: true,
        noteData: noteData,
        analysis: analysis,
        message: analysis.isSuperBomb ? '🔥 这是一篇超爆款笔记！' : 
                 analysis.isPotentialBomb ? '⭐ 这是一篇潜力爆款笔记！' : 
                 '📄 普通笔记'
      };
    } catch (error) {
      console.error('详情页分析失败:', error);
      showLoading(false);
      return {
        success: false,
        message: '分析失败：' + error.message
      };
    }
  }

  // 从详情页提取笔记数据
  function extractDetailNoteData() {
    const data = {
      id: getCurrentNoteId(),
      title: '',
      author: '',
      authorFans: 0,
      likes: 0,
      collects: 0,
      comments: 0,
      url: window.location.href
    };
    
    // 提取标题
    const titleEl = document.querySelector('h1, [class*="title"]');
    if (titleEl) {
      data.title = titleEl.textContent.trim();
    }
    
    // 提取作者信息
    const authorEl = document.querySelector('[class*="author"], [class*="user-info"]');
    if (authorEl) {
      data.author = authorEl.textContent.trim();
    }
    
    // 提取粉丝数
    const fansEl = document.querySelector('[class*="fans"], [class*="follower"]');
    if (fansEl) {
      data.authorFans = parseNumber(fansEl.textContent);
    }
    
    // 提取点赞数
    const likeEl = document.querySelector('[class*="like"] [class*="count"], [class*="interact"]');
    if (likeEl) {
      data.likes = parseNumber(likeEl.textContent);
    }
    
    // 提取收藏数
    const collectEl = document.querySelector('[class*="collect"], [class*="star"], [class*="mark"]');
    if (collectEl) {
      data.collects = parseNumber(collectEl.textContent);
    }
    
    // 提取评论数
    const commentEl = document.querySelector('[class*="comment"] [class*="count"]');
    if (commentEl) {
      data.comments = parseNumber(commentEl.textContent);
    }
    
    return data;
  }

  // 获取当前笔记 ID
  function getCurrentNoteId() {
    // 从 URL 提取
    const match = window.location.href.match(/\/note\/(\w+)/);
    if (match) {
      return match[1];
    }
    // 或从页面元素提取
    const noteEl = document.querySelector('[id^="note-"], [data-note-id]');
    if (noteEl) {
      return noteEl.id || noteEl.dataset.noteId;
    }
    return `detail_${Date.now()}`;
  }

  // 分析是否为爆款
  function analyzeBomb(note, settings) {
    const { likeRatio, collectRatio, minLikes } = settings;
    
    // 如果没有粉丝数，无法计算比率
    if (note.authorFans === 0) {
      return {
        ...note,
        isSuperBomb: false,
        isPotentialBomb: false,
        score: 0,
        likeToFansRatio: 0,
        collectToFansRatio: 0,
        message: '无法获取作者粉丝数'
      };
    }
    
    const likeToFansRatio = note.likes / note.authorFans;
    const collectToFansRatio = note.collects / note.authorFans;
    
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
    
    return {
      ...note,
      isSuperBomb,
      isPotentialBomb,
      score,
      likeToFansRatio,
      collectToFansRatio
    };
  }

  // 标注详情页笔记
  function highlightDetailNote(analysis) {
    // 找到笔记容器
    const noteContainer = document.querySelector('article, [class*="note-container"], [class*="detail"]') || document.body;
    
    // 清除之前的标注
    document.querySelectorAll('.xhs-bomb-detail-badge').forEach(el => el.remove());
    noteContainer.classList.remove('xhs-bomb-super', 'xhs-bomb-potential');
    
    // 添加标注
    const badge = document.createElement('div');
    badge.className = 'xhs-bomb-detail-badge';
    
    if (analysis.isSuperBomb) {
      noteContainer.classList.add('xhs-bomb-super');
      badge.innerHTML = `
        <div style="font-size:24px;margin-bottom:8px;">🔥</div>
        <div style="font-weight:600;margin-bottom:4px;">超爆款</div>
        <div style="font-size:12px;">👍 ${formatNumber(analysis.likes)}</div>
        <div style="font-size:12px;">⭐ ${formatNumber(analysis.collects)}</div>
        <div style="font-size:11px;color:#ff2442;">点赞/粉丝比：${analysis.likeToFansRatio.toFixed(1)}</div>
      `;
    } else if (analysis.isPotentialBomb) {
      noteContainer.classList.add('xhs-bomb-potential');
      badge.innerHTML = `
        <div style="font-size:24px;margin-bottom:8px;">⭐</div>
        <div style="font-weight:600;margin-bottom:4px;">潜力爆款</div>
        <div style="font-size:12px;">👍 ${formatNumber(analysis.likes)}</div>
        <div style="font-size:12px;">⭐ ${formatNumber(analysis.collects)}</div>
      `;
    } else {
      badge.innerHTML = `
        <div style="font-size:20px;margin-bottom:8px;">📄</div>
        <div style="font-weight:600;">普通笔记</div>
        <div style="font-size:11px;color:#999;">点赞/粉丝比：${analysis.likeToFansRatio.toFixed(2)}</div>
      `;
    }
    
    badge.style.cssText = 'position:fixed;top:80px;right:20px;background:white;padding:16px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:9999;width:160px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
    document.body.appendChild(badge);
  }

  // 显示搜索页提示
  function showSearchTips(totalNotes) {
    // 移除旧的提示
    document.querySelectorAll('.xhs-bomb-search-tip').forEach(el => el.remove());
    
    const tip = document.createElement('div');
    tip.className = 'xhs-bomb-search-tip';
    tip.innerHTML = `
      <div style="font-weight:600;margin-bottom:8px;">📋 已标注 ${totalNotes} 篇笔记</div>
      <div style="font-size:12px;color:#666;margin-bottom:12px;">
        灰色虚线框 = 待分析<br>
        请点击笔记进入详情页获取完整数据
      </div>
      <div style="font-size:11px;color:#999;">
        💡 提示：在详情页点击插件图标可分析当前笔记
      </div>
    `;
    tip.style.cssText = 'position:fixed;top:80px;right:20px;background:white;padding:16px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:9999;width:240px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
    document.body.appendChild(tip);
  }

  // 清除标注
  function clearHighlights() {
    document.querySelectorAll('.xhs-bomb-super, .xhs-bomb-potential, .xhs-bomb-pending, .xhs-bomb-badge, .xhs-bomb-detail-badge, .xhs-bomb-search-tip').forEach(el => {
      el.classList.remove('xhs-bomb-super', 'xhs-bomb-potential', 'xhs-bomb-pending');
      if (el.classList.contains('xhs-bomb-badge') || 
          el.classList.contains('xhs-bomb-detail-badge') ||
          el.classList.contains('xhs-bomb-search-tip')) {
        el.remove();
      }
    });
  }

  // 显示/隐藏加载动画
  function showLoading(show) {
    let loadingEl = document.querySelector('.xhs-bomb-loading');
    
    if (show && !loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.className = 'xhs-bomb-loading';
      loadingEl.innerHTML = `
        <div class="xhs-bomb-loading-spinner"></div>
        <div class="xhs-bomb-loading-text">正在分析...</div>
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

  // 解析数字
  function parseNumber(text) {
    if (!text) return 0;
    const cleaned = text.replace(/[👍⭐💬❤️]/g, '').trim();
    
    if (cleaned.includes('万')) {
      const num = parseFloat(cleaned.replace('万', ''));
      return Math.round(num * 10000);
    }
    if (cleaned.includes('千')) {
      const num = parseFloat(cleaned.replace('千', ''));
      return Math.round(num * 1000);
    }
    if (cleaned.toLowerCase().includes('k')) {
      const num = parseFloat(cleaned.toLowerCase().replace('k', ''));
      return Math.round(num * 1000);
    }
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num);
  }

})();

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
      // 小红书详情页不需要等待特定元素，直接尝试获取数据
      // 等待一小段时间让页面渲染
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 提取当前笔记的完整数据
      const noteData = extractDetailNoteData();
      
      console.log('📥 提取到的数据:', noteData);
      
      if (!noteData.title && noteData.likes === 0) {
        showLoading(false);
        return {
          success: false,
          message: '无法获取笔记数据，请确保已在笔记详情页'
        };
      }
      
      // 分析是否为爆款
      const analysis = analyzeBomb(noteData, settings);
      analysisResult = analysis;
      
      // 输出调试信息
      console.log('🔍 笔记数据:', noteData);
      console.log('📊 分析结果:', analysis);
      
      // 标注当前笔记
      highlightDetailNote(analysis);
      
      showLoading(false);
      
      return {
        success: true,
        noteData: noteData,
        analysis: analysis,
        message: analysis.isSuperBomb ? '🔥 这是一篇超爆款笔记！' : 
                 analysis.isPotentialBomb ? '⭐ 这是一篇潜力爆款笔记！' : 
                 noteData.likes > 0 ? '📄 普通笔记' : '⚠️ 数据不完整'
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
    
    // 提取标题 - 多种选择器
    const titleSelectors = [
      'h1',
      '[class*="title"]',
      '[class*="Title"]',
      '[class*="note-title"]',
      '.reds-note-title',
      '[data-v-] h1',
      'article h1'
    ];
    for (const selector of titleSelectors) {
      const titleEl = document.querySelector(selector);
      if (titleEl && titleEl.textContent.trim()) {
        data.title = titleEl.textContent.trim();
        break;
      }
    }
    
    // 提取作者信息和粉丝数
    const authorSelectors = [
      '[class*="author"]',
      '[class*="user-info"]',
      '[class*="nickname"]',
      '[class*="user"]',
      '.reds-note-user'
    ];
    for (const selector of authorSelectors) {
      const authorEl = document.querySelector(selector);
      if (authorEl) {
        const text = authorEl.textContent.trim();
        if (text) {
          data.author = text;
          // 尝试从作者文本中提取粉丝数（如 "DJ 伦 10 万+"）
          const fansMatch = text.match(/(\d+(?:\.\d+)?[万千 kK 万+]+)/);
          if (fansMatch) {
            data.authorFans = parseNumber(fansMatch[0]);
          }
        }
        if (data.authorFans > 0) break;
      }
    }
    
    // 提取点赞数 - 查找包含"赞"字的按钮或元素
    const likeButtons = Array.from(document.querySelectorAll('button, [role="button"], div[class*="interact"]'));
    const likeButton = likeButtons.find(btn => {
      const text = btn.textContent;
      return text.includes('赞') || text.includes('👍') || text.includes('❤');
    });
    if (likeButton) {
      const countEl = likeButton.querySelector('.count, [class*="count"]') || likeButton;
      data.likes = parseNumber(countEl.textContent);
    }
    
    // 提取收藏数 - 查找包含"收藏"或"⭐"的按钮
    const collectButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const collectButton = collectButtons.find(btn => {
      const text = btn.textContent;
      return text.includes('收藏') || text.includes('⭐') || text.includes('★');
    });
    if (collectButton) {
      const countEl = collectButton.querySelector('.count, [class*="count"]') || collectButton;
      data.collects = parseNumber(countEl.textContent);
    }
    
    // 提取评论数 - 查找包含"评论"的按钮
    const commentButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const commentButton = commentButtons.find(btn => {
      const text = btn.textContent;
      return text.includes('评论') || text.includes('💬');
    });
    if (commentButton) {
      const countEl = commentButton.querySelector('.count, [class*="count"]') || commentButton;
      data.comments = parseNumber(countEl.textContent);
    }
    
    // 如果上面方法都没找到，尝试从页面所有.count 元素中提取
    if (data.likes === 0 || data.collects === 0 || data.comments === 0) {
      const countElements = document.querySelectorAll('.count');
      countElements.forEach(el => {
        const text = el.textContent.trim();
        const num = parseNumber(text);
        if (num > 0) {
          // 根据父级元素判断类型
          const parent = el.closest('button, [role="button"], div');
          const parentText = parent?.textContent || '';
          if (data.likes === 0 && (parentText.includes('赞') || parentText.includes('👍'))) {
            data.likes = num;
          } else if (data.collects === 0 && (parentText.includes('收藏') || parentText.includes('⭐'))) {
            data.collects = num;
          } else if (data.comments === 0 && (parentText.includes('评论') || parentText.includes('💬'))) {
            data.comments = num;
          }
        }
      });
    }
    
    return data;
  }

  // 获取当前笔记 ID
  function getCurrentNoteId() {
    // 从 URL 提取
    const match = window.location.href.match(/\/note\/(\w+)/) || 
                  window.location.href.match(/\/explore\/(\w+)/);
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
    // 清除之前的标注
    document.querySelectorAll('.xhs-bomb-detail-badge').forEach(el => el.remove());
    
    // 创建标注徽章
    const badge = document.createElement('div');
    badge.className = 'xhs-bomb-detail-badge';
    
    if (analysis.isSuperBomb) {
      badge.innerHTML = `
        <div style="font-size:24px;margin-bottom:8px;">🔥</div>
        <div style="font-weight:600;margin-bottom:4px;color:#ff2442;">超爆款</div>
        <div style="font-size:12px;">👍 ${formatNumber(analysis.likes)}</div>
        <div style="font-size:12px;">⭐ ${formatNumber(analysis.collects)}</div>
        <div style="font-size:11px;color:#666;margin-top:8px;">粉丝：${formatNumber(analysis.authorFans)}</div>
        <div style="font-size:10px;color:#ff2442;margin-top:4px;">比值：${analysis.likeToFansRatio.toFixed(1)}x</div>
      `;
    } else if (analysis.isPotentialBomb) {
      badge.innerHTML = `
        <div style="font-size:24px;margin-bottom:8px;">⭐</div>
        <div style="font-weight:600;margin-bottom:4px;color:#ff9500;">潜力爆款</div>
        <div style="font-size:12px;">👍 ${formatNumber(analysis.likes)}</div>
        <div style="font-size:12px;">⭐ ${formatNumber(analysis.collects)}</div>
        <div style="font-size:11px;color:#666;margin-top:8px;">粉丝：${formatNumber(analysis.authorFans)}</div>
      `;
    } else {
      badge.innerHTML = `
        <div style="font-size:20px;margin-bottom:8px;">📄</div>
        <div style="font-weight:600;color:#666;">普通笔记</div>
        <div style="font-size:11px;color:#999;margin-top:8px;">👍 ${formatNumber(analysis.likes)}</div>
        <div style="font-size:11px;color:#999;">粉丝：${formatNumber(analysis.authorFans)}</div>
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

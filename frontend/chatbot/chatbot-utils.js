/**
 * ============================================================================
 * CHATBOT UTILITIES MODULE (chatbot-utils.js)
 * ============================================================================
 * Helper functions for Markdown parsing, XSS sanitization, LocalStorage management,
 * Clipboard copying, Chat Export, and Accessibility utilities.
 * ============================================================================
 */

export const ChatUtils = {
  /**
   * Escape HTML to prevent XSS attacks before formatting markdown
   */
  escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Simple, fast Markdown & Code Block Parser with syntax highlighting tags
   */
  parseMarkdown(text) {
    if (!text) return '';

    // Step 1: Code blocks with language and copy button placeholder
    let codeBlockRegex = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
    let codeBlocks = [];

    let processedText = text.replace(codeBlockRegex, (match, lang, code) => {
      let id = 'cb_' + Math.random().toString(36).substring(2, 9);
      let language = lang || 'code';
      let escapedCode = this.escapeHTML(code.trim());
      
      codeBlocks.push({
        id: id,
        html: `<div class="cb-code-block" id="${id}">
                <div class="cb-code-header">
                  <span class="cb-code-lang">${language}</span>
                  <button class="cb-copy-btn" onclick="window.CampusChatbot.copyCodeBlock('${id}')" title="Copy code">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                  </button>
                </div>
                <pre class="cb-code-pre"><code>${escapedCode}</code></pre>
              </div>`
      });
      return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
    });

    // Step 2: Escape remaining HTML
    processedText = this.escapeHTML(processedText);

    // Step 3: Inline Code
    processedText = processedText.replace(/`([^`]+)`/g, '<code class="cb-inline-code">$1</code>');

    // Step 4: Headers (# Heading)
    processedText = processedText.replace(/^### (.*$)/gim, '<h3 class="cb-h3">$1</h3>');
    processedText = processedText.replace(/^## (.*$)/gim, '<h2 class="cb-h2">$1</h2>');
    processedText = processedText.replace(/^# (.*$)/gim, '<h1 class="cb-h1">$1</h1>');

    // Step 5: Bold and Italic
    processedText = processedText.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    processedText = processedText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    processedText = processedText.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    processedText = processedText.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Step 6: Bullet lists (lines starting with • or - or *)
    processedText = processedText.replace(/^[\s]*[•\-\*]\s+(.*)$/gim, '<li class="cb-li">$1</li>');
    processedText = processedText.replace(/(<li class="cb-li">.*<\/li>\n?)+/g, '<ul class="cb-ul">$&</ul>');

    // Step 7: Paragraphs / Newlines
    let paragraphs = processedText.split(/\n\n+/);
    processedText = paragraphs.map(p => {
      if (p.startsWith('<ul') || p.startsWith('<h1') || p.startsWith('<h2') || p.startsWith('<h3') || p.includes('___CODE_BLOCK_')) {
        return p;
      }
      return `<p class="cb-p">${p.replace(/\n/g, '<br/>')}</p>`;
    }).join('');

    // Step 8: Re-insert code blocks
    codeBlocks.forEach((cb, index) => {
      processedText = processedText.replace(`___CODE_BLOCK_${index}___`, cb.html);
    });

    return processedText;
  },

  /**
   * Format timestamp e.g. 10:45 AM
   */
  getFormattedTime(date = new Date()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  /**
   * Format date e.g. Jul 23, 2026
   */
  getFormattedDate(date = new Date()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  },

  /**
   * Save array of message objects to LocalStorage
   */
  saveToStorage(storageKey, data) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('CampusChatbot: LocalStorage write failed', e);
    }
  },

  /**
   * Read data from LocalStorage
   */
  loadFromStorage(storageKey, defaultValue = null) {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      console.warn('CampusChatbot: LocalStorage read failed', e);
      return defaultValue;
    }
  },

  /**
   * Copy plain text to user clipboard with visual feedback
   */
  async copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  },

  /**
   * Export conversation to file (.txt or .json)
   */
  exportChatHistory(messages, filename = 'campus_chat_history.txt') {
    if (!messages || messages.length === 0) return;

    let content = `====================================================\n`;
    content += `APEX CAMPUS AI CHATBOT - CONVERSATION EXPORT\n`;
    content += `Exported On: ${new Date().toLocaleString()}\n`;
    content += `====================================================\n\n`;

    messages.forEach(m => {
      const sender = m.sender === 'user' ? 'STUDENT' : 'CAMPUS AI';
      content += `[${m.timestamp || ''}] ${sender}:\n${m.text}\n\n----------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

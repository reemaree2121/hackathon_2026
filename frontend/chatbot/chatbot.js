/**
 * ============================================================================
 * MAIN CHATBOT CONTROLLER MODULE (chatbot.js)
 * ============================================================================
 * Renders the floating widget, manages chat UI state, handles typing animations,
 * suggestion chips, keyboard shortcuts (ESC, Enter), dark/light mode, and local history.
 * ============================================================================
 */

import { CollegeData } from './chatbot-data.js';
import { ChatUtils } from './chatbot-utils.js';
import { ChatbotAPI } from './chatbot-api.js';

class CampusChatbotController {
  constructor() {
    this.isOpen = false;
    this.isMaximized = false;
    this.isGenerating = false;
    this.activeTheme = 'light';
    this.activePage = 'Dashboard';
    this.userProfile = CollegeData.defaultStudentProfile;
    this.messages = [];
    this.storageKey = 'campus_ai_chat_history_v1';
    this.elements = {};
  }

  /**
   * Initialize Chatbot into the page DOM
   */
  init(options = {}) {
    if (options.provider) ChatbotAPI.setConfig({ provider: options.provider });
    if (options.apiKey) ChatbotAPI.setConfig({ apiKey: options.apiKey });
    if (options.userProfile) this.userProfile = { ...this.userProfile, ...options.userProfile };
    if (options.activePage) this.activePage = options.activePage;
    if (options.theme) this.activeTheme = options.theme;

    // Load history or insert default greeting
    const stored = ChatUtils.loadFromStorage(this.storageKey, null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      this.messages = stored;
    } else {
      this.messages = [
        {
          id: 'welcome_1',
          sender: 'bot',
          text: `👋 **Good Day, ${this.userProfile.name.split(' ')[0]}!**\n\nI am **CampusAI**, your 24/7 Virtual Assistant for **${CollegeData.institution.name}**.\n\nHow can I assist you with your **Attendance**, **Timetable**, **Events**, **Library**, or **Placements** today?`,
          timestamp: ChatUtils.getFormattedTime()
        }
      ];
    }

    this.renderDOM();
    this.bindEvents();
    this.setTheme(this.activeTheme);

    // Global reference for onclick handlers inside parsed markdown
    window.CampusChatbot = this;

    console.log('[CampusChatbot] Successfully initialized and mounted into DOM.');
  }

  /**
   * Render HTML widget structure
   */
  renderDOM() {
    // Remove old wrapper if re-initializing
    const oldWrapper = document.getElementById('cb-app-wrapper');
    if (oldWrapper) oldWrapper.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'cb-app-wrapper';
    wrapper.className = 'cb-app-wrapper';

    wrapper.innerHTML = `
      <!-- MAIN CHAT WIDGET WINDOW -->
      <div id="cb-widget-container" class="cb-widget-container" role="dialog" aria-label="Campus AI Chatbot">
        
        <!-- HEADER BAR -->
        <div class="cb-header">
          <div class="cb-header-info">
            <div class="cb-avatar-wrapper">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z"></path>
                <path d="m8 10 4 4 4-4"></path>
              </svg>
              <span class="cb-status-dot"></span>
            </div>
            <div class="cb-header-text">
              <h3>Campus AI <span style="font-size: 10px; padding: 2px 6px; background: rgba(99, 102, 241, 0.15); color: #4f46e5; border-radius: 6px;">Active</span></h3>
              <p id="cb-header-subtitle">Assistant • ${CollegeData.institution.name}</p>
            </div>
          </div>

          <div class="cb-header-controls">
            <button class="cb-icon-btn" id="cb-theme-btn" title="Toggle Dark/Light Mode">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            </button>
            <button class="cb-icon-btn" id="cb-export-btn" title="Export Conversation">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
            <button class="cb-icon-btn" id="cb-clear-btn" title="Clear Chat History">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
            <button class="cb-icon-btn" id="cb-maximize-btn" title="Expand Window">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            </button>
            <button class="cb-icon-btn" id="cb-close-btn" title="Close Chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <!-- MESSAGES BODY -->
        <div id="cb-body" class="cb-body"></div>

        <!-- QUICK ACTION SUGGESTION CHIPS -->
        <div id="cb-chips-wrapper" class="cb-chips-wrapper">
          <button class="cb-chip-btn" data-query="Today's Timetable">🗓️ Today's Timetable</button>
          <button class="cb-chip-btn" data-query="Show attendance">📊 Attendance</button>
          <button class="cb-chip-btn" data-query="Upcoming Events">🎉 Upcoming Events</button>
          <button class="cb-chip-btn" data-query="Library books">📚 Library Dues</button>
          <button class="cb-chip-btn" data-query="Who is my mentor?">👨‍🏫 My Mentor</button>
          <button class="cb-chip-btn" data-query="Placement drives">💼 Placements</button>
        </div>

        <!-- INPUT FOOTER -->
        <div class="cb-footer">
          <form id="cb-input-form" class="cb-input-form">
            <textarea id="cb-textarea" class="cb-textarea" placeholder="Ask about attendance, timetable, events..." rows="1" aria-label="Type your message"></textarea>
            <button id="cb-send-btn" type="submit" class="cb-send-btn" aria-label="Send message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
          <div class="cb-footer-tagline">Powered by Apex AI • Shift+Enter for new line</div>
        </div>
      </div>

      <!-- FLOATING TRIGGER BUTTON -->
      <button id="cb-floating-btn" class="cb-floating-btn" aria-label="Open AI Assistant">
        <svg class="cb-icon-chat" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <svg class="cb-icon-close" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    document.body.appendChild(wrapper);

    // Store references
    this.elements = {
      wrapper,
      container: wrapper.querySelector('#cb-widget-container'),
      floatingBtn: wrapper.querySelector('#cb-floating-btn'),
      body: wrapper.querySelector('#cb-body'),
      form: wrapper.querySelector('#cb-input-form'),
      textarea: wrapper.querySelector('#cb-textarea'),
      sendBtn: wrapper.querySelector('#cb-send-btn'),
      themeBtn: wrapper.querySelector('#cb-theme-btn'),
      clearBtn: wrapper.querySelector('#cb-clear-btn'),
      exportBtn: wrapper.querySelector('#cb-export-btn'),
      maximizeBtn: wrapper.querySelector('#cb-maximize-btn'),
      closeBtn: wrapper.querySelector('#cb-close-btn'),
      chipsWrapper: wrapper.querySelector('#cb-chips-wrapper'),
      headerSubtitle: wrapper.querySelector('#cb-header-subtitle')
    };

    this.renderMessages();
  }

  /**
   * Bind DOM Events & Keyboard Shortcuts
   */
  bindEvents() {
    const { floatingBtn, closeBtn, form, textarea, themeBtn, clearBtn, exportBtn, maximizeBtn, chipsWrapper } = this.elements;

    // Toggle open/close
    floatingBtn.addEventListener('click', () => this.toggle());
    closeBtn.addEventListener('click', () => this.close());

    // Theme toggle
    themeBtn.addEventListener('click', () => {
      this.activeTheme = this.activeTheme === 'light' ? 'dark' : 'light';
      this.setTheme(this.activeTheme);
    });

    // Clear chat
    clearBtn.addEventListener('click', () => this.clearChat());

    // Export conversation
    exportBtn.addEventListener('click', () => this.exportChat());

    // Maximize / Restore
    maximizeBtn.addEventListener('click', () => {
      this.isMaximized = !this.isMaximized;
      this.elements.container.classList.toggle('cb-maximized', this.isMaximized);
    });

    // Form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleUserSubmit();
    });

    // Textarea enter & auto-resize
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleUserSubmit();
      }
    });

    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    });

    // Suggestion chip clicks
    chipsWrapper.addEventListener('click', (e) => {
      const btn = e.target.closest('.cb-chip-btn');
      if (btn) {
        const query = btn.getAttribute('data-query');
        if (query) {
          textarea.value = query;
          this.handleUserSubmit();
        }
      }
    });

    // Keyboard Shortcuts (ESC to close)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Toggle Chat Window Visibility
   */
  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.elements.wrapper.classList.add('cb-active');
    this.scrollToBottom();
    setTimeout(() => this.elements.textarea.focus(), 150);
  }

  close() {
    this.isOpen = false;
    this.elements.wrapper.classList.remove('cb-active');
  }

  /**
   * Set Active Page Context (call from portal router / navigation)
   */
  setActivePageContext(pageName) {
    this.activePage = pageName;
    if (this.elements.headerSubtitle) {
      this.elements.headerSubtitle.textContent = `Viewing ${pageName} • ${CollegeData.institution.name}`;
    }
  }

  /**
   * Set Theme (light / dark)
   */
  setTheme(theme) {
    this.activeTheme = theme;
    if (theme === 'dark') {
      this.elements.container.classList.add('cb-dark');
    } else {
      this.elements.container.classList.remove('cb-dark');
    }
  }

  /**
   * Render All Messages in Chat Body
   */
  renderMessages() {
    const { body } = this.elements;
    body.innerHTML = '';

    this.messages.forEach(msg => {
      body.appendChild(this.createMessageElement(msg));
    });

    this.scrollToBottom();
  }

  /**
   * Create DOM Element for a Message
   */
  createMessageElement(msg) {
    const row = document.createElement('div');
    row.className = `cb-msg-row cb-${msg.sender}`;
    row.id = `msg_${msg.id}`;

    const avatar = document.createElement('div');
    avatar.className = 'cb-msg-avatar';
    avatar.innerHTML = msg.sender === 'bot' ? '🤖' : '👤';

    const bubble = document.createElement('div');
    bubble.className = 'cb-msg-bubble';

    const parsedHTML = ChatUtils.parseMarkdown(msg.text);
    bubble.innerHTML = parsedHTML;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'cb-msg-time';
    timeSpan.textContent = msg.timestamp || ChatUtils.getFormattedTime();
    bubble.appendChild(timeSpan);

    row.appendChild(avatar);
    row.appendChild(bubble);

    return row;
  }

  /**
   * Handle User Message Submission
   */
  async handleUserSubmit() {
    const text = this.elements.textarea.value.trim();
    if (!text || this.isGenerating) return;

    // Reset input
    this.elements.textarea.value = '';
    this.elements.textarea.style.height = 'auto';

    // Append User Message
    const userMsg = {
      id: 'u_' + Date.now(),
      sender: 'user',
      text: text,
      timestamp: ChatUtils.getFormattedTime()
    };

    this.messages.push(userMsg);
    this.elements.body.appendChild(this.createMessageElement(userMsg));
    this.scrollToBottom();
    ChatUtils.saveToStorage(this.storageKey, this.messages);

    // Show Typing Indicator
    this.isGenerating = true;
    this.elements.sendBtn.disabled = true;
    const typingRow = this.showTypingIndicator();

    try {
      const responseText = await ChatbotAPI.sendMessage(
        text,
        this.messages,
        this.userProfile,
        this.activePage
      );

      // Remove typing indicator
      this.hideTypingIndicator(typingRow);

      // Append Bot Response with Stream Typing Effect
      const botMsg = {
        id: 'b_' + Date.now(),
        sender: 'bot',
        text: responseText,
        timestamp: ChatUtils.getFormattedTime()
      };

      this.messages.push(botMsg);
      const botElement = this.createMessageElement(botMsg);
      this.elements.body.appendChild(botElement);
      this.scrollToBottom();

      ChatUtils.saveToStorage(this.storageKey, this.messages);
    } catch (err) {
      console.error('[CampusChatbot] Query error:', err);
      this.hideTypingIndicator(typingRow);

      const errorMsg = {
        id: 'err_' + Date.now(),
        sender: 'bot',
        text: '⚠️ I encountered a temporary connection issue. Please try asking again!',
        timestamp: ChatUtils.getFormattedTime()
      };
      this.messages.push(errorMsg);
      this.elements.body.appendChild(this.createMessageElement(errorMsg));
      this.scrollToBottom();
    } finally {
      this.isGenerating = false;
      this.elements.sendBtn.disabled = false;
    }
  }

  showTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'cb-msg-row cb-bot cb-typing-row';
    row.innerHTML = `
      <div class="cb-msg-avatar">🤖</div>
      <div class="cb-msg-bubble">
        <div class="cb-typing-indicator">
          <div class="cb-typing-dot"></div>
          <div class="cb-typing-dot"></div>
          <div class="cb-typing-dot"></div>
        </div>
      </div>
    `;
    this.elements.body.appendChild(row);
    this.scrollToBottom();
    return row;
  }

  hideTypingIndicator(row) {
    if (row && row.parentNode) {
      row.parentNode.removeChild(row);
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      this.elements.body.scrollTop = this.elements.body.scrollHeight;
    }, 20);
  }

  /**
   * Copy Code Block Handler
   */
  async copyCodeBlock(id) {
    const container = document.getElementById(id);
    if (!container) return;
    const codeEl = container.querySelector('code');
    if (!codeEl) return;

    const codeText = codeEl.textContent;
    const copyBtn = container.querySelector('.cb-copy-btn span');

    const success = await ChatUtils.copyTextToClipboard(codeText);
    if (success && copyBtn) {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
    }
  }

  /**
   * Clear Chat History
   */
  clearChat() {
    if (confirm('Clear all conversation history?')) {
      this.messages = [
        {
          id: 'welcome_reset',
          sender: 'bot',
          text: `Chat cleared! How can I help you, ${this.userProfile.name.split(' ')[0]}?`,
          timestamp: ChatUtils.getFormattedTime()
        }
      ];
      ChatUtils.saveToStorage(this.storageKey, this.messages);
      this.renderMessages();
    }
  }

  /**
   * Export Chat History
   */
  exportChat() {
    ChatUtils.exportChatHistory(this.messages, `Apex_Campus_Chat_${this.userProfile.name.replace(/\s+/g, '_')}.txt`);
  }
}

// Global Singleton Instance
export const CampusChatbot = new CampusChatbotController();
window.CampusChatbot = CampusChatbot;

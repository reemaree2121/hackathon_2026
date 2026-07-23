/**
 * ============================================================================
 * CHATBOT API MODULE (chatbot-api.js)
 * ============================================================================
 * Supports Google Gemini API, OpenAI API, OpenRouter API, Local Models,
 * or Intelligent Fallback Mode if no key/connection is available.
 * Single point of key configuration!
 * ============================================================================
 */

import { CollegeData, getFallbackResponse } from './chatbot-data.js';

export const ChatbotAPI = {
  // Configurable settings
  config: {
    provider: 'gemini', // Options: 'gemini', 'openai', 'openrouter', 'local', 'fallback'
    apiKey: '', // Added here or passed from server .env (defaults to backend proxy if empty)
    proxyEndpoint: '/api/chatbot/query', // Full-stack backend proxy
    openaiEndpoint: 'https://api.openai.com/v1/chat/completions',
    openrouterEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    localEndpoint: 'http://localhost:11434/api/generate',
    model: 'gemini-3.6-flash',
    maxTokens: 1000,
    temperature: 0.7
  },

  /**
   * Configure API credentials and provider in one simple place
   */
  setConfig(newConfig = {}) {
    this.config = { ...this.config, ...newConfig };
    console.log(`[CampusChatbot API] Configured provider: ${this.config.provider}`);
  },

  /**
   * Main Dispatch Query Method
   */
  async sendMessage(query, chatHistory = [], userProfile = CollegeData.defaultStudentProfile, pageContext = '') {
    // If explicitly set to fallback or offline
    if (this.config.provider === 'fallback' || !navigator.onLine) {
      return getFallbackResponse(query, pageContext, userProfile);
    }

    try {
      if (this.config.provider === 'gemini') {
        return await this.callBackendProxy(query, chatHistory, userProfile, pageContext);
      } else if (this.config.provider === 'openai') {
        return await this.callOpenAI(query, chatHistory, userProfile, pageContext);
      } else if (this.config.provider === 'openrouter') {
        return await this.callOpenRouter(query, chatHistory, userProfile, pageContext);
      } else if (this.config.provider === 'local') {
        return await this.callLocalModel(query, userProfile, pageContext);
      }
    } catch (err) {
      console.warn('[CampusChatbot API] Direct/Proxy API failed, switching to Intelligent Fallback engine:', err);
      return getFallbackResponse(query, pageContext, userProfile);
    }

    return getFallbackResponse(query, pageContext, userProfile);
  },

  /**
   * Call backend proxy (Server-Side Gemini SDK endpoint)
   */
  async callBackendProxy(query, chatHistory, userProfile, pageContext) {
    const response = await fetch(this.config.proxyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: query,
        chatHistory: chatHistory.slice(-6), // last 6 turns context
        userProfile,
        pageContext,
        collegeData: CollegeData
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    if (data && data.reply) {
      return data.reply;
    } else {
      throw new Error('Invalid server reply structure');
    }
  },

  /**
   * Call OpenAI API directly (if user provided an OpenAI Key)
   */
  async callOpenAI(query, chatHistory, userProfile, pageContext) {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API Key is missing');
    }

    const systemPrompt = `You are CampusAI, an empathetic, highly knowledgeable AI assistant for ${CollegeData.institution.name}.
Student Name: ${userProfile.name} (${userProfile.studentId}, ${userProfile.department}, Sem ${userProfile.semester}).
Current active portal page: ${pageContext || 'Dashboard'}.
Use Markdown, lists, and bold text for clarity. Always be friendly and precise.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      })),
      { role: 'user', content: query }
    ];

    const res = await fetch(this.config.openaiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages: messages,
        temperature: this.config.temperature
      })
    });

    const data = await res.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    throw new Error('OpenAI API error response');
  },

  /**
   * Call OpenRouter API
   */
  async callOpenRouter(query, chatHistory, userProfile, pageContext) {
    if (!this.config.apiKey) {
      throw new Error('OpenRouter API Key missing');
    }

    const systemPrompt = `You are CampusAI for ${CollegeData.institution.name}. Student: ${userProfile.name}. Page: ${pageContext}. Answer accurately.`;

    const res = await fetch(this.config.openrouterEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://apextech.edu',
        'X-Title': 'Apex College Portal Chatbot'
      },
      body: JSON.stringify({
        model: this.config.model || 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ]
      })
    });

    const data = await res.json();
    return data.choices[0].message.content;
  },

  /**
   * Call Local Ollama endpoint
   */
  async callLocalModel(query, userProfile, pageContext) {
    const res = await fetch(this.config.localEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: `System: You are Campus AI for Apex College. Student: ${userProfile.name}. Page: ${pageContext}.\nUser: ${query}\nAssistant:`,
        stream: false
      })
    });
    const data = await res.json();
    return data.response;
  }
};

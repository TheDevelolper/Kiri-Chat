class ChatButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isOpen = true;
    this.markedLoaded = false;
    this.isSending = false;
    this.storageKey = 'kiri-chat-history';
    this.openStateKey = 'kiri-chat-open';
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.loadChatState();
    this.loadHistory();
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.loadChatState();
    this.loadHistory();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          width: 60px;
          height: 60px;
        }

        :host(.chat-open) {
          width: 390px;
          height: 540px;
        }

        @media (max-width: 480px) {
          :host {
            bottom: 0;
            right: 0;
            left: 0;
            width: 80%;
            height: 60px;
          }

          :host(.chat-open) {
            width: 100%;
            height: 100%;
            bottom: 0;
            right: 0;
          }

          .chat-window {
            bottom: 60px;
            right: 0;
            left: 0;
            width: 100%;
            height: calc(100% - 60px);
            border-radius: 0;
          }

          .chat-button {
            width: 100%;
            height: 60px;
            border-radius: 0;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.15);
          }

          .chat-header {
            border-radius: 0;
          }
        }

        .chat-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: #0078d4;
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: fixed;
          bottom: 1rem;
          right: 1rem;
        }

        .chat-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .chat-button svg {
          width: 28px;
          height: 28px;
        }

        .chat-window {
          display: none;
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 100vw
          max-width: 440px;
          height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          flex-direction: column;
          overflow: hidden;
        }

        .chat-window.open {
          display: flex;
        }

        .chat-header {
          background: #0078d4;
          color: white;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .header-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .clear-btn {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.5);
          color: white;
          cursor: pointer;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          transition: background 0.2s;
        }

        .clear-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 20px;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          background: #f5f5f5;
        }

        .message {
          margin-bottom: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          max-width: 80%;
          font-size: 0.8rem;
        }

        .message.user {
          background: #0078d4;
          color: white;
          margin-left: auto;
        }

        .message.bot {
          background: white;
          color: #333;
          border: 1px solid #e0e0e0;
          position: relative;
          padding-right: 44px;
        }

        .read-aloud-btn {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: transparent;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
        }

        .read-aloud-btn:hover {
          background: #f0f0f0;
          color: #333;
        }

        .message.bot p {
          margin: 0 0 8px 0;
        }

        .message.bot p:last-child {
          margin-bottom: 0;
        }

        .message.bot code {
          background: #f0f0f0;
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 0.8rem;
        }

        .message.bot pre {
          background: #f5f5f5;
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
          margin: 8px 0;
        }

        .message.bot pre code {
          background: none;
          padding: 0;
        }

        .message.bot ul, .message.bot ol {
          margin: 8px 0;
          padding-left: 20px;
        }

        .message.bot a {
          color: #0078d4;
          text-decoration: underline;
        }

        .message.loading {
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          color: #666;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e0e0e0;
          border-top: 2px solid #0078d4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .message-sources {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e0e0e0;
          font-size: 0.8rem;
          flex: 1;
        }

        .bot-footer {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e0e0e0;
        }

        .bot-footer .message-sources {
          border-top: none;
          margin-top: 0;
          padding-top: 0;
          flex: 1;
        }

        .bot-footer .read-aloud-btn {
          margin-left: 0;
          flex-shrink: 0;
        }

        .message-sources a {
          color: #0078d4;
          text-decoration: none;
          display: inline-block;
          margin-right: 8px;
          margin-bottom: 4px;
          padding: 2px 8px;
          background: #f0f0f0;
          border-radius: 12px;
          font-size: 0.8rem;
        }

        .message-sources a:hover {
          background: #e0e0e0;
        }

        .sources-label {
          color: #666;
          margin-bottom: 4px;
          font-size: 0.8rem;
        }

        .chat-input {
          display: flex;
          padding: 12px;
          border-top: 1px solid #e0e0e0;
          background: white;
        }

        .chat-input input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 20px;
          outline: none;
        }

        .chat-input button {
          margin-left: 8px;
          padding: 8px 16px;
          background: #0078d4;
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
        }

        .chat-input button:hover {
          background: #006cbd;
        }

        .chat-input button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }

        .chat-input input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .read-aloud-btn.speaking {
          color: #0078d4;
          background: #e6f3ff;
        }

        .read-aloud-btn.speaking:hover {
          background: #cce7ff;
        }

        .read-aloud-btn svg {
          width: 16px;
          height: 16px;
        }
      </style>
       <div class="chat-window" id="chatWindow">
        <div class="chat-header">
          <h3>Chat with Kiri</h3>
          <div class="header-buttons">
            <button class="clear-btn" id="clearBtn">Clear</button>
            <button class="close-btn" id="closeBtn">×</button>
          </div>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="message bot">Hello! How can I help you today?</div>
        </div>
        <div class="chat-input">
          <input type="text" id="messageInput" placeholder="Type a message..." value="What is this project?" />
          <button id="sendBtn">Send</button>
        </div>
      </div>
      <button class="chat-button" id="chatButton" aria-label="Open chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    `;
  }

  setupEventListeners() {
    const chatButton = this.shadowRoot.querySelector('#chatButton');
    const closeBtn = this.shadowRoot.querySelector('#closeBtn');
    const clearBtn = this.shadowRoot.querySelector('#clearBtn');
    const sendBtn = this.shadowRoot.querySelector('#sendBtn');
    const messageInput = this.shadowRoot.querySelector('#messageInput');
    const chatWindow = this.shadowRoot.querySelector('#chatWindow');

    chatButton.addEventListener('click', () => {
      this.toggleChat();
    });

    closeBtn.addEventListener('click', () => {
      this.toggleChat();
    });

    clearBtn.addEventListener('click', () => {
      this.clearHistory();
    });

    sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });

    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
  }

  toggleChat() {
    const chatWindow = this.shadowRoot.querySelector('#chatWindow');
    this.isOpen = !this.isOpen;
    chatWindow.classList.toggle('open', this.isOpen);
    this.classList.toggle('chat-open', this.isOpen);
    localStorage.setItem(this.openStateKey, this.isOpen ? 'true' : 'false');
  }

  loadChatState() {
    const savedState = localStorage.getItem(this.openStateKey);
    if (savedState === null) {
      // First visit - default to open
      this.isOpen = true;
      const chatWindow = this.shadowRoot.querySelector('#chatWindow');
      chatWindow.classList.add('open');
      this.classList.add('chat-open');
    } else if (savedState === 'true') {
      this.isOpen = true;
      const chatWindow = this.shadowRoot.querySelector('#chatWindow');
      chatWindow.classList.add('open');
      this.classList.add('chat-open');
    } else {
      this.isOpen = false;
    }
  }

  saveHistory() {
    const chatMessages = this.shadowRoot.querySelector('#chatMessages');
    const messages = [];
    chatMessages.querySelectorAll('.message').forEach(msg => {
      const isUser = msg.classList.contains('user');
      const isBot = msg.classList.contains('bot');
      const isLoading = msg.classList.contains('loading');
      if (isLoading) return;
      if (isUser) {
        messages.push({ type: 'user', text: msg.textContent });
      } else if (isBot) {
        const sources = [];
        const sourceLinks = msg.querySelectorAll('.message-sources a');
        sourceLinks.forEach(link => {
          sources.push({ url: link.href, text: link.textContent });
        });
        messages.push({ type: 'bot', html: msg.innerHTML.split('<div class="message-sources">')[0], sources });
      }
    });
    sessionStorage.setItem(this.storageKey, JSON.stringify(messages));
  }

  loadHistory() {
    const savedHistory = sessionStorage.getItem(this.storageKey);
    if (!savedHistory) return;
    const messages = JSON.parse(savedHistory);
    const chatMessages = this.shadowRoot.querySelector('#chatMessages');
    chatMessages.innerHTML = '';
    messages.forEach(msg => {
      if (msg.type === 'user') {
        const userMessage = document.createElement('div');
        userMessage.className = 'message user';
        userMessage.textContent = msg.text;
        chatMessages.appendChild(userMessage);
      } else if (msg.type === 'bot') {
        const botMessage = document.createElement('div');
        botMessage.className = 'message bot';
        botMessage.innerHTML = msg.html;

        // Add source links if available
        if (msg.sources && msg.sources.length > 0) {
          const sourcesDiv = document.createElement('div');
          sourcesDiv.className = 'message-sources';
          sourcesDiv.innerHTML = '<div class="sources-label">Sources:</div>';
          msg.sources.forEach(source => {
            const link = document.createElement('a');
            link.href = source.url;
            link.textContent = source.text;
            sourcesDiv.appendChild(link);
          });
          botMessage.appendChild(sourcesDiv);
        }

        const readButton = document.createElement('button');
        readButton.className = 'read-aloud-btn';
        readButton.title = 'Read Aloud';
        
        const speakerIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
        const stopIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="18" y1="6" x2="18" y2="18"></line><line x1="22" y1="6" x2="22" y2="18"></line></svg>';
        
        readButton.innerHTML = speakerIcon;

        let utterance;
        
        readButton.addEventListener('click', () => {
          if(utterance && speechSynthesis.speaking) {
              speechSynthesis.cancel();
              readButton.innerHTML = speakerIcon;
              readButton.classList.remove('speaking');
          } else {
              readButton.innerHTML = stopIcon;
              readButton.classList.add('speaking');
              utterance = new SpeechSynthesisUtterance(botMessage.textContent);
              utterance.onend = () => {
                readButton.innerHTML = speakerIcon;
                readButton.classList.remove('speaking');
              };
              speechSynthesis.speak(utterance);
          }
        });

        botMessage.appendChild(readButton);

        chatMessages.appendChild(botMessage);
      }
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  clearHistory() {
    sessionStorage.removeItem(this.storageKey);
    const chatMessages = this.shadowRoot.querySelector('#chatMessages');
    chatMessages.innerHTML = '<div class="message bot">Hello! How can I help you today?</div>';
  }

  async loadMarked() {
    if (this.markedLoaded) return;
    return new Promise((resolve, reject) => {
      if (typeof marked !== 'undefined') {
        this.markedLoaded = true;
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
      script.onload = () => {
        this.markedLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

   async sendMessage() {
    if (this.isSending) return;

    const messageInput = this.shadowRoot.querySelector('#messageInput');
    const sendBtn = this.shadowRoot.querySelector('#sendBtn');
    const chatMessages = this.shadowRoot.querySelector('#chatMessages');
    const text = messageInput.value.trim();

    if (!text) return;

    this.isSending = true;
    messageInput.disabled = true;
    sendBtn.disabled = true;

    const userMessage = document.createElement('div');
    userMessage.className = 'message user';
    userMessage.textContent = text;
    chatMessages.appendChild(userMessage);

    messageInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;
    this.saveHistory();

    // Show loading spinner
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'message loading';
    loadingMessage.innerHTML = '<div class="spinner"></div><span>Big thoughts, tiny machine.. hold up...</span>';
    chatMessages.appendChild(loadingMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      await this.loadMarked();
      
      // Create bot message container for streaming
      const botMessage = document.createElement('div');
      botMessage.className = 'message bot';
      botMessage.innerHTML = '';
      
      let fullResponse = '';
      let sources = [];

      // Use fetch with streaming
      const response = await fetch('https://chat.hirekiran.com/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              continue;
            };
            
            try {
              const data = JSON.parse(dataStr);
              if (data.token) {
                  fullResponse += data.token;

                  // Remove loading message on first response
                  if (fullResponse?.length > 0) {
                      chatMessages.appendChild(botMessage);
                      loadingMessage.remove();
                  }
                  botMessage.innerHTML = marked.parse(fullResponse);
                  chatMessages.scrollTop = chatMessages.scrollHeight;
              }
              if (data.sources) {
                sources = data.sources;
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      // Add source links if available
      if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'message-sources';
        sourcesDiv.innerHTML = '<div class="sources-label">Sources:</div>';
        sources.forEach(source => {
          const link = document.createElement('a');
          link.href = source.url;
          link.textContent = source.header || source.source;
          sourcesDiv.appendChild(link);
        });
        botMessage.appendChild(sourcesDiv);
      }

      const readButton = document.createElement('button');
      readButton.className = 'read-aloud-btn';
      readButton.title = 'Read Aloud';
      
      const speakerIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
      const stopIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="18" y1="6" x2="18" y2="18"></line><line x1="22" y1="6" x2="22" y2="18"></line></svg>';
      
      readButton.innerHTML = speakerIcon;

      let utterance;
      
      readButton.addEventListener('click', () => {
        if(utterance && speechSynthesis.speaking) {
            speechSynthesis.cancel();
            readButton.innerHTML = speakerIcon;
            readButton.classList.remove('speaking');
        } else {
            readButton.innerHTML = stopIcon;
            readButton.classList.add('speaking');
            utterance = new SpeechSynthesisUtterance(botMessage.textContent);
            utterance.onend = () => {
              readButton.innerHTML = speakerIcon;
              readButton.classList.remove('speaking');
            };
            speechSynthesis.speak(utterance);
        }
      });

      botMessage.appendChild(readButton);

      this.saveHistory();
    } catch (error) {
      // Remove loading spinner if still present
      loadingMessage.remove();
      
      const errorMessage = document.createElement('div');
      errorMessage.className = 'message bot';
      errorMessage.textContent = 'Error: Could not reach the chat API.';
      chatMessages.appendChild(errorMessage);
      this.saveHistory();
    } finally {
      this.isSending = false;
      messageInput.disabled = false;
      sendBtn.disabled = false;
      messageInput.focus();
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

customElements.define('chat-button', ChatButton);

(function() {
  function injectChatButton() {
    if (!document.querySelector('chat-button')) {
      const chatButton = document.createElement('chat-button');
      document.body.appendChild(chatButton);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectChatButton);
  } else {
    injectChatButton();
  }
})();

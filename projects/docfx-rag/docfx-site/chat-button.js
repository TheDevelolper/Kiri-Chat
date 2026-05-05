class ChatButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isOpen = false;
    this.markedLoaded = false;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
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
          position: absolute;
          bottom: 0;
          right: 0;
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
          width: 350px;
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
          font-size: 0.9em;
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
          font-size: 0.85em;
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
          font-size: 0.9em;
        }

        .message-sources a:hover {
          background: #e0e0e0;
        }

        .sources-label {
          color: #666;
          margin-bottom: 4px;
          font-size: 0.9em;
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
      </style>
      <div class="chat-window" id="chatWindow">
        <div class="chat-header">
          <h3>Chat with Kiri</h3>
          <button class="close-btn" id="closeBtn">×</button>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="message bot">Hello! How can I help you today?</div>
        </div>
        <div class="chat-input">
          <input type="text" id="messageInput" placeholder="Type a message..." value="Tell me about the Prerequisites" />
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
    const sendBtn = this.shadowRoot.querySelector('#sendBtn');
    const messageInput = this.shadowRoot.querySelector('#messageInput');
    const chatWindow = this.shadowRoot.querySelector('#chatWindow');

    chatButton.addEventListener('click', () => {
      this.toggleChat();
    });

    closeBtn.addEventListener('click', () => {
      this.toggleChat();
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
    const messageInput = this.shadowRoot.querySelector('#messageInput');
    const chatMessages = this.shadowRoot.querySelector('#chatMessages');
    const text = messageInput.value.trim();

    if (!text) return;

    const userMessage = document.createElement('div');
    userMessage.className = 'message user';
    userMessage.textContent = text;
    chatMessages.appendChild(userMessage);

    messageInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Show loading spinner
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'message loading';
    loadingMessage.innerHTML = '<div class="spinner"></div><span>Thinking...</span>';
    chatMessages.appendChild(loadingMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      await this.loadMarked();
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();

      // Remove loading spinner
      loadingMessage.remove();

      const botMessage = document.createElement('div');
      botMessage.className = 'message bot';
      botMessage.innerHTML = marked.parse(data.response || '');

      // Add source links if available
      if (data.sources && data.sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'message-sources';
        sourcesDiv.innerHTML = '<div class="sources-label">Sources:</div>';
        data.sources.forEach(source => {
          const link = document.createElement('a');
          link.href = source.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = source.header || source.source;
          sourcesDiv.appendChild(link);
        });
        botMessage.appendChild(sourcesDiv);
      }

      chatMessages.appendChild(botMessage);
    } catch (error) {
      // Remove loading spinner
      loadingMessage.remove();

      const errorMessage = document.createElement('div');
      errorMessage.className = 'message bot';
      errorMessage.textContent = 'Error: Could not reach the chat API.';
      chatMessages.appendChild(errorMessage);
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

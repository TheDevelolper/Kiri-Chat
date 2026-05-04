class ChatButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isOpen = false;
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
          <h3>Chat</h3>
          <button class="close-btn" id="closeBtn">×</button>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="message bot">Hello! How can I help you today?</div>
        </div>
        <div class="chat-input">
          <input type="text" id="messageInput" placeholder="Type a message...">
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

  sendMessage() {
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

    setTimeout(() => {
      const botMessage = document.createElement('div');
      botMessage.className = 'message bot';
      botMessage.textContent = 'Thanks for your message! This is a placeholder response.';
      chatMessages.appendChild(botMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 500);
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

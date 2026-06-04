"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './Chat.module.css';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  uiType?: 'classification_suggestion' | 'permission_request' | 'none';
  uiData?: any;
};

function ChatContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt');
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Chào bạn, tôi là Moni. Tôi có thể giúp gì cho bạn hôm nay?',
      uiType: 'none'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initialized = useRef(false);

  // Handle initial prompt from shortcut
  useEffect(() => {
    if (initialPrompt && !initialized.current) {
      initialized.current = true;
      handleSendMessage(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) 
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok || typeof data.content !== 'string') {
        throw new Error(data.detail || 'Lỗi từ máy chủ backend (Không có content)');
      }

      // Parse custom UI responses (Correction Paths)
      let uiType: Message['uiType'] = 'none';
      let uiData = null;
      let displayContent = data.content;

      // Check for Classification Suggestion (Correction Path 1)
      if (displayContent.includes('<<CLASSIFY_SUGGESTION>>')) {
        uiType = 'classification_suggestion';
        const parts = displayContent.split('<<CLASSIFY_SUGGESTION>>');
        displayContent = parts[0].trim();
        try {
          uiData = JSON.parse(parts[1].trim());
        } catch (e) { console.error("Parse UI data error", e); }
      }
      
      // Check for Permission Request (Correction Path 3)
      if (displayContent.includes('<<PERMISSION_REQUEST>>')) {
        uiType = 'permission_request';
        displayContent = displayContent.split('<<PERMISSION_REQUEST>>')[0].trim();
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: displayContent,
        uiType,
        uiData
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Xin lỗi, đã có lỗi xảy ra khi kết nối.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassificationConfirm = (category: string) => {
    // Logic khi user xác nhận phân loại
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Đã lưu giao dịch vào mục **${category}**. Cảm ơn bạn đã xác nhận, mình sẽ nhớ pattern này cho các lần sau! (Correction Path 1 hoàn tất)`,
      uiType: 'none'
    }]);
  };

  const handleGrantPermission = async () => {
    // Giả lập cấp quyền (thay đổi state ở backend API thông qua một endpoint hoặc gửi kèm cờ trong tin nhắn sau)
    // Ở đây ta gọi API thông báo đã cấp quyền và hỏi lại câu cũ
    setIsLoading(true);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: 'Tôi đồng ý cấp quyền truy cập dữ liệu chi tiêu.'
    }]);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: 'Tổng chi tiêu tháng này là bao nhiêu?' }], // Gửi lại câu hỏi cũ
          permissionGranted: true // Truyền cờ đã cấp quyền
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        uiType: 'none'
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <Link href="/" className={styles.backButton}>⬅️</Link>
        Trợ thủ AI - Moni
      </div>
      
      <div className={styles.messagesArea}>
        {messages.map(msg => (
          <div key={msg.id} className={`${styles.messageRow} ${styles[msg.role]}`}>
            <div className={styles.messageContentWrapper}>
              <div className={`${styles.bubble} ${styles[msg.role]}`}>
                {msg.content}
              </div>
              
              {/* Correction Path 1 UI: Suggestion Buttons */}
              {msg.uiType === 'classification_suggestion' && msg.uiData && (
                <div className={styles.richUiCard}>
                  <div className={styles.richUiTitle}>Gợi ý phân loại:</div>
                  <div className={styles.suggestionButtons}>
                    {msg.uiData.suggestions?.map((s: string) => (
                      <button key={s} className={styles.btnSuggest} onClick={() => handleClassificationConfirm(s)}>
                        {s}
                      </button>
                    ))}
                    <button className={styles.btnSuggest} onClick={() => handleClassificationConfirm('Khác...')}>
                      Khác...
                    </button>
                  </div>
                </div>
              )}

              {/* Correction Path 3 UI: Permission Request */}
              {msg.uiType === 'permission_request' && (
                <div className={styles.richUiCard}>
                  <div className={styles.richUiTitle}>Yêu cầu quyền truy cập</div>
                  <p style={{marginBottom: 10}}>Moni cần quyền xem lịch sử giao dịch của bạn để tính toán tổng chi.</p>
                  <button className={styles.btnPrimary} onClick={handleGrantPermission}>
                    Cho phép truy cập
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.messageRow} ${styles.assistant}`}>
            <div className={`${styles.bubble} ${styles.assistant}`}>
              Đang nghĩ...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <input 
          type="text" 
          className={styles.textInput} 
          placeholder="Hỏi Moni bất cứ điều gì..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
        />
        <button 
          className={styles.sendButton} 
          onClick={() => handleSendMessage(input)}
          disabled={!input.trim() || isLoading}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}

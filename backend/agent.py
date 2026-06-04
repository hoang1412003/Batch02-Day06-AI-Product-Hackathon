import os
import json
import re
from database import mock_transactions
import logging

class MoniAgent:
    def __init__(self, api_key: str = None, groq_api_key: str = None):
        self.provider = os.getenv("DEFAULT_PROVIDER", "google").lower()
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        logging.basicConfig(level=getattr(logging, self.log_level))
        
        if self.provider == "local":
            logging.info("Initializing Local LLM (Llama-cpp)")
            from llama_cpp import Llama
            model_path = os.getenv("LOCAL_MODEL_PATH", "./models/Phi-3-mini-4k-instruct-q4.gguf")
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Local model not found at {model_path}")
            self.llm = Llama(model_path=model_path, n_ctx=2048, verbose=False)
        elif self.provider == "groq":
            logging.info("Initializing Groq")
            from groq import Groq
            if not groq_api_key:
                raise ValueError("GROQ_API_KEY is required for groq provider")
            self.groq_client = Groq(api_key=groq_api_key)
            self.groq_model = os.getenv("GROQ_MODEL", "llama3-8b-8192")
        else:
            logging.info("Initializing Google Gemini")
            from google import genai
            if not api_key:
                raise ValueError("GOOGLE_API_KEY is required for google provider")
            self.client = genai.Client(api_key=api_key)
            self.model_name = 'gemini-2.5-flash'

    def extract_keywords(self, query: str) -> list[str]:
        stop_words = ['tôi', 'bạn', 'là', 'có', 'không', 'và', 'hoặc', 'cho', 'của', 'vừa', 'mới']
        query = re.sub(r'[^\w\s\u00C0-\u1EF9]', '', query.lower())
        words = query.split()
        return [word for word in words if len(word) > 1 and word not in stop_words]

    def retrieve_relevant_context(self, query: str, max_results=10):
        keywords = self.extract_keywords(query)
        if not keywords:
            return mock_transactions[:max_results]
        
        scored_transactions = []
        for tx in mock_transactions:
            score = 0
            tx_text = f"{tx.get('description', '')} {tx.get('recipient', '')} {tx.get('type', '')} {tx.get('category', '')}".lower()
            
            for kw in keywords:
                if kw in tx_text:
                    score += 1
                    
            score += int(tx.get('id', '0')) * 0.001
            scored_transactions.append((tx, score))
            
        relevant = [item[0] for item in scored_transactions if item[1] >= 1]
        relevant.sort(key=lambda x: next((item[1] for item in scored_transactions if item[0] == x), 0), reverse=True)
        
        if not relevant:
            relevant = mock_transactions
            
        return relevant[:max_results]

    def generate_response(self, messages: list[dict], permission_granted: bool) -> str:
        last_user_message = next((m for m in reversed(messages) if m.get('role') == 'user'), None)
        query = last_user_message.get('content', '') if last_user_message else ''
        
        context_data = ''
        if permission_granted:
            relevant_transactions = self.retrieve_relevant_context(query)
            context_data = json.dumps(relevant_transactions, ensure_ascii=False)
            
        system_instruction = f"""Bạn là Moni, trợ lý AI quản lý tài chính cá nhân trên ứng dụng MoMo. Hãy trả lời ngắn gọn, thân thiện, xưng 'mình' và gọi 'bạn'.

LUẬT 1 - QUYỀN TRUY CẬP DỮ LIỆU:
- Trạng thái quyền: {'ĐÃ ĐƯỢC CẤP' if permission_granted else 'CHƯA ĐƯỢC CẤP'}.
- Nếu user hỏi về lịch sử giao dịch:
  + Nếu CHƯA ĐƯỢC CẤP: Không được bịa số liệu. Phải yêu cầu quyền và THÊM `<<PERMISSION_REQUEST>>` vào cuối câu.
  + Nếu ĐÃ ĐƯỢC CẤP: Dưới đây là database:
    {context_data}
    Hãy dựa vào đây để trả lời.

LUẬT 2 - GỢI Ý PHÂN LOẠI:
- Khi user khai báo khoản chi, KHÔNG tự chốt danh mục.
- Hỏi lại user và THÊM `<<CLASSIFY_SUGGESTION>> {{"suggestions": ["Danh mục 1", "Danh mục 2", "Danh mục 3"]}}` vào cuối câu."""

        if self.provider == "local":
            formatted_messages = [{"role": "system", "content": system_instruction}]
            for m in messages:
                formatted_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
            
            response = self.llm.create_chat_completion(
                messages=formatted_messages,
                temperature=0.2,
                max_tokens=512
            )
            return response["choices"][0]["message"]["content"]
            
        elif self.provider == "groq":
            formatted_messages = [{"role": "system", "content": system_instruction}]
            for m in messages:
                formatted_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
                
            response = self.groq_client.chat.completions.create(
                messages=formatted_messages,
                model=self.groq_model,
                temperature=0.2,
                max_tokens=512
            )
            return response.choices[0].message.content
            
        else:
            from google.genai import types
            formatted_contents = []
            for m in messages:
                role = 'model' if m.get('role') == 'assistant' else 'user'
                formatted_contents.append(
                    types.Content(role=role, parts=[types.Part.from_text(text=m.get('content', ''))])
                )
                
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=formatted_contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2
                )
            )
            return response.text

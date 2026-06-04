import os
import json
import re
from google import genai
from google.genai import types
from database import mock_transactions

class MoniAgent:
    def __init__(self, api_key: str):
        # Initialize Google GenAI client
        self.client = genai.Client(api_key=api_key)
        self.model_name = 'gemini-2.5-flash' # Using genai SDK, 2.5-flash is standard.

    def extract_keywords(self, query: str) -> list[str]:
        stop_words = ['tôi', 'bạn', 'là', 'có', 'không', 'và', 'hoặc', 'cho', 'của', 'vừa', 'mới']
        # remove punctuation and lowercase
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
                    
            # Add a small weight based on ID
            score += int(tx.get('id', '0')) * 0.001
            scored_transactions.append((tx, score))
            
        relevant = [item[0] for item in scored_transactions if item[1] >= 1]
        # Sort by score descending
        relevant.sort(key=lambda x: next((item[1] for item in scored_transactions if item[0] == x), 0), reverse=True)
        
        if not relevant:
            relevant = mock_transactions
            
        return relevant[:max_results]

    def generate_response(self, messages: list[dict], permission_granted: bool) -> str:
        # Convert messages to format supported by SDK
        formatted_contents = []
        for m in messages:
            role = 'model' if m.get('role') == 'assistant' else 'user'
            formatted_contents.append(
                types.Content(role=role, parts=[types.Part.from_text(text=m.get('content', ''))])
            )
            
        last_user_message = next((m for m in reversed(messages) if m.get('role') == 'user'), None)
        query = last_user_message.get('content', '') if last_user_message else ''
        
        context_data = ''
        if permission_granted:
            relevant_transactions = self.retrieve_relevant_context(query)
            context_data = json.dumps(relevant_transactions, ensure_ascii=False)
            
        system_instruction = f"""Bạn là Moni, trợ lý AI quản lý tài chính cá nhân trên ứng dụng MoMo. Hãy trả lời ngắn gọn, thân thiện, xưng 'mình' và gọi 'bạn'.

LUẬT 1 - QUYỀN TRUY CẬP DỮ LIỆU (CORRECTION PATH 3):
- Trạng thái quyền truy cập dữ liệu giao dịch hiện tại của bạn là: {'ĐÃ ĐƯỢC CẤP' if permission_granted else 'CHƯA ĐƯỢC CẤP'}.
- Nếu user hỏi về lịch sử giao dịch, tổng chi tiêu, hoặc các số liệu tài chính:
  + Nếu CHƯA ĐƯỢC CẤP quyền: Bạn tuyệt đối KHÔNG ĐƯỢC bịa số liệu (không được trả lời là 0đ). Bạn PHẢI trả lời rằng bạn cần quyền truy cập và BẮT BUỘC thêm chuỗi `<<PERMISSION_REQUEST>>` vào cuối câu trả lời.
  + Nếu ĐÃ ĐƯỢC CẤP quyền: Dưới đây là dữ liệu chi tiêu (đóng vai trò như database) có liên quan nhất đến câu hỏi của user:
    {context_data}
    Hãy truy vấn database ảo này, tính toán và liệt kê chi tiết một cách chính xác dựa trên sự thật đó.

LUẬT 2 - GỢI Ý PHÂN LOẠI CHI TIÊU (CORRECTION PATH 1):
- Khi user khai báo một khoản chi tiêu mới (ví dụ: 'tôi vừa tiêu 50k ăn phở'), bạn KHÔNG ĐƯỢC tự động chốt danh mục phân loại.
- Bạn phải hỏi lại user để xác nhận, và BẮT BUỘC thêm chuỗi `<<CLASSIFY_SUGGESTION>> {{"suggestions": ["Danh mục 1", "Danh mục 2", "Danh mục 3"]}}` vào cuối câu. Suy luận 3 danh mục phù hợp nhất với khoản chi đó."""

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=formatted_contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2
            )
        )
        
        return response.text

import { GoogleGenAI } from '@google/genai';
import { mockTransactions } from '@/mock/database';

export class MoniAgent {
  private ai: GoogleGenAI;
  private modelName = 'gemini-3.5-flash';

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Trích xuất từ khóa chính từ câu hỏi người dùng (RAG - Keyword extraction)
   */
  private extractKeywords(query: string): string[] {
    const stopWords = ['tôi', 'bạn', 'là', 'có', 'không', 'và', 'hoặc', 'cho', 'của', 'vừa', 'mới'];
    return query
      .toLowerCase()
      .replace(/[^\w\s\u00C0-\u1EF9]/g, '') // remove special chars
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.includes(word));
  }

  /**
   * RAG: Lấy ra các giao dịch liên quan nhất dựa trên truy vấn người dùng.
   * Đây là phiên bản keyword-based search mô phỏng Retrieval-Augmented Generation.
   */
  private retrieveRelevantContext(query: string, maxResults = 10) {
    const keywords = this.extractKeywords(query);

    if (keywords.length === 0) {
      // Nếu không có từ khóa rõ ràng, trả về 10 giao dịch gần nhất
      return mockTransactions.slice(0, maxResults);
    }

    // Tính điểm relevance cho từng giao dịch
    const scoredTransactions = mockTransactions.map(tx => {
      let score = 0;
      const txText = `${tx.description} ${tx.recipient} ${tx.type} ${tx.category}`.toLowerCase();
      
      keywords.forEach(kw => {
        if (txText.includes(kw)) {
          score += 1;
        }
      });

      // Ưu tiên thời gian (các giao dịch ở sau thường là gần đây hoặc có id lớn hơn tùy cấu trúc)
      // Trong mock data, date tăng dần. Thêm một trọng số nhỏ cho id để ưu tiên giao dịch mới nếu cùng điểm
      score += parseInt(tx.id) * 0.001; 

      return { tx, score };
    });

    // Lọc ra các giao dịch có score > 0 (tức là có chứa từ khóa)
    let relevant = scoredTransactions
      .filter(item => item.score >= 1)
      .sort((a, b) => b.score - a.score)
      .map(item => item.tx);

    // Nếu không tìm thấy kết quả nào qua keyword, fallback về các giao dịch gần đây (mặc định)
    if (relevant.length === 0) {
      relevant = mockTransactions;
    }

    // Giới hạn số lượng context trả về để tránh vượt quá context window
    return relevant.slice(0, maxResults);
  }

  public async generateResponse(messages: any[], permissionGranted: boolean) {
    const formattedMessages = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Lấy câu hỏi cuối cùng của user để thực hiện RAG
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const query = lastUserMessage ? lastUserMessage.content : '';

    let contextData = '';
    if (permissionGranted) {
      // Thực hiện RAG để lấy các giao dịch liên quan thay vì lấy toàn bộ
      const relevantTransactions = this.retrieveRelevantContext(query);
      contextData = JSON.stringify(relevantTransactions);
    }

    // System instruction: Đóng vai Moni và xử lý các luật UX
    const systemInstruction = `Bạn là Moni, trợ lý AI quản lý tài chính cá nhân trên ứng dụng MoMo. Hãy trả lời ngắn gọn, thân thiện, xưng 'mình' và gọi 'bạn'.

LUẬT 1 - QUYỀN TRUY CẬP DỮ LIỆU (CORRECTION PATH 3):
- Trạng thái quyền truy cập dữ liệu giao dịch hiện tại của bạn là: ${permissionGranted ? 'ĐÃ ĐƯỢC CẤP' : 'CHƯA ĐƯỢC CẤP'}.
- Nếu user hỏi về lịch sử giao dịch, tổng chi tiêu, hoặc các số liệu tài chính:
  + Nếu CHƯA ĐƯỢC CẤP quyền: Bạn tuyệt đối KHÔNG ĐƯỢC bịa số liệu (không được trả lời là 0đ). Bạn PHẢI trả lời rằng bạn cần quyền truy cập và BẮT BUỘC thêm chuỗi \`<<PERMISSION_REQUEST>>\` vào cuối câu trả lời.
  + Nếu ĐÃ ĐƯỢC CẤP quyền: Dưới đây là dữ liệu chi tiêu (đóng vai trò như database) có liên quan nhất đến câu hỏi của user:
    ${contextData}
    Hãy truy vấn database ảo này, tính toán và liệt kê chi tiết một cách chính xác dựa trên sự thật đó.

LUẬT 2 - GỢI Ý PHÂN LOẠI CHI TIÊU (CORRECTION PATH 1):
- Khi user khai báo một khoản chi tiêu mới (ví dụ: 'tôi vừa tiêu 50k ăn phở'), bạn KHÔNG ĐƯỢC tự động chốt danh mục phân loại.
- Bạn phải hỏi lại user để xác nhận, và BẮT BUỘC thêm chuỗi \`<<CLASSIFY_SUGGESTION>> {"suggestions": ["Danh mục 1", "Danh mục 2", "Danh mục 3"]}\` vào cuối câu. Suy luận 3 danh mục phù hợp nhất với khoản chi đó.`;

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: formattedMessages,
      config: {
        systemInstruction,
        temperature: 0.2, 
      }
    });

    return response.text;
  }
}

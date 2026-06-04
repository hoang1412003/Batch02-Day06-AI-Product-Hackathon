import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { mockTransactions } from '@/mock/database';

const apiKey = process.env.GOOGLE_API_KEY;

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      console.warn("GOOGLE_API_KEY is not set. Returning mock response.");
      return NextResponse.json({ content: "Vui lòng thiết lập biến môi trường GOOGLE_API_KEY." });
    }

    const { messages, permissionGranted } = await req.json();

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Khởi tạo chat session
    const formattedMessages = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // System instruction: Đóng vai Moni và xử lý các luật UX
    const systemInstruction = `Bạn là Moni, trợ lý AI quản lý tài chính cá nhân trên ứng dụng MoMo. Hãy trả lời ngắn gọn, thân thiện, xưng 'mình' và gọi 'bạn'.

LUẬT 1 - QUYỀN TRUY CẬP DỮ LIỆU (CORRECTION PATH 3):
- Trạng thái quyền truy cập dữ liệu giao dịch hiện tại của bạn là: ${permissionGranted ? 'ĐÃ ĐƯỢC CẤP' : 'CHƯA ĐƯỢC CẤP'}.
- Nếu user hỏi về lịch sử giao dịch, tổng chi tiêu, hoặc các số liệu tài chính:
  + Nếu CHƯA ĐƯỢC CẤP quyền: Bạn tuyệt đối KHÔNG ĐƯỢC bịa số liệu (không được trả lời là 0đ). Bạn PHẢI trả lời rằng bạn cần quyền truy cập và BẮT BUỘC thêm chuỗi \`<<PERMISSION_REQUEST>>\` vào cuối câu trả lời.
  + Nếu ĐÃ ĐƯỢC CẤP quyền: Dưới đây là dữ liệu chi tiêu (đóng vai trò như database) của user:
    ${JSON.stringify(mockTransactions)}
    Hãy truy vấn database ảo này, tính toán và liệt kê chi tiết một cách chính xác dựa trên sự thật đó.

LUẬT 2 - GỢI Ý PHÂN LOẠI CHI TIÊU (CORRECTION PATH 1):
- Khi user khai báo một khoản chi tiêu mới (ví dụ: 'tôi vừa tiêu 50k ăn phở'), bạn KHÔNG ĐƯỢC tự động chốt danh mục phân loại.
- Bạn phải hỏi lại user để xác nhận, và BẮT BUỘC thêm chuỗi \`<<CLASSIFY_SUGGESTION>> {"suggestions": ["Danh mục 1", "Danh mục 2", "Danh mục 3"]}\` vào cuối câu. Suy luận 3 danh mục phù hợp nhất với khoản chi đó.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: formattedMessages,
      config: {
        systemInstruction,
        temperature: 0.2, 
      }
    });

    return NextResponse.json({ content: response.text });

  } catch (error: any) {
    console.error('API Error:', error);
    if (error.message?.includes('not found') || error.message?.includes('model')) {
        return NextResponse.json({ content: "Lỗi: Model gemini-3.5-flash không tồn tại hoặc chưa được hỗ trợ. Vui lòng kiểm tra lại cấu hình model." }, { status: 500 });
    }
    return NextResponse.json({ content: "Có lỗi xảy ra từ máy chủ." }, { status: 500 });
  }
}

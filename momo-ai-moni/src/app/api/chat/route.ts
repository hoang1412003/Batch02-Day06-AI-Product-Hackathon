import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GOOGLE_API_KEY;

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      console.warn("GOOGLE_API_KEY is not set. Returning mock response.");
      return NextResponse.json({ content: "Vui lòng thiết lập biến môi trường GOOGLE_API_KEY." });
    }

    const { messages, permissionGranted } = await req.json();

    // Lấy tin nhắn cuối cùng của user
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase();

    // ---- THỰC HIỆN CORRECTION PATHS (MOCK LOGIC Ở BACKEND) ----

    // Correction Path 3: Kiểm tra quyền truy cập dữ liệu chi tiêu
    if (lastMessage.includes('tổng chi') || lastMessage.includes('chi tiêu tháng này')) {
      if (!permissionGranted) {
        // AI không tự bịa số liệu, yêu cầu quyền
        return NextResponse.json({
          content: "Để tính toán chính xác tổng chi tiêu của bạn, tôi cần quyền truy cập vào dữ liệu giao dịch trong ví MoMo của bạn. <<PERMISSION_REQUEST>>"
        });
      } else {
        // Đã cấp quyền, trả về dữ liệu thật (mock data)
        return NextResponse.json({
          content: "Tổng chi tiêu của bạn trong tháng này là **120.000đ** (Gồm: Mua gói Google Pro, Thanh toán tiền điện)."
        });
      }
    }

    // Correction Path 1: Gợi ý phân loại thay vì tự áp đặt
    // Nếu user nhập một giao dịch (ví dụ: Vừa thanh toán 50k ăn phở)
    if (lastMessage.includes('thanh toán') || lastMessage.includes('mua') || lastMessage.includes('ăn')) {
      return NextResponse.json({
        content: `Tôi thấy bạn vừa có một khoản chi tiêu mới. Bạn muốn phân loại khoản này vào đâu để tôi ghi nhận? <<CLASSIFY_SUGGESTION>> {"suggestions": ["Ăn uống", "Mua sắm", "Đi lại"]}`
      });
    }

    // Nếu không thuộc các luồng đặc biệt, gọi Google GenAI thật
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Khởi tạo chat session (đơn giản hóa bằng cách gửi toàn bộ history)
    const formattedMessages = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // System instruction: Đóng vai Moni
    const systemInstruction = "Bạn là Moni, trợ lý AI quản lý tài chính cá nhân trên ứng dụng MoMo. Hãy trả lời ngắn gọn, thân thiện, xưng 'mình' và gọi 'bạn'.";

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: formattedMessages,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return NextResponse.json({ content: response.text });

  } catch (error: any) {
    console.error('API Error:', error);
    // Fallback error or version mismatch (e.g. gemini-3.5-flash doesn't exist yet)
    if (error.message?.includes('not found') || error.message?.includes('model')) {
        return NextResponse.json({ content: "Lỗi: Model gemini-3.5-flash không tồn tại hoặc chưa được hỗ trợ. Vui lòng kiểm tra lại cấu hình model." }, { status: 500 });
    }
    return NextResponse.json({ content: "Có lỗi xảy ra từ máy chủ." }, { status: 500 });
  }
}

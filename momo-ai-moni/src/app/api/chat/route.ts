import { NextResponse } from 'next/server';
import { MoniAgent } from '@/services/agent';

const apiKey = process.env.GOOGLE_API_KEY;

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      console.warn("GOOGLE_API_KEY is not set. Returning mock response.");
      return NextResponse.json({ content: "Vui lòng thiết lập biến môi trường GOOGLE_API_KEY." });
    }

    const { messages, permissionGranted } = await req.json();

    const agent = new MoniAgent(apiKey);
    const responseText = await agent.generateResponse(messages, permissionGranted);

    return NextResponse.json({ content: responseText });

  } catch (error: any) {
    console.error('API Error:', error);
    if (error.message?.includes('not found') || error.message?.includes('model')) {
        return NextResponse.json({ content: "Lỗi: Model gemini-3.5-flash không tồn tại hoặc chưa được hỗ trợ. Vui lòng kiểm tra lại cấu hình model." }, { status: 500 });
    }
    return NextResponse.json({ content: "Có lỗi xảy ra từ máy chủ." }, { status: 500 });
  }
}

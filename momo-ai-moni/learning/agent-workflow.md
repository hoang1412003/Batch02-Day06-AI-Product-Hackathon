# Luồng Hoạt Động Của Agent (MoniAgent)

Tài liệu này giải thích chi tiết luồng hoạt động của AI Agent quản lý tài chính "Moni" trong dự án.

## Tổng quan Kiến trúc

MoniAgent được thiết kế theo kiến trúc **RAG (Retrieval-Augmented Generation)** cơ bản kết hợp với **Google Gemini API**. Thay vì đẩy toàn bộ cơ sở dữ liệu vào prompt (gây tốn kém chi phí, dễ bị từ chối do quá giới hạn độ dài), Agent sẽ trích xuất (retrieval) dữ liệu liên quan nhất trước khi sinh ra câu trả lời (generation).

## Các bước của Luồng Hoạt Động

Dưới đây là các bước hệ thống xử lý khi người dùng nhắn một tin nhắn mới:

### 1. Tiếp nhận Request (API Route)
- Khi user gửi tin nhắn từ giao diện (Frontend), request được gọi đến `src/app/api/chat/route.ts`.
- Payload nhận được bao gồm:
  - `messages`: Mảng lịch sử trò chuyện.
  - `permissionGranted`: Cờ (boolean) xác định người dùng đã cấp quyền cho AI đọc lịch sử giao dịch của họ hay chưa.
- API Route khởi tạo class `MoniAgent` và gọi hàm `generateResponse()`.

### 2. Tiền xử lý dữ liệu và Trích xuất Câu hỏi
- Trong hàm `generateResponse()` của `MoniAgent`, hệ thống chuyển đổi định dạng `messages` thành định dạng chuẩn của Google GenAI (`user` và `model`).
- Hệ thống trích xuất tin nhắn cuối cùng (câu hỏi mới nhất của user) để chuẩn bị cho bước RAG.

### 3. RAG: Tìm kiếm Ngữ cảnh (Retrieval)
Hàm `retrieveRelevantContext(query)` được kích hoạt nếu `permissionGranted` là `true`.
- **Keyword Extraction**: Hệ thống phân tích câu hỏi của user, loại bỏ các "từ dừng" (stop words) vô nghĩa trong tiếng Việt như "là, có, không, tôi, bạn...". Phần còn lại là các từ khóa (keywords) cốt lõi (vd: "phở", "tháng 6").
- **Scoring & Filtering**: 
  - Hệ thống lặp qua toàn bộ cơ sở dữ liệu (tại `src/mock/database.ts`).
  - Mỗi dòng giao dịch sẽ được ghép thành một chuỗi (mô tả, người nhận, loại, danh mục).
  - Nếu chuỗi giao dịch này chứa các từ khóa, nó sẽ được cộng điểm (score). Các giao dịch mới hơn (dựa trên ID hoặc thời gian) sẽ được cộng thêm một chút trọng số ưu tiên.
- **Selection**: Sắp xếp kết quả theo điểm số từ cao xuống thấp và chỉ lấy ra tối đa **10 giao dịch** có điểm cao nhất. Đây chính là Ngữ cảnh (Context) thu gọn nhưng cực kỳ chính xác.
- *Fallback*: Nếu không tìm thấy từ khóa nào trùng khớp, hệ thống mặc định lấy 10 giao dịch gần nhất.

### 4. Xây dựng Prompt và Sinh câu trả lời (Generation)
- Dữ liệu thu được ở bước 3 (Context) được format thành chuỗi JSON.
- Xây dựng **System Instruction**:
  - Gán vai trò "Bạn là Moni...".
  - Tiêm các Luật (Luật quyền riêng tư, Luật phân loại chi tiêu).
  - Tiêm Context JSON vừa lấy được vào làm database ảo cho ngữ cảnh hiện tại.
- Gọi API `ai.models.generateContent` với model `gemini-3.5-flash` kèm theo tham số `temperature: 0.2` (giúp AI trả lời ổn định, bám sát số liệu, ít "ảo giác").

### 5. Trả về kết quả
- AI phản hồi bằng Text (chuỗi văn bản).
- Chuỗi văn bản này (có thể chứa các trigger đặc biệt như `<<PERMISSION_REQUEST>>` hay `<<CLASSIFY_SUGGESTION>>`) được trả ngược về Frontend qua API Route để Frontend tiến hành render UI/hiệu ứng tương ứng.

## Lợi ích của kiến trúc RAG hiện tại
- **Tiết kiệm Token**: Chỉ gửi cho Gemini tối đa 10 dòng giao dịch, rẻ hơn rất nhiều so với gửi hàng nghìn dòng.
- **Thời gian phản hồi nhanh**: Context ngắn giúp AI phân tích số liệu và sinh text nhanh hơn.
- **Tránh Hallucination (Ảo giác)**: AI bị ép vào một lượng data nhỏ và chính xác, khó có thể bịa ra số liệu sai lệch.

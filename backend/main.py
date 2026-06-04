import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from agent import MoniAgent

load_dotenv()

app = FastAPI()

# Allow CORS for Next.js frontend (default port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]
    permissionGranted: bool = False

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Warning: GOOGLE_API_KEY is not set. Returning mock response.")
        return {"content": "Vui lòng thiết lập biến môi trường GOOGLE_API_KEY trong tệp .env."}
        
    try:
        agent = MoniAgent(api_key=api_key)
        # Convert pydantic models to dict list
        messages_dict = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        response_text = agent.generate_response(messages_dict, request.permissionGranted)
        return {"content": response_text}
    except Exception as e:
        print(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Có lỗi xảy ra từ máy chủ backend Python.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

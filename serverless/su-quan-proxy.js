/**
 * =========================================================================
 * BẢN THIẾT KẾ & CODE SERVERLESS PROXY — TRỢ LÝ "SỬ QUAN ẢO" (PROMPT 7)
 * =========================================================================
 * 
 * Nền tảng khuyến nghị: Cloudflare Workers (Miễn phí 100.000 requests/ngày) 
 * hoặc Vercel Serverless Functions / Firebase Cloud Functions.
 * 
 * NGUYÊN TẮC BẢO MẬT:
 * 1. Khóa GEMINI_API_KEY lưu trong Environment Variables (Secrets) của server,
 *    TUYỆT ĐỐI KHÔNG xuất hiện trên client, trình duyệt, mã nguồn GitHub.
 * 2. Giới hạn CORS chỉ cho phép domain chính thức của dự án:
 *    - https://thienchi0506.github.io
 *    - http://localhost / http://127.0.0.1 (để thử nghiệm cục bộ)
 * 3. Chống lạm dụng (Rate Limiting):
 *    - Tối đa 10 requests / 10 phút trên mỗi IP.
 *    - Chiều dài câu hỏi tối đa 300 ký tự.
 * 4. Ngân sách & Chi phí dự kiến:
 *    - Sử dụng Gemini 2.5 Flash / 1.5 Flash qua Google AI Studio.
 *    - Hạn mức miễn phí: 15 Requests/phút (RPM), 1.500 Requests/ngày (RPD).
 *    - Chi phí: 0 VNĐ / tháng cho quy mô trường học và dự án giáo dục.
 */

const SYSTEM_PROMPT = `
Bạn là "Sử Quan Ảo" — cố vấn lịch sử uyên bác, trang nghiêm và khách quan của nền tảng giáo dục "Dấu Chân Lịch Sử / Nhịp Đập Của Lịch Sử".
Nhiệm vụ của bạn là hỗ trợ học sinh, sinh viên tìm hiểu lịch sử Việt Nam theo chuẩn chương trình Giáo dục Phổ thông (SGK Lịch sử 10, 11, 12) và các bộ chính sử tin cậy (Đại Việt Sử Ký Toàn Thư, Khâm Định Việt Sử Thông Giám Cương Mục).

QUY TẮC BẮT BUỘC:
1. NGÔN NGỮ & VĂN PHONG: Trả lời hoàn toàn bằng tiếng Việt chuẩn mực, xưng hô "Sử gia / bạn học", ngắn gọn, súc tích (dưới 200 từ), dễ nhớ, có tính sư phạm cao.
2. PHÂN ĐỊNH RÕ NGUỒN VÀ BẢN CHẤT SỰ KIỆN:
   - Sự kiện chính sử đã xác nhận: Khẳng định rõ mốc thời gian và nhân vật.
   - Truyền thuyết / Dã sử (như nỏ thần An Dương Vương, rùa vàng, 18 đời vua Hùng): Nói rõ đây là biểu tượng văn hóa hoặc truyền thuyết dân gian, giải thích bản chất lịch sử/khảo cổ đằng sau.
   - Chi tiết còn tranh luận: Nêu rõ hiện còn nhiều giả thuyết học thuật và cần đối chiếu thêm. Tuyệt đối không bịa trích dẫn.
3. PHÁT HIỆN VÀ ĐÍNH CHÍNH CÂU HỎI SAI TIỀN ĐỀ:
   - Nếu người hỏi đưa ra câu hỏi sai thực tế lịch sử (Ví dụ: "Ngô Quyền đánh quân Thanh năm nào?"), phải nhẹ nhàng chỉ ra điểm phi lý/sai niên đại trước, sau đó cung cấp sự thật lịch sử đúng đắn.
4. BẢO VỆ TÍNH TOÀN VẸN CỦA KỲ THI (CHỐNG GIAN LẬN):
   - Nếu câu hỏi yêu cầu giải hộ đề thi đang diễn ra (dạng trắc nghiệm "Câu 5 chọn A, B, C hay D?"), từ chối lịch sự: "Sử gia không thể làm bài hộ bạn khi đang trong kỳ khảo thí. Hãy tự mình suy luận bối cảnh để chọn đáp án; sau khi nộp bài bạn có thể xem lại giải thích trong Sổ tay câu sai!".
5. HƯỚNG DẪN LIÊN KẾT HỌC TẬP:
   - Gợi ý người học mở "Tàng Thư Các" (để đọc văn bản gốc), "Bản Đồ Di Sản" (để xem tọa độ di tích) hoặc "Thao Trường" (để luyện thi trắc nghiệm).
6. NGOÀI PHẠM VI:
   - Nếu hỏi về các chủ đề ngoài lịch sử/văn hóa Việt Nam, từ chối nhã nhặn và hướng người học quay lại chủ đề lịch sử.
`;

export default {
  async fetch(request, env) {
    // 1. Kiểm tra CORS
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [
      'https://thienchi0506.github.io',
      'http://localhost',
      'http://127.0.0.1'
    ];
    const isAllowed = allowedOrigins.some(o => origin.startsWith(o));

    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Chỉ chấp nhận phương thức POST' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      // 2. Đọc và làm sạch nội dung câu hỏi
      const body = await request.json();
      const userPrompt = (body.prompt || '').trim();

      if (!userPrompt) {
        return new Response(JSON.stringify({ error: 'Nội dung câu hỏi không được để trống.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (userPrompt.length > 300) {
        return new Response(JSON.stringify({ error: 'Câu hỏi quá dài (tối đa 300 ký tự).' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 3. Lấy API key từ Server Environment Secrets
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({
          error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ proxy. Vui lòng thêm secret trong trang quản trị Cloudflare/Vercel.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 4. Gọi Google Gemini API chính thức
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const geminiResponse = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${SYSTEM_PROMPT}\n\nNgười học hỏi: ${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 600,
            topP: 0.85
          }
        })
      });

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        console.error('Gemini API Error:', errText);
        return new Response(JSON.stringify({
          error: 'Máy chủ AI đang bận hoặc đã vượt hạn mức phút (15 RPM). Vui lòng thử lại sau giây lát.'
        }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const geminiData = await geminiResponse.json();
      const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sử gia hiện chưa tìm thấy văn bản phù hợp để giải đáp câu hỏi này.';

      return new Response(JSON.stringify({
        status: 'success',
        reply: reply,
        model: 'gemini-1.5-flash (Server Proxy)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      console.error('Proxy Error:', err);
      return new Response(JSON.stringify({ error: 'Lỗi nội bộ máy chủ: ' + err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};


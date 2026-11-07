// =========================================================================
// TRỢ LÝ LỊCH SỬ "SỬ QUAN ẢO" — CLIENT ENGINE (PROMPT 7)
// Nền tảng "Dấu Chân Lịch Sử" · Bảo vệ tính toàn vẹn kỳ thi & Không lộ khóa API
// =========================================================================

(function () {
  'use strict';

  // Cấu hình an toàn & Giới hạn
  const CONFIG = {
    MAX_INPUT_LENGTH: 250,
    COOLDOWN_MS: 4000,
    MAX_SESSION_QUERIES: 15,
    SESSION_STORAGE_KEY: 'dcls_sq_query_count_v1'
  };

  let lastQueryTimestamp = 0;
  let isAwaitingResponse = false;

  // 1. Tạo Giao diện HTML của Sử Quan Ảo
  function khoiTaoGiaoDienSuQuan() {
    if (document.getElementById('dcls-su-quan-modal-overlay')) return;

    // A. Nút nổi góc phải màn hình
    const floatBtn = document.createElement('div');
    floatBtn.id = 'dcls-su-quan-float-btn';
    floatBtn.className = 'dcls-su-quan-float-btn';
    floatBtn.setAttribute('role', 'button');
    floatBtn.setAttribute('tabindex', '0');
    floatBtn.setAttribute('aria-label', 'Mở trợ lý Sử Quan Ảo');
    floatBtn.setAttribute('title', 'Hỏi đáp Lịch sử cùng Sử Quan Ảo');
    floatBtn.innerHTML = `
      <span>📜</span>
      <span class="dcls-su-quan-float-badge">Sử</span>
    `;
    floatBtn.addEventListener('click', moModalSuQuanAo);
    document.body.appendChild(floatBtn);

    // B. Modal Chat
    const modalHtml = `
      <div id="dcls-su-quan-modal-overlay" class="dcls-su-quan-overlay" onclick="xuLyDongModalSuQuan(event)">
        <div class="dcls-su-quan-modal" role="dialog" aria-labelledby="dcls-sq-title" onclick="event.stopPropagation()">
          
          <!-- Header -->
          <div class="dcls-sq-header">
            <div class="dcls-sq-header-titles">
              <div class="dcls-sq-avatar">📜</div>
              <div>
                <h3 id="dcls-sq-title">Sử Quan Ảo — Viện Khảo Cứu</h3>
                <div class="dcls-sq-header-sub">Cố vấn giải đáp bối cảnh, mẹo ghi nhớ & chuẩn SGK Lịch sử</div>
              </div>
            </div>
            <button type="button" class="dcls-sq-close-btn" onclick="dongModalSuQuanAo()" aria-label="Đóng Sử Quan Ảo">✕</button>
          </div>

          <!-- Notice Bar -->
          <div class="dcls-sq-notice">
            <span>🛡️ <strong>Bảo vệ học tập:</strong> Không hỗ trợ giải hộ bài kiểm tra đang thi.</span>
            <span class="dcls-sq-notice-badge" id="dcls-sq-quota-badge">Lượt hỏi: 0/${CONFIG.MAX_SESSION_QUERIES}</span>
          </div>

          <!-- Suggestion Chips -->
          <div class="dcls-sq-suggestions" id="dcls-sq-chips-bar">
            <button type="button" class="dcls-sq-chip" onclick="guiCauHoiGoiY('Bối cảnh trận Bạch Đằng năm 938 có điểm gì đặc biệt?')">🌊 Trận Bạch Đằng 938</button>
            <button type="button" class="dcls-sq-chip" onclick="guiCauHoiGoiY('Nỏ thần An Dương Vương là truyền thuyết hay có thật?')">🏹 Nỏ thần Cổ Loa</button>
            <button type="button" class="dcls-sq-chip" onclick="guiCauHoiGoiY('Mẹo ghi nhớ 4 mốc lịch sử lớn: 1930, 1945, 1954, 1975?')">🧠 Mẹo nhớ 4 mốc vàng</button>
            <button type="button" class="dcls-sq-chip" onclick="guiCauHoiGoiY('Ngô Quyền đánh quân Thanh trên sông nào?')">⚠️ Thử câu sai tiền đề</button>
          </div>

          <!-- Chat Body -->
          <div class="dcls-sq-body" id="dcls-sq-chat-body">
            <div class="dcls-sq-msg assistant">
              <div class="dcls-sq-msg-avatar">📜</div>
              <div class="dcls-sq-msg-bubble">
                <p>Kính chào bạn học! Sử gia túc trực nơi đây để cùng bạn soi chiếu dòng chảy nghìn năm dựng nước và giữ nước của dân tộc.</p>
                <p>Bạn có thể hỏi về <strong>bối cảnh các chiến dịch, so sánh sự kiện, ý nghĩa nhân vật lịch sử, phân biệt truyền thuyết và sự thật khảo cổ</strong> hoặc <strong>mẹo ghi nhớ kiến thức thi tốt nghiệp THPT</strong>.</p>
                <div class="dcls-sq-msg-source">📚 Căn cứ học thuật: SGK Lịch Sử 10-12 & Đại Việt Sử Ký Toàn Thư</div>
              </div>
            </div>
          </div>

          <!-- Footer Input -->
          <div class="dcls-sq-footer">
            <form class="dcls-sq-input-wrapper" onsubmit="xuLyGuiCauHoi(event)">
              <input type="text" 
                     id="dcls-sq-input" 
                     class="dcls-sq-input" 
                     placeholder="Hỏi về bối cảnh, sự kiện, mẹo ghi nhớ... (tối đa 250 chữ)" 
                     maxlength="${CONFIG.MAX_INPUT_LENGTH}" 
                     autocomplete="off" 
                     oninput="capNhatBoDemKyTu(this.value)">
              <button type="submit" id="dcls-sq-submit-btn" class="dcls-sq-send-btn">
                <span>Vấn Đàm</span> ➔
              </button>
            </form>
            <div class="dcls-sq-meta-info">
              <span id="dcls-sq-char-counter">0/${CONFIG.MAX_INPUT_LENGTH} ký tự</span>
              <span id="dcls-sq-status-text">Khảo cứu nội sinh bảo mật 100%</span>
            </div>
          </div>

        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper.firstElementChild);
    capNhatHienThiQuota();
  }

  // 2. Mở / Đóng Modal
  window.moModalSuQuanAo = function () {
    khoiTaoGiaoDienSuQuan();
    const overlay = document.getElementById('dcls-su-quan-modal-overlay');
    if (overlay) {
      overlay.classList.add('open');
      const input = document.getElementById('dcls-sq-input');
      if (input) setTimeout(() => input.focus(), 150);
      cuonChatVeDay();
    }
  };

  window.dongModalSuQuanAo = function () {
    const overlay = document.getElementById('dcls-su-quan-modal-overlay');
    if (overlay) {
      overlay.classList.remove('open');
    }
  };

  window.xuLyDongModalSuQuan = function (event) {
    if (event.target.id === 'dcls-su-quan-modal-overlay') {
      dongModalSuQuanAo();
    }
  };

  // 3. Quản lý Quota và Bộ đếm
  function laySoLuotDaHoi() {
    return parseInt(sessionStorage.getItem(CONFIG.SESSION_STORAGE_KEY) || '0', 10);
  }

  function tangSoLuotDaHoi() {
    const curr = laySoLuotDaHoi() + 1;
    sessionStorage.setItem(CONFIG.SESSION_STORAGE_KEY, curr.toString());
    capNhatHienThiQuota();
  }

  function capNhatHienThiQuota() {
    const el = document.getElementById('dcls-sq-quota-badge');
    if (el) {
      el.textContent = `Lượt hỏi: ${laySoLuotDaHoi()}/${CONFIG.MAX_SESSION_QUERIES}`;
    }
  }

  window.capNhatBoDemKyTu = function (val) {
    const counter = document.getElementById('dcls-sq-char-counter');
    if (counter) {
      counter.textContent = `${val.length}/${CONFIG.MAX_INPUT_LENGTH} ký tự`;
      if (val.length >= CONFIG.MAX_INPUT_LENGTH) counter.style.color = '#E74C3C';
      else counter.style.color = 'rgba(232, 213, 176, 0.6)';
    }
  };

  function cuonChatVeDay() {
    const body = document.getElementById('dcls-sq-chat-body');
    if (body) {
      setTimeout(() => { body.scrollTop = body.scrollHeight; }, 50);
    }
  }

  // 4. Kiểm tra phòng thi đang diễn ra (Exam-Cheat Shield)
  function kiemTraDangTrongGioThi() {
    // Nếu đang ở thao-truong.html và bài thi đang chạy (chưa nộp)
    if (window.location.pathname.includes('thao-truong') || document.getElementById('test-screen')) {
      const testScreen = document.getElementById('test-screen');
      if (testScreen && testScreen.style.display !== 'none') {
        return true;
      }
      if (typeof window.isExamRunning === 'boolean' && window.isExamRunning) {
        return true;
      }
    }
    return false;
  }

  // 5. Gửi câu hỏi gợi ý nhanh
  window.guiCauHoiGoiY = function (cauHoi) {
    const input = document.getElementById('dcls-sq-input');
    if (input) {
      input.value = cauHoi;
      capNhatBoDemKyTu(cauHoi);
      xuLyGuiCauHoi(new Event('submit'));
    }
  };

  // 6. Xử lý Gửi Câu hỏi
  window.xuLyGuiCauHoi = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isAwaitingResponse) return;

    const input = document.getElementById('dcls-sq-input');
    if (!input) return;
    const query = input.value.trim();
    if (!query) return;

    // Kiểm tra cooldown
    const now = Date.now();
    if (now - lastQueryTimestamp < CONFIG.COOLDOWN_MS) {
      alert(`Xin bạn học thư thả giây lát (${Math.ceil((CONFIG.COOLDOWN_MS - (now - lastQueryTimestamp)) / 1000)}s) để sử gia tra cứu thư tịch.`);
      return;
    }

    // Kiểm tra quota
    if (laySoLuotDaHoi() >= CONFIG.MAX_SESSION_QUERIES) {
      themTinNhan('assistant', {
        text: '⚠️ Bạn học đã đạt hạn mức 15 câu hỏi trong phiên này nhằm bảo vệ tính tự lập tư duy. Hãy dành thời gian suy ngẫm, tự tra cứu Tàng Thư Các hoặc luyện bài tập trên Thao Trường!',
        source: 'Chính sách bảo vệ tính sư phạm & Chống quá tải'
      });
      return;
    }

    // A. Thêm tin nhắn người dùng
    themTinNhan('user', { text: query });
    input.value = '';
    capNhatBoDemKyTu('');
    lastQueryTimestamp = Date.now();
    tangSoLuotDaHoi();

    // B. Kiểm tra Anti-Cheat nếu đang làm bài thi
    const isCheatQuery = /(đáp án|câu\s*[0-9]+|chọn\s*[a-d]|chọn câu nào|đáp án là gì|câu này đúng hay sai)/i.test(query);
    if (kiemTraDangTrongGioThi() && isCheatQuery) {
      themTinNhan('assistant', {
        text: '🛡️ <strong>[Hiến Chương Khảo Thí]:</strong> Sử gia tuyệt đối không thể tiết lộ đáp án trong lúc bạn học đang làm bài thi khảo sát! Hãy tin vào năng lực phân tích và tư duy lịch sử của bản thân. Sau khi nộp bài, bạn có thể xem lại bài giải chi tiết trong <em>Sổ tay câu sai</em>.',
        source: 'Quy chế trung thực Thao Trường',
        links: []
      });
      return;
    }

    // C. Hiển thị trạng thái đang suy nghĩ
    const typingId = themTinNhanDangSuyNghi();
    isAwaitingResponse = true;
    datTrangThaiNutGui(true);

    try {
      let phanHoi = null;

      // Ưu tiên 1: Nếu chủ dự án đã cấu hình Proxy Serverless
      if (window.DCLS_SU_QUAN_API_ENDPOINT && typeof window.DCLS_SU_QUAN_API_ENDPOINT === 'string') {
        phanHoi = await goiApiServerProxy(query);
      } else {
        // Ưu tiên 2: Sử dụng Bộ tri thức Khảo cứu Nội sinh chuẩn xác, không tốn phí và an toàn bảo mật 100%
        await new Promise(r => setTimeout(r, 650)); // Độ trễ tự nhiên
        phanHoi = xuLyHoiDapNoiSinh(query);
      }

      xoaTinNhanDangSuyNghi(typingId);
      themTinNhan('assistant', phanHoi);
    } catch (err) {
      xoaTinNhanDangSuyNghi(typingId);
      themTinNhan('assistant', {
        text: '⚠️ Sử gia gặp trục trặc khi kết nối thư viện tư liệu. Vui lòng thử lại sau giây lát hoặc tra cứu trực tiếp tại Tàng Thư Các.',
        source: 'Lỗi kết nối mạng: ' + (err.message || 'Không rõ nguyên nhân')
      });
    } finally {
      isAwaitingResponse = false;
      datTrangThaiNutGui(false);
      cuonChatVeDay();
    }
  };

  // 7. Gọi API Server Proxy (Nếu có cấu hình)
  async function goiApiServerProxy(query) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(window.DCLS_SU_QUAN_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: query }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
    }

    const data = await res.json();
    return {
      text: data.reply || 'Sử gia chưa có thông tin chính xác về câu hỏi này.',
      source: 'Mô hình học thuật: ' + (data.model || 'Gemini Serverless AI')
    };
  }

  // 8. BỘ TRI THỨC KHẢO CỨU NỘI SINH (RULE-BASED & VERIFIED KNOWLEDGE ENGINE)
  // Xử lý thông minh các tình huống: Sai tiền đề, Dã sử vs Sự thật, Các mốc vàng, Bối cảnh & Mẹo nhớ
  function xuLyHoiDapNoiSinh(q) {
    const raw = q.toLowerCase();

    // A. PHÁT HIỆN CÂU HỎI SAI TIỀN ĐỀ (FALSE-PREMISE RECTIFICATION)
    if (raw.includes('ngô quyền') && (raw.includes('thanh') || raw.includes('quân thanh') || raw.includes('mãn thanh'))) {
      return {
        text: '⚠️ <strong>Đính chính sai tiền đề lịch sử:</strong> Tiền Ngô Vương <strong>Ngô Quyền không đánh quân Thanh</strong>.<br><br>• Năm <strong>938</strong>, Ngô Quyền lãnh đạo nhân dân đánh tan quân <strong>Nam Hán</strong> trên sông Bạch Đằng, chấm dứt hơn 1000 năm Bắc thuộc.<br>• Quân <strong>Mãn Thanh</strong> sang xâm lược nước ta vào cuối thế kỷ XVIII và bị Hoàng đế <strong>Quang Trung (Nguyễn Huệ)</strong> đại phá thần tốc vào mùa xuân Kỷ Dậu năm <strong>1789</strong> tại Ngọc Hồi - Đống Đa.',
        source: 'Đại Việt Sử Ký Toàn Thư & Khâm Định Việt Sử Thông Giám Cương Mục',
        links: [
          { text: '🌊 Xem Sa Bàn Bạch Đằng 938', url: 'sa-ban.html' },
          { text: '⚔️ Làm bài thi Quang Trung', url: 'thao-truong.html' }
        ]
      };
    }

    if (raw.includes('lý thường kiệt') && (raw.includes('lam sơn') || raw.includes('quân minh'))) {
      return {
        text: '⚠️ <strong>Đính chính sai tiền đề lịch sử:</strong> Thái úy <strong>Lý Thường Kiệt</strong> sống ở thế kỷ XI (triều Lý), nổi danh với trận chiến bên phòng tuyến sông Như Nguyệt (1077) đập tan quân Tống.<br><br>Khởi nghĩa <strong>Lam Sơn</strong> chống quân xâm lược <strong>Minh</strong> (1418 – 1427) diễn ra ở thế kỷ XV do <strong>Lê Lợi</strong> khởi xướng cùng sự phò tá của quân sư <strong>Nguyễn Trãi</strong>.',
        source: 'Đại Việt Sử Ký Toàn Thư (Bản kỷ, quyển 3 & quyển 10)',
        links: [
          { text: '✍️ Đọc Bình Ngô Đại Cáo', url: 'tang-thu-cac.html' }
        ]
      };
    }

    if (raw.includes('trần hưng đạo') && (raw.includes('chống pháp') || raw.includes('chống mỹ'))) {
      return {
        text: '⚠️ <strong>Đính chính sai tiền đề lịch sử:</strong> Quốc công Tiết chế <strong>Trần Hưng Đạo (Trần Quốc Tuấn)</strong> là anh hùng dân tộc thế kỷ XIII, lãnh đạo quân dân Đại Việt ba lần đại thắng quân xâm lược <strong>Nguyên - Mông</strong> (1258, 1285, 1287–1288).<br><br>Kháng chiến chống Pháp (1945–1954) và chống Mỹ (1954–1975) diễn ra trong thời đại Hồ Chí Minh ở thế kỷ XX.',
        source: 'SGK Lịch Sử 11 & 12 (Chương trình GDPT mới)',
        links: [
          { text: '📜 Khảo cứu Hịch Tướng Sĩ', url: 'tang-thu-cac.html' }
        ]
      };
    }

    if (raw.includes('tuyên ngôn độc lập') && (raw.includes('1954') || raw.includes('1975'))) {
      return {
        text: '⚠️ <strong>Đính chính sai niên đại:</strong> Chủ tịch Hồ Chí Minh đọc <em>Tuyên ngôn Độc lập</em> khai sinh nước Việt Nam Dân chủ Cộng hòa vào ngày <strong>2 tháng 9 năm 1945</strong> tại Quảng trường Ba Đình.<br><br>• Năm <strong>1954</strong> là Chiến thắng Điện Biên Phủ và ký kết Hiệp định Genève.<br>• Năm <strong>1975</strong> là Đại thắng mùa Xuân giải phóng hoàn toàn miền Nam.',
        source: 'Hồ Chí Minh Toàn tập & Lịch sử Đảng Cộng sản Việt Nam',
        links: [{ text: '⚔️ Luyện đề Khối 12', url: 'thao-truong.html' }]
      };
    }

    // B. TRUYỀN THUYẾT DÂN GIAN VS SỰ THẬT KHẢO CỔ
    if (raw.includes('nỏ thần') || raw.includes('an dương vương') || raw.includes('cổ loa')) {
      return {
        text: '🏹 <strong>Phân định giữa Truyền thuyết và Khảo cổ:</strong><br><br>• <strong>Về mặt truyền thuyết:</strong> Nỏ thần Kim Quy bắn một phát ra hàng vạn mũi tên là hình tượng dân gian hóa, thể hiện niềm tự hào về vũ khí siêu việt bảo vệ bờ cõi Âu Lạc.<br>• <strong>Về mặt khảo cổ học thực chứng:</strong> Tại di tích Cầu Vực (Khu di tích Cổ Loa, Đông Anh, Hà Nội), các nhà khảo cổ đã khai quật hàng vạn mũi tên đồng ba cạnh sắc nhọn và cơ cấu lẫy nỏ bằng đồng thời Đông Sơn có khả năng lắp lẫy bắn nhiều mũi tên cùng lúc (bắn liên châu). Đây là minh chứng kỹ thuật quân sự đỉnh cao của người Việt cổ thời An Dương Vương.',
        source: 'Viện Khảo cổ học Việt Nam & Hồ sơ Di tích Quốc gia Đặc biệt Cổ Loa',
        links: [
          { text: '🗺️ Vị trí Di tích Cổ Loa', url: 'trang-chinh.html' }
        ]
      };
    }

    if (raw.includes('hùng vương') || raw.includes('18 đời') || raw.includes('mười tám đời')) {
      return {
        text: '👑 <strong>Khảo cứu về "18 đời Hùng Vương":</strong><br><br>Theo các nhà nghiên cứu lịch sử và văn bản học, con số <strong>18 đời vua Hùng</strong> không phải là 18 cá nhân cụ thể, mà là <strong>18 chi/ngành vương triều</strong> cai trị nối tiếp nhau trong hơn một thiên niên kỷ thời kỳ Văn Lang (từ thế kỷ VII TCN đến năm 258 TCN).<br><br>Con số 18 mang tính ước lệ văn hóa cổ (bội số của 9 - con số thiêng trong quan niệm Á Đông), đại diện cho sự trường tồn của dòng giống Lạc Hồng.',
        source: 'Khảo luận Văn hóa Dân gian & Lịch sử Việt Nam tập 1 (GS. Phan Huy Lê)',
        links: [{ text: '🏺 Xem Cổ vật Trống đồng Ngọc Lũ', url: 'trang-chinh.html' }]
      };
    }

    // C. CHIẾN DỊCH BẠCH ĐẰNG
    if (raw.includes('bạch đằng') || raw.includes('938') || raw.includes('1288')) {
      return {
        text: '🌊 <strong>Chiến trường Thủy chiến Bạch Đằng Giang:</strong><br><br>Dòng sông Bạch Đằng ghi dấu 3 chiến công hiển hách bậc nhất sử Việt:<br>1. <strong>Năm 938:</strong> Ngô Quyền vận dụng thủy triều và bãi cọc nhọn đập tan quân Nam Hán, giết chết Lưu Hoằng Tháo.<br>2. <strong>Năm 981:</strong> Thập đạo Tướng quân Lê Hoàn đánh tan quân Tống trên sông Bạch Đằng.<br>3. <strong>Năm 1288:</strong> Quốc công Tiết chế Trần Hưng Đạo bắt sống Ô Mã Nhi, tiêu diệt hoàn toàn đạo thủy binh Nguyên - Mông.<br><br><em>Chi tiết cần đối chiếu:</em> Các bãi cọc Yên Giang, Đồng Má Ngựa (Quảng Ninh) và mới nhất là Cao Quỳ (Hải Phòng - phát hiện năm 2019) đã được chứng minh niên đại C-14 hoàn toàn trùng khớp với trận địa năm 1288.',
        source: 'Đại Việt Sử Ký Toàn Thư & Báo cáo Khảo cổ Bãi cọc Cao Quỳ',
        links: [
          { text: '🪵 Khảo cứu Bãi cọc Bạch Đằng', url: 'tang-thu-cac.html' },
          { text: '🗺️ Mở Sa Bàn Tác Chiến Bạch Đằng', url: 'sa-ban.html' }
        ]
      };
    }

    // D. NHƯ NGUYỆT & NAM QUỐC SƠN HÀ
    if (raw.includes('như nguyệt') || raw.includes('nam quốc sơn hà') || raw.includes('lý thường kiệt')) {
      return {
        text: '🛡️ <strong>Phòng tuyến Sông Như Nguyệt & Bài thơ thần:</strong><br><br>Năm 1077, Lý Thường Kiệt xây dựng phòng tuyến bờ nam sông Như Nguyệt (sông Cầu) chặn đứng 10 vạn quân Tống do Quách Quỳ chỉ huy. Trong đêm tối, bài thơ <em>"Nam quốc sơn hà Nam đế cư"</em> vang lên tại đền Trương Hống, Trương Hát cổ vũ tinh thần quân sĩ Đại Việt và làm quân địch khiếp đảm.<br><br><em>Tính tranh luận văn bản học:</em> Bài thơ khuyết danh tác giả trong thư tịch cổ; Lý Thường Kiệt là người có công vận dụng bài thơ xuất sắc vào nghệ thuật tâm lý chiến.',
        source: 'Việt Điện U Linh Tập & Đại Việt Sử Ký Toàn Thư',
        links: [
          { text: '✍️ Đọc trọn bài khảo cứu Nam Quốc Sơn Hà', url: 'tang-thu-cac.html' }
        ]
      };
    }

    // E. ĐIỆN BIÊN PHỦ
    if (raw.includes('điện biên') || raw.includes('1954') || raw.includes('de castries') || raw.includes('de cát')) {
      return {
        text: '⭐ <strong>Chiến dịch Điện Biên Phủ (13/3 – 7/5/1954):</strong><br><br>Sau 56 ngày đêm "khoét núi, ngủ hầm, mưa dầm, cơm vắt", quân đội ta dưới sự chỉ huy của Đại tướng Võ Nguyên Giáp đã tiêu diệt hoàn toàn tập đoàn cứ điểm mạnh nhất Đông Dương của thực dân Pháp.<br><br>Quyết định thay đổi phương châm tác chiến từ <em>"Đánh nhanh thắng nhanh"</em> sang <em>"Đánh chắc tiến chắc"</em> của Đại tướng được coi là quyết định lịch sử khó khăn và sáng suốt nhất.',
        source: 'SGK Lịch Sử 12 & Hồi ức "Điện Biên Phủ - Điểm hẹn lịch sử"',
        links: [
          { text: '🗺️ Tọa độ Chiến trường Điện Biên', url: 'trang-chinh.html' },
          { text: '⚔️ Thi đề Chống Pháp trên Thao Trường', url: 'thao-truong.html' }
        ]
      };
    }

    // F. MẸO GHI NHỚ MỐC LỊCH SỬ THI THPT
    if (raw.includes('mẹo') || raw.includes('cách nhớ') || raw.includes('ghi nhớ') || raw.includes('công thức')) {
      return {
        text: '🧠 <strong>Mẹo ghi nhớ 4 Mốc Thời Gian Vàng (Lịch Sử 12):</strong><br><br>Nhớ theo công thức <strong>"30 - 45 - 54 - 75"</strong>:<br>1. <strong>1930:</strong> Thành lập Đảng Cộng sản Việt Nam (Mở đầu kỷ nguyên cách mạng).<br>2. <strong>1945:</strong> Cách mạng Tháng Tám & Độc lập nước nhà (+15 năm từ khi có Đảng).<br>3. <strong>1954:</strong> Chiến thắng Điện Biên Phủ & Hiệp định Genève (Kết thúc 9 năm kháng chiến chống Pháp).<br>4. <strong>1975:</strong> Đại thắng mùa Xuân giải phóng miền Nam thống nhất đất nước (Kết thúc 21 năm kháng chiến chống Mỹ).<br><br><em>Mẹo trắc nghiệm:</em> Luôn tìm từ khóa nguyên nhân sâu xa (thường là kinh tế/xã hội) khác với duyên cớ trực tiếp (ngòi nổ sự kiện).',
        source: 'Cẩm nang Ôn thi THPT Quốc gia môn Lịch sử',
        links: [{ text: '⚔️ Luyện đề phân loại câu hỏi', url: 'thao-truong.html' }]
      };
    }

    // G. CÂU HỎI NGOÀI PHẠM VI
    if (raw.includes('toán') || raw.includes('hóa') || raw.includes('vật lý') || raw.includes('lập trình') || raw.includes('game') || raw.includes('thời tiết')) {
      return {
        text: '📜 Sử gia chuyên tâm vào việc khảo đàm bối cảnh lịch sử, nhân vật dựng nước và giữ nước cùng các mốc sự kiện trong chương trình Lịch sử Việt Nam. Mong bạn học hoan hỉ đặt câu hỏi liên quan đến lịch sử để sử gia giải đáp thấu đáo nhất!',
        source: 'Phạm vi học thuật của Viện Sử Quan'
      };
    }

    // H. CÂU HỎI MẶC ĐỊNH / CHUNG CHUNG
    return {
      text: `Sử gia đã lắng nghe câu hỏi của bạn học về <em>"${q.replace(/</g, '&lt;')}"</em>.<br><br>Để câu trả lời sát với chương trình học nhất, bạn có thể hỏi cụ thể hơn về: <strong>nguyên nhân, bối cảnh, nhân vật lãnh đạo, ý nghĩa lịch sử</strong> hoặc <strong>so sánh sự kiện tương đồng</strong> trong SGK Lịch Sử 10, 11, 12.<br><br>Bạn cũng có thể mở kho tư liệu gốc tại <strong>Tàng Thư Các</strong> hoặc thử sức các bộ đề thi khảo sát tại <strong>Thao Trường</strong>.`,
      source: 'Hệ thống tra cứu Sử Quan Ảo v1.0',
      links: [
        { text: '📜 Đến Tàng Thư Các', url: 'tang-thu-cac.html' },
        { text: '⚔️ Vào Thao Trường Khảo Thí', url: 'thao-truong.html' }
      ]
    };
  }

  // 9. Render tin nhắn vào Chat Log
  function themTinNhan(role, data) {
    const chatBody = document.getElementById('dcls-sq-chat-body');
    if (!chatBody) return;

    const msgEl = document.createElement('div');
    msgEl.className = `dcls-sq-msg ${role}`;

    const isUser = (role === 'user');
    let linksHtml = '';
    if (data.links && data.links.length > 0) {
      linksHtml = `
        <div class="dcls-sq-actions-row">
          ${data.links.map(l => `<a href="${l.url}" class="dcls-sq-link-btn">${l.text}</a>`).join('')}
        </div>
      `;
    }

    let sourceHtml = '';
    if (data.source) {
      sourceHtml = `<div class="dcls-sq-msg-source">📚 ${data.source}</div>`;
    }

    msgEl.innerHTML = `
      <div class="dcls-sq-msg-avatar">${isUser ? '👤' : '📜'}</div>
      <div class="dcls-sq-msg-bubble">
        <div>${data.text}</div>
        ${sourceHtml}
        ${linksHtml}
      </div>
    `;

    chatBody.appendChild(msgEl);
    cuonChatVeDay();
  }

  function themTinNhanDangSuyNghi() {
    const chatBody = document.getElementById('dcls-sq-chat-body');
    if (!chatBody) return null;

    const id = 'typing-' + Date.now();
    const msgEl = document.createElement('div');
    msgEl.id = id;
    msgEl.className = 'dcls-sq-msg assistant';
    msgEl.innerHTML = `
      <div class="dcls-sq-msg-avatar">📜</div>
      <div class="dcls-sq-msg-bubble">
        <span class="dcls-sq-typing">
          <span class="dcls-sq-typing-dot"></span>
          <span class="dcls-sq-typing-dot"></span>
          <span class="dcls-sq-typing-dot"></span>
        </span>
      </div>
    `;
    chatBody.appendChild(msgEl);
    cuonChatVeDay();
    return id;
  }

  function xoaTinNhanDangSuyNghi(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function datTrangThaiNutGui(disabled) {
    const btn = document.getElementById('dcls-sq-submit-btn');
    if (btn) btn.disabled = disabled;
    const input = document.getElementById('dcls-sq-input');
    if (input) input.disabled = disabled;
  }

  // 10. Tự động khởi tạo khi tài liệu nạp xong
  document.addEventListener('DOMContentLoaded', () => {
    khoiTaoGiaoDienSuQuan();
  });

})();


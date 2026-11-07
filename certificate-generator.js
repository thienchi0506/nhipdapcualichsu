// =========================================================================
// TRÌNH TẠO ẢNH CHỨNG NHẬN THÀNH TÍCH XUẤT SẮC (PROMPT 10)
// Dành riêng cho học giả đạt điểm từ 9.0 trở lên · Canvas HD 1200x675
// Không dùng chữ ký/huy hiệu giả mạo cơ quan nhà nước · Tôn trọng bản quyền
// =========================================================================

(function () {
  'use strict';

  let currentCertData = null;

  // 1. Khởi tạo modal xem trước chứng nhận vào DOM
  function khoiTaoModalChungNhan() {
    if (document.getElementById('dcls-cert-modal-overlay')) return;

    const modalHtml = `
      <div id="dcls-cert-modal-overlay" class="cert-modal-overlay" onclick="xuLyDongModalChungNhan(event)">
        <div class="cert-modal-box" role="dialog" aria-labelledby="cert-modal-title" onclick="event.stopPropagation()">
          
          <div class="cert-modal-header">
            <h3 id="cert-modal-title">📜 Chiếu Chỉ Khải Hoàn — Chứng Nhận Xuất Sắc (≥ 9.0đ)</h3>
            <button type="button" class="cert-modal-close-btn" onclick="dongModalChungNhan()" aria-label="Đóng cửa sổ">✕</button>
          </div>

          <div class="cert-modal-body">
            <div class="cert-preview-wrapper">
              <canvas id="dcls-cert-canvas" width="1200" height="675" class="cert-preview-canvas"></canvas>
            </div>

            <!-- Tùy biến tên hiển thị trên chứng nhận -->
            <div class="cert-customize-row">
              <div class="cert-customize-label">
                <span>✍️ Tên người học hiển thị trên bằng khen:</span>
                <span id="cert-name-counter">14/30 ký tự</span>
              </div>
              <div class="cert-name-input-group">
                <input type="text" 
                       id="cert-name-input" 
                       class="cert-name-input" 
                       placeholder="Nhập họ và tên của bạn..." 
                       maxlength="30" 
                       value="Học Giả Sử Việt" 
                       oninput="onDoiTenChungNhan(this.value)">
                <button type="button" class="home-btn" style="padding: 0 16px; font-size: 0.85rem;" onclick="veLaiChungNhan()">
                  🔄 Vẽ Lại
                </button>
              </div>
            </div>
          </div>

          <div class="cert-modal-footer">
            <div class="cert-footer-disclaimer">
              ℹ️ <em>Chứng nhận vinh danh học tập nội bộ do nền tảng Dấu Chân Lịch Sử cấp. Không thay thế văn bằng, chứng chỉ chính thức của cơ quan nhà nước.</em>
            </div>
            <div class="cert-footer-actions">
              <button type="button" class="btn-cert-share" id="btn-cert-share" onclick="chiaSeChungNhan()" style="display: none;">
                📤 Chia Sẻ
              </button>
              <button type="button" class="btn-cert-download" onclick="taiAnhChungNhan()">
                📥 Tải Ảnh Bằng Khen (.PNG)
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper.firstElementChild);

    // Bật nút chia sẻ nếu trình duyệt hỗ trợ Web Share API
    if (navigator.share) {
      const shareBtn = document.getElementById('btn-cert-share');
      if (shareBtn) shareBtn.style.display = 'inline-flex';
    }
  }

  // 2. Mở modal và vẽ chứng nhận
  window.moModalChungNhan = function () {
    khoiTaoModalChungNhan();

    const btnCert = document.getElementById('btn-create-certificate');
    const scoreVal = parseFloat(btnCert ? btnCert.getAttribute('data-score') : '0');
    const examTitle = (btnCert ? btnCert.getAttribute('data-exam-title') : '') || 'Kỳ Khảo Thí Lịch Sử Chuẩn Quốc Gia';
    const rankTitle = (btnCert ? btnCert.getAttribute('data-rank') : '') || 'Bậc Đại Tướng Lịch Sử';

    // Điều kiện tiên quyết: Điểm số đã xác nhận phải >= 9.0
    if (isNaN(scoreVal) || scoreVal < 9.0) {
      alert('Chỉ học giả đạt điểm thi xuất sắc từ 9.0 trở lên mới có thể nhận Chứng nhận vinh danh!');
      return;
    }

    // Lấy tên người học từ tài khoản đăng nhập hoặc localStorage
    let defaultName = 'Học Giả Sử Việt';
    try {
      if (window.currentUser && window.currentUser.displayName) {
        defaultName = window.currentUser.displayName;
      } else if (localStorage.getItem('dcls_user_name')) {
        defaultName = localStorage.getItem('dcls_user_name');
      }
    } catch (_) {}

    const nameInput = document.getElementById('cert-name-input');
    if (nameInput) {
      nameInput.value = defaultName;
      capNhatBoDemTen(defaultName);
    }

    // Tạo mã chứng thực ngẫu nhiên dựa trên thời gian và điểm số
    const dateStr = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const certCode = 'DCLS-' + Date.now().toString(36).toUpperCase().slice(-6);

    currentCertData = {
      name: defaultName,
      score: scoreVal,
      examTitle: examTitle,
      rankTitle: rankTitle,
      date: dateStr,
      certCode: certCode
    };

    veLaiChungNhan();

    const overlay = document.getElementById('dcls-cert-modal-overlay');
    if (overlay) overlay.classList.add('open');
  };

  window.dongModalChungNhan = function () {
    const overlay = document.getElementById('dcls-cert-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  };

  window.xuLyDongModalChungNhan = function (e) {
    if (e.target.id === 'dcls-cert-modal-overlay') {
      dongModalChungNhan();
    }
  };

  window.onDoiTenChungNhan = function (val) {
    capNhatBoDemTen(val);
    if (currentCertData) {
      currentCertData.name = val.trim() || 'Học Giả Sử Việt';
      veLaiChungNhan();
    }
  };

  function capNhatBoDemTen(val) {
    const el = document.getElementById('cert-name-counter');
    if (el) el.textContent = `${val.length}/30 ký tự`;
  }

  // 3. Hàm vẽ chứng nhận trên Canvas 2D (Độ phân giải 1200 x 675 px)
  window.veLaiChungNhan = function () {
    const canvas = document.getElementById('dcls-cert-canvas');
    if (!canvas || !currentCertData) return;

    const ctx = canvas.getContext('2d');
    const w = 1200;
    const h = 675;

    // A. Nền ngoài màu sơn mài đen cung đình
    ctx.fillStyle = '#100502';
    ctx.fillRect(0, 0, w, h);

    // B. Nền trong chất liệu Giấy Dó / Giấy Điệp cổ
    const pad = 24;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;

    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, 600);
    bgGrad.addColorStop(0, '#FFFDF8');
    bgGrad.addColorStop(0.7, '#F6EBD9');
    bgGrad.addColorStop(1, '#E9DAC0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(pad, pad, innerW, innerH);

    // C. Khung viền chỉ vàng hoàng gia & Họa tiết góc
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#8B2500';
    ctx.strokeRect(pad + 8, pad + 8, innerW - 16, innerH - 16);

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#D4AF37';
    ctx.strokeRect(pad + 14, pad + 14, innerW - 28, innerH - 28);

    // Vẽ 4 góc hoa văn cổ
    veGocHoaVan(ctx, pad + 14, pad + 14, 1, 1);
    veGocHoaVan(ctx, w - pad - 14, pad + 14, -1, 1);
    veGocHoaVan(ctx, pad + 14, h - pad - 14, 1, -1);
    veGocHoaVan(ctx, w - pad - 14, h - pad - 14, -1, -1);

    // D. Tiêu đề Đầu Bằng Khen (Header)
    ctx.textAlign = 'center';

    // Mặt trời Đông Sơn nhỏ ở trên cùng
    veMatTroiDongSonNho(ctx, w / 2, 75);

    ctx.font = '700 13px "Be Vietnam Pro", Arial, sans-serif';
    ctx.fillStyle = '#8B2500';
    ctx.letterSpacing = '3px';
    ctx.fillText('NỀN TẢNG KHẢO CỨU & KHẢO THÍ LỊCH SỬ — DẤU CHÂN LỊCH SỬ', w / 2, 115);

    ctx.font = '900 32px "Playfair Display", "Noto Serif", Georgia, serif';
    ctx.fillStyle = '#7B1E1E';
    ctx.letterSpacing = '1px';
    ctx.fillText('CHIẾU CHỈ KHẢI HOÀN — BẢNG VÀNG THÀNH TÍCH', w / 2, 160);

    ctx.font = 'italic 15px "Noto Serif", Georgia, serif';
    ctx.fillStyle = '#5A3D28';
    ctx.fillText('Vinh danh học giả đã xuất sắc vượt qua bài khảo thí chuẩn cấu trúc Bộ GD&ĐT 2025', w / 2, 188);

    // E. Tên Người Học (Recipient Name)
    ctx.font = '600 16px "Be Vietnam Pro", Arial, sans-serif';
    ctx.fillStyle = '#73543F';
    ctx.fillText('Trân trọng trao tặng:', w / 2, 235);

    // Tự động co cỡ chữ nếu tên quá dài
    const recipientName = currentCertData.name.toUpperCase();
    let nameFontSize = 34;
    if (recipientName.length > 20) nameFontSize = 26;
    if (recipientName.length > 26) nameFontSize = 22;

    ctx.font = `900 ${nameFontSize}px "Playfair Display", "Noto Serif", Georgia, serif`;
    ctx.fillStyle = '#1A0802';
    ctx.fillText(recipientName, w / 2, 280);

    // Đường kẻ vàng trang trí dưới tên kèm 3 ngôi sao
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 180, 298);
    ctx.lineTo(w / 2 - 35, 298);
    ctx.moveTo(w / 2 + 35, 298);
    ctx.lineTo(w / 2 + 180, 298);
    ctx.stroke();

    ctx.font = '13px Arial';
    ctx.fillStyle = '#8B2500';
    ctx.fillText('★ ★ ★', w / 2, 302);

    // Lời công nhận
    ctx.font = 'italic 15px "Noto Serif", Georgia, serif';
    ctx.fillStyle = '#3D2516';
    ctx.fillText('Đã hoàn thành xuất sắc kỳ khảo thí với kết quả vượt trội và tư duy lịch sử sâu sắc', w / 2, 335);

    // F. 3 Khối Thông Tin Thành Tích (3 Badges)
    const boxY = 365;
    const boxH = 92;

    // Khối 1: Đề thi
    veKhungThongTin(ctx, 110, boxY, 300, boxH, 'ĐỀ THI KHẢO SÁT', currentCertData.examTitle, false);

    // Khối 2: Điểm số nổi bật ở giữa
    veKhungThongTin(ctx, 440, boxY, 320, boxH, 'ĐIỂM SỐ XUẤT SẮC', `${currentCertData.score.toFixed(1)} / 10.0`, true);

    // Khối 3: Danh hiệu
    veKhungThongTin(ctx, 790, boxY, 300, boxH, 'DANH HIỆU VINH DANH', currentCertData.rankTitle.replace(/^[👑🎖️⚔️🛡️📜\s]+/, ''), false);

    // G. Ngày Tháng & Mã Chứng Nhận
    ctx.textAlign = 'left';
    ctx.font = '13.5px "Noto Serif", Georgia, serif';
    ctx.fillStyle = '#4A301D';
    ctx.fillText(`🗓️ Ngày cấp: ${currentCertData.date}`, 110, 520);
    ctx.fillText(`🔑 Mã chứng thực: ${currentCertData.certCode}`, 110, 545);

    // H. Con Dấu Sơn Mài Đỏ (Cinnabar Stamp) phía phải
    veDauSonMai(ctx, 990, 530);

    // I. Tuyên bố từ chối trách nhiệm bắt buộc (Mandatory Disclaimer)
    ctx.textAlign = 'center';
    ctx.font = 'italic 11.5px "Be Vietnam Pro", Arial, sans-serif';
    ctx.fillStyle = '#73543F';
    ctx.fillText('Chứng nhận thành tích học tập nội bộ do nền tảng Dấu Chân Lịch Sử cấp. Không thay thế văn bằng, chứng chỉ chính thức của cơ quan nhà nước.', w / 2, 630);
  };

  // Vẽ họa tiết góc cổ điển
  function veGocHoaVan(ctx, x, y, dirX, dirY) {
    ctx.save();
    ctx.strokeStyle = '#8B2500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + dirY * 28);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dirX * 28, y);
    ctx.stroke();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + dirX * 6, y + dirY * 22);
    ctx.lineTo(x + dirX * 6, y + dirY * 6);
    ctx.lineTo(x + dirX * 22, y + dirY * 6);
    ctx.stroke();
    ctx.restore();
  }

  // Vẽ mặt trời Đông Sơn thu nhỏ
  function veMatTroiDongSonNho(ctx, cx, cy) {
    ctx.save();
    ctx.strokeStyle = '#C59B27';
    ctx.fillStyle = '#C59B27';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // 14 tia sáng
    for (let i = 0; i < 14; i++) {
      const angle = (i * 360 / 14) * Math.PI / 180;
      const x1 = cx + 8 * Math.cos(angle);
      const y1 = cy + 8 * Math.sin(angle);
      const x2 = cx + 18 * Math.cos(angle);
      const y2 = cy + 18 * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Vẽ hộp thông tin thành tích
  function veKhungThongTin(ctx, x, y, bw, bh, label, value, isHighlight) {
    ctx.save();
    ctx.fillStyle = isHighlight ? 'rgba(139, 37, 0, 0.08)' : 'rgba(255, 255, 255, 0.6)';
    ctx.strokeStyle = isHighlight ? '#8B2500' : '#D5C2A5';
    ctx.lineWidth = isHighlight ? 2 : 1;

    ctx.beginPath();
    ctx.roundRect(x, y, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '700 11px "Be Vietnam Pro", Arial, sans-serif';
    ctx.fillStyle = isHighlight ? '#8B2500' : '#73543F';
    ctx.letterSpacing = '1px';
    ctx.fillText(label, x + bw / 2, y + 24);

    if (isHighlight) {
      ctx.font = '900 30px "Playfair Display", Georgia, serif';
      ctx.fillStyle = '#B22222';
      ctx.fillText(value, x + bw / 2, y + 64);
    } else {
      ctx.font = '700 14px "Noto Serif", Georgia, serif';
      ctx.fillStyle = '#1A0802';
      let valStr = value;
      if (ctx.measureText(valStr).width > bw - 20) {
        valStr = valStr.substring(0, 26) + '...';
      }
      ctx.fillText(valStr, x + bw / 2, y + 60);
    }
    ctx.restore();
  }

  // Vẽ con dấu sơn mài đỏ đã xác thực
  function veDauSonMai(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-8 * Math.PI / 180);

    ctx.strokeStyle = 'rgba(178, 34, 34, 0.85)';
    ctx.fillStyle = 'rgba(178, 34, 34, 0.85)';
    ctx.lineWidth = 2.5;

    // Vòng tròn đôi
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 43, 0, Math.PI * 2);
    ctx.stroke();

    // Chữ trong con dấu
    ctx.textAlign = 'center';
    ctx.font = '900 10.5px "Be Vietnam Pro", sans-serif';
    ctx.fillText('DẤU CHÂN LỊCH SỬ', 0, -22);

    ctx.font = '900 13px "Playfair Display", serif';
    ctx.fillText('ĐÃ XÁC THỰC', 0, 4);

    ctx.font = '800 10px "Be Vietnam Pro", sans-serif';
    ctx.fillText('★ THAO TRƯỜNG ★', 0, 26);

    ctx.restore();
  }

  // 4. Tải Ảnh Xuống Máy (.PNG)
  window.taiAnhChungNhan = function () {
    const canvas = document.getElementById('dcls-cert-canvas');
    if (!canvas || !currentCertData) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const safeName = (currentCertData.name || 'hoc-gia')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-');

      const fileName = `chung-nhan-xuat-sac-${safeName}.png`;

      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Lỗi tải canvas:', err);
      // Fallback mở trong tab mới nếu trình duyệt hạn chế
      const dataUrl = canvas.toDataURL('image/png');
      const w = window.open('');
      if (w) {
        w.document.write(`<img src="${dataUrl}" style="max-width:100%;height:auto;" alt="Chứng nhận">`);
      }
    }
  };

  // 5. Chia Sẻ Ảnh Qua Web Share API
  window.chiaSeChungNhan = async function () {
    const canvas = document.getElementById('dcls-cert-canvas');
    if (!canvas || !navigator.share) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'chung-nhan-dau-chan-lich-su.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Chứng Nhận Lịch Sử Xuất Sắc',
            text: `Tôi vừa đạt ${currentCertData.score.toFixed(1)}/10.0 điểm trên Thao Trường Khảo Thí Dấu Chân Lịch Sử!`,
            files: [file]
          });
        } else {
          await navigator.share({
            title: 'Chứng Nhận Lịch Sử Xuất Sắc',
            text: `Tôi vừa đạt ${currentCertData.score.toFixed(1)}/10.0 điểm trên Thao Trường Khảo Thí Dấu Chân Lịch Sử!`
          });
        }
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Lỗi chia sẻ:', err);
      }
    }
  };

})();


// =========================================================================
// THANH THAO TÁC THUẬN TAY CÁI & VUỐT CHUYỂN CÂU MOBILE (PROMPT 9)
// Tối ưu trải nghiệm làm bài trên điện thoại · Không cản trở cuộn dọc hay zoom
// =========================================================================

(function () {
  'use strict';

  let currentActiveCardIndex = 0;
  let isSwipeLocked = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let isTrackingTouch = false;

  const SWIPE_CONFIG = {
    MIN_DISTANCE_X: 55,       // Khoảng cách ngang tối thiểu (px) để nhận diện vuốt
    MAX_TIME_MS: 500,         // Thời gian thao tác tối đa của một cú vuốt nhanh
    RATIO_X_TO_Y: 1.5,        // Tỷ lệ ngang/dọc để loại trừ cuộn dọc tự nhiên
    DEBOUNCE_MS: 320          // Khóa chống kích hoạt kép do pointer/touch song song
  };

  // 1. Thu thập danh sách thẻ câu hỏi đang hiển thị trong phòng thi
  function layDanhSachTheCauHoi() {
    const screenExam = document.getElementById('screen-exam');
    if (!screenExam) return [];
    // Lấy tất cả các thẻ câu hỏi trắc nghiệm (Phần I, II) và tự luận (Phần III)
    return Array.from(screenExam.querySelectorAll('.question-card, .essay-card'));
  }

  // 2. Tạo thanh thao tác thuận tay cái dưới đáy màn hình
  function khoiTaoThanhThaoTacDay() {
    const screenExam = document.getElementById('screen-exam');
    if (!screenExam) return;

    let bottomBar = document.getElementById('mobile-exam-bottom-bar');
    if (!bottomBar) {
      bottomBar = document.createElement('div');
      bottomBar.id = 'mobile-exam-bottom-bar';
      bottomBar.className = 'mobile-exam-bottom-bar';
      bottomBar.setAttribute('role', 'toolbar');
      bottomBar.setAttribute('aria-label', 'Thanh thao tác chuyển câu hỏi');
      bottomBar.innerHTML = `
        <button type="button" 
                class="mobile-bottom-btn mobile-bottom-btn--prev" 
                id="btn-mobile-prev-q" 
                onclick="window.chuyenCauTruocMobile()" 
                aria-label="Về câu hỏi trước">
          ◀ Trước
        </button>

        <button type="button" 
                class="mobile-bottom-btn mobile-bottom-btn--palette" 
                id="btn-mobile-palette-bottom" 
                onclick="window.toggleMobilePalette()" 
                aria-label="Mở bảng câu hỏi">
          <span id="mobile-bottom-bar-label">📋 Câu 1</span>
        </button>

        <button type="button" 
                class="mobile-bottom-btn mobile-bottom-btn--next" 
                id="btn-mobile-next-q" 
                onclick="window.chuyenCauTiepMobile()" 
                aria-label="Sang câu hỏi tiếp theo">
          Tiếp ▶
        </button>
      `;
      screenExam.appendChild(bottomBar);
    }

    capNhatTrangThaiThanhDay();
  }

  // 3. Cập nhật nhãn và trạng thái nút Trước / Sau
  function capNhatTrangThaiThanhDay() {
    const cards = layDanhSachTheCauHoi();
    const total = cards.length;
    if (total === 0) return;

    // Giới hạn chỉ mục hợp lệ
    if (currentActiveCardIndex < 0) currentActiveCardIndex = 0;
    if (currentActiveCardIndex >= total) currentActiveCardIndex = total - 1;

    const labelEl = document.getElementById('mobile-bottom-bar-label');
    const btnPrev = document.getElementById('btn-mobile-prev-q');
    const btnNext = document.getElementById('btn-mobile-next-q');

    if (labelEl) {
      labelEl.textContent = `📋 Câu ${currentActiveCardIndex + 1}/${total}`;
    }

    if (btnPrev) {
      btnPrev.disabled = (currentActiveCardIndex === 0);
    }
    if (btnNext) {
      btnNext.disabled = (currentActiveCardIndex === total - 1);
    }
  }

  // 4. Cuộn mượt đến thẻ câu hỏi mục tiêu
  window.dieuHuongDenCauHoiTheoChiMuc = function (targetIndex) {
    const cards = layDanhSachTheCauHoi();
    if (!cards || cards.length === 0) return;

    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex >= cards.length) targetIndex = cards.length - 1;

    currentActiveCardIndex = targetIndex;
    const targetCard = cards[targetIndex];

    if (targetCard) {
      // Dùng hàm scrollToQuestion có sẵn để cuộn mượt và trừ hao sticky header
      if (typeof window.scrollToQuestion === 'function') {
        window.scrollToQuestion(targetCard.id);
      } else {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Thêm hiệu ứng chớp nhẹ để mắt người học dễ định vị câu vừa chuyển
      targetCard.classList.remove('swipe-highlight-flash');
      void targetCard.offsetWidth; // Force reflow
      targetCard.classList.add('swipe-highlight-flash');
      setTimeout(() => {
        targetCard.classList.remove('swipe-highlight-flash');
      }, 500);
    }

    capNhatTrangThaiThanhDay();
  };

  window.chuyenCauTiepMobile = function () {
    const cards = layDanhSachTheCauHoi();
    if (currentActiveCardIndex < cards.length - 1) {
      window.dieuHuongDenCauHoiTheoChiMuc(currentActiveCardIndex + 1);
    }
  };

  window.chuyenCauTruocMobile = function () {
    if (currentActiveCardIndex > 0) {
      window.dieuHuongDenCauHoiTheoChiMuc(currentActiveCardIndex - 1);
    }
  };

  // 5. Bộ Nhận Diện Cử Chỉ Vuốt Ngang (Touch Swipe Recognizer)
  // Chỉ gắn vào màn hình thi, tuyệt đối không gắn toàn cục
  function khoiTaoBoLangNgheVuot() {
    const screenExam = document.getElementById('screen-exam');
    if (!screenExam || screenExam._swipeListenerAttached) return;

    screenExam._swipeListenerAttached = true;

    screenExam.addEventListener('touchstart', (e) => {
      // 1. Bỏ qua đa điểm (để người dùng zoom tự nhiên)
      if (e.touches.length > 1) {
        isTrackingTouch = false;
        return;
      }

      // 2. Bỏ qua nếu chạm vào phần tử tương tác (chọn đáp án, nút bấm, ô tự luận)
      const target = e.target;
      if (target.closest('button, input, textarea, a, .opt-card, .option-btn, .btn-true, .btn-false, .p2-choice-btn, .so-lua-player, .mobile-exam-bottom-bar, .mobile-exam-header')) {
        isTrackingTouch = false;
        return;
      }

      isTrackingTouch = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    screenExam.addEventListener('touchend', (e) => {
      if (!isTrackingTouch || isSwipeLocked) return;
      isTrackingTouch = false;

      if (!e.changedTouches || e.changedTouches.length === 0) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const duration = Date.now() - touchStartTime;

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Kiểm tra tiêu chí vuốt ngang:
      // - Thời gian hợp lý (< 500ms)
      // - Di chuyển ngang đủ ngưỡng (>= 55px)
      // - Tỷ lệ ngang vượt trội so với dọc (deltaX > deltaY * 1.5) để không nhầm với cuộn dọc
      const isHorizontalSwipe = Math.abs(deltaX) >= SWIPE_CONFIG.MIN_DISTANCE_X &&
                                Math.abs(deltaX) > Math.abs(deltaY) * SWIPE_CONFIG.RATIO_X_TO_Y &&
                                duration <= SWIPE_CONFIG.MAX_TIME_MS;

      if (isHorizontalSwipe) {
        isSwipeLocked = true;
        setTimeout(() => { isSwipeLocked = false; }, SWIPE_CONFIG.DEBOUNCE_MS);

        if (deltaX < 0) {
          // Vuốt sang trái -> Sang câu tiếp theo
          window.chuyenCauTiepMobile();
        } else {
          // Vuốt sang phải -> Về câu trước
          window.chuyenCauTruocMobile();
        }
      }
    }, { passive: true });

    // Xử lý hủy cử chỉ an toàn
    const resetTouch = () => { isTrackingTouch = false; };
    screenExam.addEventListener('touchcancel', resetTouch, { passive: true });
    window.addEventListener('pointercancel', resetTouch);
    window.addEventListener('orientationchange', resetTouch);
    window.addEventListener('blur', resetTouch);
  }

  // 6. Tự động đồng bộ số thứ tự câu khi người dùng cuộn dọc tự do
  function khoiTaoDongBoCuon() {
    let scrollDebounceTimer = null;

    window.addEventListener('scroll', () => {
      const screenExam = document.getElementById('screen-exam');
      if (!screenExam || !screenExam.classList.contains('active')) return;
      if (window.innerWidth > 768) return;

      if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer);
      scrollDebounceTimer = setTimeout(() => {
        const cards = layDanhSachTheCauHoi();
        if (cards.length === 0) return;

        const viewportCenter = window.innerHeight * 0.35;
        let closestIndex = 0;
        let closestDistance = Infinity;

        cards.forEach((card, idx) => {
          const rect = card.getBoundingClientRect();
          const dist = Math.abs(rect.top - viewportCenter);
          if (dist < closestDistance) {
            closestDistance = dist;
            closestIndex = idx;
          }
        });

        if (currentActiveCardIndex !== closestIndex) {
          currentActiveCardIndex = closestIndex;
          capNhatTrangThaiThanhDay();
        }
      }, 100);
    }, { passive: true });
  }

  // 7. Hỗ trợ phím mũi tên bàn phím khi làm bài (Khả năng tiếp cận Accessibility)
  window.addEventListener('keydown', (e) => {
    const screenExam = document.getElementById('screen-exam');
    if (!screenExam || !screenExam.classList.contains('active')) return;

    // Bỏ qua nếu đang gõ trong ô tự luận
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'TEXTAREA' || tag === 'INPUT') return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      window.chuyenCauTiepMobile();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      window.chuyenCauTruocMobile();
    }
  });

  // 8. Tự động khởi chạy khi trang nạp hoặc khi đổi màn hình
  function kiemTraVaKhoiTao() {
    khoiTaoThanhThaoTacDay();
    khoiTaoBoLangNgheVuot();
    khoiTaoDongBoCuon();
  }

  document.addEventListener('DOMContentLoaded', kiemTraVaKhoiTao);

  // Hook vào hàm showScreen có sẵn của Thao Trường
  const originalShowScreen = window.showScreen;
  window.showScreen = function (screenId) {
    if (typeof originalShowScreen === 'function') {
      originalShowScreen(screenId);
    }
    if (screenId === 'screen-exam') {
      currentActiveCardIndex = 0;
      setTimeout(() => {
        kiemTraVaKhoiTao();
        capNhatTrangThaiThanhDay();
      }, 150);
    }
  };

})();


// =========================================================================
// BỘ ĐIỀU KHIỂN GIAO DIỆN "TRÚC THƯ / GIẤY ĐIỆP" (PROMPT 8)
// Quản lý Chuyển đổi Theme Sáng / Tối toàn trang · Lưu cục bộ · Không bắt đăng nhập
// =========================================================================

(function () {
  'use strict';

  const THEME_STORAGE_KEY = 'dcls_theme';

  // 1. Xác định theme hiện tại (Chạy ngay lập tức khi nạp script để chống chớp giao diện FOUC)
  function xacDinhThemeBanDau() {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'truc-thu' || saved === 'dark') {
        return saved;
      }
      // Tôn trọng thiết lập hệ điều hành nếu người dùng chưa chọn thủ công
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'truc-thu';
      }
    } catch (_) {}
    return 'dark'; // Mặc định là giao diện Mực Cổ truyền thống
  }

  const initialTheme = xacDinhThemeBanDau();
  document.documentElement.setAttribute('data-theme', initialTheme);
  if (document.body) {
    document.body.classList.toggle('theme-truc-thu', initialTheme === 'truc-thu');
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.toggle('theme-truc-thu', initialTheme === 'truc-thu');
      capNhatTrangThaiCacNutBam();
    });
  }

  // 2. Hàm áp dụng theme
  window.setDclsTheme = function (themeName) {
    const isTrucThu = (themeName === 'truc-thu');
    const actualTheme = isTrucThu ? 'truc-thu' : 'dark';

    document.documentElement.setAttribute('data-theme', actualTheme);
    if (document.body) {
      document.body.classList.toggle('theme-truc-thu', isTrucThu);
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, actualTheme);
    } catch (_) {}

    // Cập nhật meta theme-color cho thanh điều hướng di động
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isTrucThu ? '#F5EFE0' : '#8B2500');
    }

    capNhatTrangThaiCacNutBam();

    // Phát sự kiện toàn cục để các biểu đồ SVG (Radar/Trend) hoặc Sa Bàn vẽ lại màu nếu cần
    window.dispatchEvent(new CustomEvent('dcls-theme-change', { detail: { theme: actualTheme } }));
  };

  // 3. Hàm chuyển đổi qua lại giữa Sáng và Tối
  window.toggleDclsTheme = function () {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = (current === 'truc-thu') ? 'dark' : 'truc-thu';
    window.setDclsTheme(next);
  };

  window.getDclsTheme = function () {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  };

  // 4. Cập nhật nhãn và biểu tượng trên tất cả nút bấm chuyển theme
  function capNhatTrangThaiCacNutBam() {
    const isTrucThu = (window.getDclsTheme() === 'truc-thu');
    const buttons = document.querySelectorAll('.btn-theme-toggle');

    buttons.forEach((btn) => {
      const iconSpan = btn.querySelector('.theme-toggle-icon');
      const textSpan = btn.querySelector('.theme-toggle-text');

      if (isTrucThu) {
        if (iconSpan) iconSpan.textContent = '🌙';
        if (textSpan) textSpan.textContent = 'Mực Cổ';
        btn.setAttribute('title', 'Chuyển sang giao diện Mực Cổ (Tối)');
        btn.setAttribute('aria-label', 'Chuyển sang giao diện Mực Cổ (Tối)');
      } else {
        if (iconSpan) iconSpan.textContent = '📜';
        if (textSpan) textSpan.textContent = 'Trúc Thư';
        btn.setAttribute('title', 'Chuyển sang giao diện Trúc Thư / Giấy Điệp (Sáng)');
        btn.setAttribute('aria-label', 'Chuyển sang giao diện Trúc Thư / Giấy Điệp (Sáng)');
      }
    });
  }

  // 5. Lắng nghe thay đổi theme từ hệ điều hành (chỉ khi người dùng chưa tự bấm chọn)
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      try {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
          window.setDclsTheme(e.matches ? 'truc-thu' : 'dark');
        }
      } catch (_) {}
    });
  }

  document.addEventListener('DOMContentLoaded', capNhatTrangThaiCacNutBam);

})();


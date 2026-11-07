// =========================================================================
// PWA CLIENT CONTROLLER — DẤU CHÂN LỊCH SỬ (PROMPT 6)
// Quản lý Service Worker, Cài đặt PWA, Trạng thái Ngoại tuyến & Bảo vệ Trải nghiệm
// =========================================================================

(function () {
  'use strict';

  let deferredInstallPrompt = null;

  // 1. Chỉ đăng ký Service Worker trên HTTPS hoặc localhost
  const isSecureContext = window.location.protocol === 'https:' || 
                          window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';

  if ('serviceWorker' in navigator && isSecureContext) {
    window.addEventListener('load', () => {
      // Xác định base URL của sw.js theo ngữ cảnh trang hiện tại
      const swUrl = new URL('sw.js', window.location.href).href;

      navigator.serviceWorker.register(swUrl)
        .then((registration) => {
          console.log('[DCLS PWA] Service Worker đăng ký thành công với phạm vi:', registration.scope);

          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Có bản cập nhật mới
                hienThongBaoCapNhat(registration);
              }
            });
          });
        })
        .catch((error) => {
          console.warn('[DCLS PWA] Đăng ký Service Worker thất bại (không ảnh hưởng trải nghiệm web thường):', error);
        });
    });
  }

  // 2. Xử lý sự kiện mời cài đặt (beforeinstallprompt)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window._dclsCanInstallPwa = true;
    hienThiNutCaiDatPwa(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window._dclsCanInstallPwa = false;
    hienThiNutCaiDatPwa(false);
    console.log('[DCLS PWA] Ứng dụng đã được cài đặt lên thiết bị.');
  });

  // Hàm kích hoạt popup cài đặt từ nút trên giao diện
  window.caiDatDclsPwa = function () {
    if (!deferredInstallPrompt) {
      alert('Để cài đặt ứng dụng Dấu Chân Lịch Sử:\n\n- Trên Chrome / Edge / Cốc Cốc: Bấm vào biểu tượng Cài đặt (Install / ⊕) trên thanh địa chỉ trình duyệt.\n- Trên Safari (iOS / iPad): Bấm nút Chia sẻ (Share) ⎋ -> Chọn "Thêm vào Màn hình chính" (Add to Home Screen).\n- Nếu bạn đang dùng ứng dụng ở chế độ PWA, không cần cài đặt lại.');
      return;
    }
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[DCLS PWA] Người dùng đã chấp nhận cài đặt.');
      } else {
        console.log('[DCLS PWA] Người dùng từ chối cài đặt.');
      }
      deferredInstallPrompt = null;
      hienThiNutCaiDatPwa(false);
    });
  };

  // 3. Giám sát trạng thái Mạng (Online / Offline)
  function capNhatTrangThaiMang() {
    const isOnline = navigator.onLine;
    const bannerEl = document.getElementById('dcls-network-status-banner');

    if (!isOnline) {
      if (!bannerEl) {
        taoBannerTrangThaiMang(false);
      } else {
        bannerEl.style.display = 'flex';
        bannerEl.className = 'dcls-net-banner offline';
        bannerEl.querySelector('.dcls-net-text').innerHTML = 
          '⚡ <strong>Chế độ Ngoại tuyến (Offline):</strong> Bạn đang học không cần Internet. Luyện tập 47 bộ đề thi, xem Sổ tay câu sai và tra cứu Tàng Thư Các vẫn hoạt động mượt mà. <em>(Đấu trí 1v1 trực tuyến cần kết nối lại; bạn vẫn có thể Đấu với Máy)</em>.';
      }

      // Vô hiệu hóa an toàn các nút thi đấu 1v1 trực tuyến nếu đang ở thao trường
      voHieuHoaPhongThiTrucTuyen(true);
    } else {
      if (bannerEl && bannerEl.classList.contains('offline')) {
        bannerEl.className = 'dcls-net-banner online';
        bannerEl.querySelector('.dcls-net-text').innerHTML = 
          '🟢 <strong>Đã kết nối lại Internet:</strong> Mọi tính năng trực tuyến, Bảng Vàng và Đấu trí 1v1 đã sẵn sàng.';
        setTimeout(() => {
          if (bannerEl) bannerEl.style.display = 'none';
        }, 3500);
      }
      voHieuHoaPhongThiTrucTuyen(false);
    }
  }

  window.addEventListener('online', capNhatTrangThaiMang);
  window.addEventListener('offline', capNhatTrangThaiMang);
  document.addEventListener('DOMContentLoaded', () => {
    capNhatTrangThaiMang();
    khoiTaoCssPwa();
  });

  // 4. Tạo banner thông báo trạng thái mạng thanh nhã
  function taoBannerTrangThaiMang(isOnline) {
    if (document.getElementById('dcls-network-status-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'dcls-network-status-banner';
    banner.className = `dcls-net-banner ${isOnline ? 'online' : 'offline'}`;
    banner.innerHTML = `
      <div class="dcls-net-content">
        <span class="dcls-net-text">
          ${isOnline 
            ? '🟢 <strong>Đã kết nối Internet</strong>' 
            : '⚡ <strong>Chế độ Ngoại tuyến (Offline):</strong> Bạn có thể luyện tập 47 bộ đề thi, xem Sổ tay câu sai & Tàng Thư Các không cần mạng. (Đấu trí 1v1 trực tuyến cần kết nối lại; bạn vẫn có thể Đấu với Máy).'}
        </span>
        <button type="button" class="dcls-net-close-btn" onclick="document.getElementById('dcls-network-status-banner').style.display='none'" aria-label="Đóng thông báo">✕</button>
      </div>
    `;
    document.body.prepend(banner);
  }

  // 5. Hiển thị / Ẩn nút cài đặt PWA
  function hienThiNutCaiDatPwa(show) {
    const installBtns = document.querySelectorAll('.btn-pwa-install');
    installBtns.forEach(btn => {
      btn.style.display = show ? 'inline-flex' : 'none';
    });
  }

  // 6. Hiển thị thông báo khi có bản cập nhật mới
  function hienThongBaoCapNhat(registration) {
    const toast = document.createElement('div');
    toast.className = 'dcls-pwa-update-toast';
    toast.innerHTML = `
      <div class="dcls-pwa-update-box">
        <span>🎉 Đã có bản cập nhật đề thi & di sản mới!</span>
        <button type="button" class="btn-pwa-reload" onclick="dclsKichHoatBanMoi()">Cập nhật ngay</button>
      </div>
    `;
    document.body.appendChild(toast);

    window.dclsKichHoatBanMoi = function () {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    };
  }

  // 7. Vô hiệu hóa phòng thi trực tuyến khi mất mạng
  function voHieuHoaPhongThiTrucTuyen(isOffline) {
    const createBtn = document.getElementById('btn-create-battle-room');
    const joinBtn = document.getElementById('btn-join-battle-room');
    const onlineNotice = document.getElementById('battle-online-notice');

    [createBtn, joinBtn].forEach(btn => {
      if (btn) {
        if (isOffline) {
          btn.setAttribute('data-prev-opacity', btn.style.opacity || '1');
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
          btn.title = 'Phòng thi trực tuyến cần kết nối Internet. Bạn vẫn có thể Đấu với Máy (AI) ngoại tuyến.';
        } else {
          btn.style.opacity = btn.getAttribute('data-prev-opacity') || '1';
          btn.style.cursor = 'pointer';
          btn.title = '';
        }
      }
    });

    if (onlineNotice) {
      onlineNotice.style.display = isOffline ? 'block' : 'none';
    }
  }

  // 8. Chèn CSS tối ưu cho PWA banners & toasts
  function khoiTaoCssPwa() {
    if (document.getElementById('dcls-pwa-styles')) return;
    const style = document.createElement('style');
    style.id = 'dcls-pwa-styles';
    style.textContent = `
      .dcls-net-banner {
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        width: 100%;
        z-index: 999999;
        padding: 9px 16px;
        font-size: 0.88rem;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        transition: all 0.3s ease;
      }
      .dcls-net-banner.offline {
        background: linear-gradient(90deg, #5A1208, #8B2500, #5A1208);
        color: #FFFDF8;
        border-bottom: 2px solid #D4AF37;
      }
      .dcls-net-banner.online {
        background: linear-gradient(90deg, #0E3D1E, #1E7E34, #0E3D1E);
        color: #E8F8F0;
        border-bottom: 2px solid #58D68D;
      }
      .dcls-net-content {
        max-width: 1100px;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .dcls-net-close-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        color: #FFF;
        font-size: 1rem;
        cursor: pointer;
        padding: 2px 8px;
        border-radius: 4px;
        transition: background 0.2s;
      }
      .dcls-net-close-btn:hover {
        background: rgba(255,255,255,0.4);
      }
      .btn-pwa-install {
        display: none;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, #8B2500, #B22222);
        color: #FFF8DC;
        border: 1px solid #D4AF37;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .btn-pwa-install:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(212,175,55,0.35);
      }
      .dcls-pwa-update-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        background: #1A0D08;
        border: 2px solid #D4AF37;
        color: #FFFDF8;
        padding: 12px 18px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        animation: dclsSlideUp 0.3s ease-out;
      }
      .dcls-pwa-update-box {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.9rem;
      }
      .btn-pwa-reload {
        background: #D4AF37;
        color: #1A0D08;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-weight: 700;
        cursor: pointer;
      }
      @keyframes dclsSlideUp {
        from { transform: translateY(40px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // 9. Công cụ chuẩn đoán và gỡ Service Worker an toàn
  window.dclsPwaTools = {
    kiemTraStatus: async function () {
      if (!('serviceWorker' in navigator)) {
        console.log('[DCLS PWA] Trình duyệt không hỗ trợ Service Worker.');
        return;
      }
      const regs = await navigator.serviceWorker.getRegistrations();
      console.log('[DCLS PWA] Số Service Workers đang hoạt động:', regs.length);
      const cacheNames = await caches.keys();
      console.log('[DCLS PWA] Danh sách Cache Storage hiện có:', cacheNames);
      alert(`Trạng thái PWA:\n- Service Worker: ${regs.length > 0 ? 'Đang hoạt động' : 'Chưa đăng ký'}\n- Caches: ${cacheNames.join(', ') || 'Không có'}\n- Trực tuyến: ${navigator.onLine ? 'Có Internet' : 'Ngoại tuyến'}`);
    },
    xoaToanBoCache: async function () {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      console.log('[DCLS PWA] Đã dọn dẹp sạch toàn bộ cache!');
      alert('Đã xóa sạch bộ nhớ tạm (Cache). Trang sẽ tải lại bản gốc mới nhất.');
      window.location.reload();
    },
    goBoServiceWorker: async function () {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let r of regs) {
          await r.unregister();
        }
        await this.xoaToanBoCache();
        alert('Đã gỡ bỏ toàn bộ Service Worker và Cache. Ứng dụng đã trở về trạng thái web thường.');
        window.location.reload();
      }
    }
  };
})();

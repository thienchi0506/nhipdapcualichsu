// =========================================================================
// SERVICE WORKER — DẤU CHÂN LỊCH SỬ (PWA & HỌC NGOẠI TUYẾN - PROMPT 6)
// =========================================================================

const CACHE_NAME = 'dcls-shell-v1.0.0';

// App Shell & Các tài nguyên học tập cốt lõi được phép lưu trữ ngoại tuyến
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './trang-chinh.html',
  './thao-truong.html',
  './tang-thu-cac.html',
  './site-music.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable.png',
  './assets/icons/icon.svg',
  './assets/images/di-tich/image1.jpg',
  './assets/images/di-tich/image2.jpg',
  './assets/images/di-tich/image3.jpg',
  './assets/images/di-tich/image4.jpg',
  './assets/images/di-tich/image5.jpg',
  './assets/images/di-tich/image6.jpg'
];

// Danh sách các domain và đường dẫn TUYỆT ĐỐI KHÔNG CACHE (Network Only)
// Bảo đảm an toàn danh tính, bảo mật Firestore, phòng thi 1v1 và tránh phình dung lượng
const NEVER_CACHE_PATTERNS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseio.com',
  'googletagmanager.com',
  'google-analytics.com',
  'res.cloudinary.com',
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  '/battleRooms/',
  '.glb',
  '.gltf'
];

// 1. Install Event: Cài đặt và nạp các tài nguyên App Shell cơ bản
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Dùng map để bắt lỗi từng file riêng lẻ, tránh trường hợp 1 file lỗi làm hỏng toàn bộ quá trình precache
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Không thể precache URL:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Dọn dẹp cache cũ khi nâng cấp phiên bản
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('dcls-') && key !== CACHE_NAME) {
            console.log('[SW] Xóa cache phiên bản cũ:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Kiểm tra URL có thuộc nhóm cấm cache không
function shouldNeverCache(urlStr) {
  return NEVER_CACHE_PATTERNS.some((pattern) => urlStr.includes(pattern));
}

// 3. Fetch Event: Định tuyến thông minh theo từng loại tài nguyên
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Bỏ qua các yêu cầu không phải GET hoặc extension schemes
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) return;

  const url = new URL(request.url);

  // Nhóm 1: Tài nguyên bảo mật / Firebase / Video ngoại tuyến -> NETWORK ONLY
  if (shouldNeverCache(request.url)) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            status: 'offline',
            message: 'Tính năng trực tuyến (Firebase/Đấu trí 1v1) không khả dụng khi mất mạng.'
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        );
      })
    );
    return;
  }

  // Nhóm 2: Tài liệu HTML / Trang điều hướng (App Shell) -> NETWORK FIRST
  // Ưu tiên tải bản mới nhất từ máy chủ để đề thi và sửa lỗi hiển thị ngay lập tức.
  // Nếu mất mạng hoặc mạng chậm/lỗi, lập tức lấy bản đã cache để người học không bị gián đoạn.
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          // Nếu trang cụ thể chưa có trong cache, fallback về trang sảnh chính
          const fallbackShell = await caches.match('./trang-chinh.html');
          if (fallbackShell) return fallbackShell;

          return new Response(
            `<!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="UTF-8"><title>Chế Độ Ngoại Tuyến — Dấu Chân Lịch Sử</title></head>
            <body style="background:#0c0806;color:#FFF8DC;font-family:sans-serif;text-align:center;padding:40px;">
              <h2>⚡ Bạn Đang Ở Chế Độ Ngoại Tuyến</h2>
              <p>Trang này chưa được lưu tạm. Vui lòng kết nối Internet hoặc mở <a href="./trang-chinh.html" style="color:#F1C40F;">Sảnh Chính</a> để tiếp tục ôn tập.</p>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Nhóm 3: Tài nguyên tĩnh (CSS, JS, Fonts, Ảnh) -> STALE-WHILE-REVALIDATE / CACHE-FIRST
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Nhận thông điệp từ giao diện người dùng
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


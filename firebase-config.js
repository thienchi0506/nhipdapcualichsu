// =========================================================================
//  CẤU HÌNH GOOGLE FIREBASE CHÍNH THỨC — DỰ ÁN: NHỊP ĐẬP CỦA LỊCH SỬ
// =========================================================================

const firebaseConfig = {
  apiKey: "AIzaSyCRf22tvqZ2LkhRPYmx7cEmJsKiZikwHBc",
  authDomain: "nhipdapcualichsu.firebaseapp.com",
  projectId: "nhipdapcualichsu",
  storageBucket: "nhipdapcualichsu.firebasestorage.app",
  messagingSenderId: "210871684998",
  appId: "1:210871684998:web:61c77d5608c627ee14e607",
  measurementId: "G-JMF58FGDRN"
};

// Gắn toàn cục cho trình duyệt (Window) để mọi trang đều truy cập được
if (typeof window !== 'undefined') {
  window.__FIREBASE_CONFIG__ = firebaseConfig;
}

// Hỗ trợ CommonJS nếu chạy trên Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}

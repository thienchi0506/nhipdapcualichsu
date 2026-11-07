import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, updateProfile, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

(() => {
    const firebaseConfig = window.__FIREBASE_CONFIG__;
    const cloudinaryConfig = window.__CLOUDINARY_CONFIG__ || {};
    if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) return;

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const style = document.createElement('style');
    style.textContent = `
        .site-account-widget{position:relative;display:inline-flex;align-items:center;z-index:10020;font:600 14px/1.3 system-ui,sans-serif}
        .site-account-trigger{display:inline-flex;align-items:center;gap:8px;min-height:42px;max-width:min(240px,48vw);padding:5px 12px;border:1px solid #c6a343;border-radius:999px;background:#352313;color:#ffe6a2;font:inherit;cursor:pointer;touch-action:manipulation}
        .site-account-trigger:hover,.site-account-trigger:focus-visible{background:#51321b;outline:2px solid #f1d36e;outline-offset:2px}
        .site-account-trigger img,.site-account-avatar{width:30px;height:30px;flex:0 0 30px;border-radius:50%;object-fit:cover;background:#775523;display:grid;place-items:center}
        .site-account-trigger img[hidden],.site-account-profile img[hidden]{display:none!important}
        .site-account-avatar[hidden]{display:none!important}
        .site-account-widget--compact .site-account-trigger{width:44px;min-width:44px;padding:5px;justify-content:center}
        .site-account-widget--compact .site-account-name,.site-account-widget--compact .site-account-trigger>span:last-child{display:none}
        .site-account-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .site-account-popover{position:absolute;top:calc(100% + 8px);right:0;width:min(320px,calc(100vw - 24px));padding:14px;border:1px solid #c6a343;border-radius:14px;background:#21170f;color:#f7ebd2;box-shadow:0 14px 36px #0008;z-index:10030}
        .site-account-popover[hidden]{display:none!important}
        .site-account-profile{display:flex;align-items:center;gap:11px;min-width:0;margin-bottom:14px}
        .site-account-profile img,.site-account-profile .site-account-avatar{width:48px;height:48px;flex:0 0 48px;border-radius:50%;object-fit:cover;background:#775523;display:grid;place-items:center;font-size:22px}
        .site-account-profile-text{min-width:0}.site-account-profile-text strong,.site-account-profile-text small{display:block;overflow-wrap:anywhere}.site-account-profile-text small{opacity:.76;margin-top:3px}
        .site-account-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .site-account-action{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:8px;border:1px solid #9b762e;border-radius:9px;background:#382716;color:#ffe6a2;font:inherit;cursor:pointer}
        .site-account-action:hover,.site-account-action:focus-visible{background:#513b20;outline:2px solid #f1d36e;outline-offset:1px}
        .site-account-action:disabled{opacity:.6;cursor:wait}.site-account-action--logout{border-color:#8e3b35;color:#ffd5cd}
        .site-account-status{margin:10px 0 0;color:#d9caab;font-size:12px;overflow-wrap:anywhere}.site-account-status[data-kind=error]{color:#ffaaa0}.site-account-status[data-kind=success]{color:#9be0af}
        .site-account-input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;clip-path:inset(50%)}
        @media(max-width:520px){.site-account-widget{max-width:100%}.site-account-trigger{min-height:44px;padding:5px 8px}.site-account-name{max-width:110px}.site-account-popover{right:0}}
    `;
    document.head.append(style);

    const existingPopover = document.getElementById('account-popover-menu');
    let trigger;
    let popover;
    let isMainProfile = Boolean(existingPopover);

    if (isMainProfile) {
        trigger = document.getElementById('btn-auth');
        popover = existingPopover;
        if (!trigger) return;
        let uploadButton = document.getElementById('btn-account-change-avatar');
        let fileInput = document.getElementById('account-avatar-file');
        if (!uploadButton) {
            uploadButton = document.createElement('button');
            uploadButton.type = 'button';
            uploadButton.id = 'btn-account-change-avatar';
            uploadButton.className = 'account-popover__btn account-popover__btn--rename';
            uploadButton.textContent = '🖼️ Cập nhật ảnh đại diện';
            uploadButton.style.width = '100%';
            uploadButton.style.marginTop = '8px';
            const actions = document.getElementById('account-popover-view-actions');
            actions?.before(uploadButton);
        }
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'account-avatar-file';
            fileInput.accept = 'image/jpeg,image/png,image/webp';
            fileInput.hidden = true;
            popover.append(fileInput);
        }
    } else {
        const host = document.querySelector('.site-header__right, .header-user-status, .navbar__actions, .header-badges, .header-right, .game-header__actions, .top-hud nav, .top-hud .hud-left, body > header, .page-title');
        if (!host) return;
        const widget = document.createElement('div');
        widget.className = 'site-account-widget';
        if (host.matches('.top-hud .hud-left')) widget.classList.add('site-account-widget--compact');
        widget.innerHTML = `
            <button type="button" class="site-account-trigger" aria-haspopup="true" aria-expanded="false">
                <span class="site-account-avatar" data-account-fallback aria-hidden="true">👤</span>
                <img data-account-trigger-image alt="" hidden>
                <span class="site-account-name" data-account-name>Đang kiểm tra…</span><span aria-hidden="true">▾</span>
            </button>
            <section class="site-account-popover" hidden aria-label="Hồ sơ tài khoản">
                <div class="site-account-profile"><span class="site-account-avatar" data-account-profile-fallback aria-hidden="true">👤</span><img data-account-profile-image alt="Ảnh đại diện" hidden><div class="site-account-profile-text"><strong data-account-profile-name>Tài khoản</strong><small data-account-email></small></div></div>
                <div class="site-account-actions"><button type="button" class="site-account-action" data-account-upload>🖼️ Đổi ảnh</button><button type="button" class="site-account-action site-account-action--logout" data-account-logout>🚪 Đăng xuất</button></div>
                <input class="site-account-input" type="file" accept="image/jpeg,image/png,image/webp" data-account-file>
                <p class="site-account-status" data-account-status role="status" aria-live="polite">Ảnh JPG, PNG hoặc WebP; tối đa 10 MB.</p>
            </section>`;
        host.append(widget);
        trigger = widget.querySelector('.site-account-trigger');
        popover = widget.querySelector('.site-account-popover');
    }

    const getStatus = () => isMainProfile
        ? document.getElementById('account-popover-msg') || ensureMainStatus()
        : popover.querySelector('[data-account-status]');
    function ensureMainStatus() {
        const node = document.createElement('p');
        node.className = 'account-popover__msg';
        node.id = 'account-avatar-status';
        node.setAttribute('role', 'status');
        node.setAttribute('aria-live', 'polite');
        popover.append(node);
        return node;
    }
    const fileInput = isMainProfile
        ? document.getElementById('account-avatar-file')
        : popover.querySelector('[data-account-file]');
    const uploadButton = isMainProfile
        ? document.getElementById('btn-account-change-avatar')
        : popover.querySelector('[data-account-upload]');
    const status = getStatus();

    function showStatus(message, kind = '') {
        if (!status) return;
        status.textContent = message;
        status.hidden = false;
        status.dataset.kind = kind;
        if (isMainProfile) {
            status.className = 'account-popover__msg ' + (kind === 'success' ? 'account-popover__msg--success' : (kind === 'error' ? 'account-popover__msg--error' : ''));
        } else {
            status.className = `site-account-status${kind ? ` site-account-status--${kind}` : ''}`;
        }
    }
    function setImage(img, fallback, url) {
        if (img) {
            if (url) { img.src = url; img.hidden = false; }
            else { img.removeAttribute('src'); img.hidden = true; }
        }
        if (fallback) fallback.hidden = Boolean(url);
    }
    function updateAccountUI(user) {
        const name = user?.displayName || user?.email?.split('@')[0] || 'Người dùng';
        const url = user?.photoURL || '';
        if (isMainProfile) {
            const mainImg = document.getElementById('account-popover-avatar-img');
            const mainFallback = document.getElementById('account-popover-avatar-fallback');
            setImage(mainImg, mainFallback, url);
            const triggerImage = trigger.querySelector('.nav-auth-avatar');
            if (triggerImage) triggerImage.src = url;
            else if (url) {
                const img = document.createElement('img');
                img.className = 'nav-auth-avatar';
                img.alt = 'Ảnh đại diện';
                img.src = url;
                trigger.prepend(img);
                trigger.querySelector('.nav-auth-icon')?.remove();
            }
            return;
        }
        const widget = trigger.closest('.site-account-widget');
        const triggerImage = widget.querySelector('[data-account-trigger-image]');
        const triggerFallback = widget.querySelector('[data-account-fallback]');
        const profileImage = widget.querySelector('[data-account-profile-image]');
        const profileFallback = widget.querySelector('[data-account-profile-fallback]');
        setImage(triggerImage, triggerFallback, url);
        setImage(profileImage, profileFallback, url);
        widget.querySelector('[data-account-name]').textContent = user ? name : 'Đăng nhập';
        widget.querySelector('[data-account-profile-name]').textContent = user ? name : 'Chưa đăng nhập';
        widget.querySelector('[data-account-email]').textContent = user?.email || '';
        widget.querySelector('[data-account-logout]').hidden = !user;
        widget.querySelector('[data-account-upload]').hidden = !user;
        if (!user) trigger.onclick = () => { window.location.href = 'dang-nhap.html'; };
        else trigger.onclick = togglePopover;
        if (user) localStorage.setItem('tenNguoiDung', name);
        else localStorage.removeItem('tenNguoiDung');
        const siteName = document.getElementById('header-user-display');
        if (siteName) siteName.textContent = user ? name : 'Tướng quân Khách';
    }
    function togglePopover() {
        if (!popover) return;
        const open = popover.hidden;
        popover.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
    }

    async function prepareAvatarBlob(file) {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) throw new Error('Chỉ nhận ảnh JPG, PNG hoặc WebP.');
        if (file.size > 10 * 1024 * 1024) throw new Error('Ảnh đại diện phải nhỏ hơn 10 MB.');
        const bitmap = await createImageBitmap(file);
        const side = Math.min(bitmap.width, bitmap.height);
        const sx = Math.floor((bitmap.width - side) / 2);
        const sy = Math.floor((bitmap.height - side) / 2);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 512;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Trình duyệt không xử lý được ảnh này.');
        context.drawImage(bitmap, sx, sy, side, side, 0, 0, 512, 512);
        bitmap.close?.();
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (!blob) throw new Error('Không thể xử lý ảnh đã chọn.');
        return blob;
    }
    async function uploadAvatar(file) {
        const user = auth.currentUser;
        if (!user) throw new Error('Bạn cần đăng nhập trước khi đổi ảnh đại diện.');
        if (!cloudinaryConfig.cloudName || !cloudinaryConfig.imageUploadPreset) {
            throw new Error('Chưa cấu hình dịch vụ tải ảnh.');
        }
        const blob = await prepareAvatarBlob(file);
        const body = new FormData();
        body.append('file', blob, `avatar-${user.uid}.jpg`);
        body.append('upload_preset', cloudinaryConfig.imageUploadPreset);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`, { method: 'POST', body });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Tải ảnh lên thất bại.');
        await updateProfile(user, { photoURL: result.secure_url });
        await user.reload();
        updateAccountUI(auth.currentUser || user);
        window.dispatchEvent(new CustomEvent('site-account-profile-updated', { detail: { photoURL: result.secure_url } }));
        return result.secure_url;
    }

    uploadButton?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        if (uploadButton) { uploadButton.disabled = true; uploadButton.textContent = 'Đang cập nhật ảnh…'; }
        showStatus('Đang xử lý và lưu ảnh đại diện…');
        try {
            await uploadAvatar(file);
            showStatus('Đã cập nhật ảnh đại diện cho tài khoản trên website.', 'success');
        } catch (error) {
            console.error('Không cập nhật được ảnh đại diện:', error);
            showStatus(error.message || 'Không thể cập nhật ảnh đại diện.', 'error');
        } finally {
            if (uploadButton) { uploadButton.disabled = false; uploadButton.textContent = isMainProfile ? '🖼️ Cập nhật ảnh đại diện' : '🖼️ Đổi ảnh'; }
            fileInput.value = '';
        }
    });
    if (!isMainProfile) {
        popover.querySelector('[data-account-logout]')?.addEventListener('click', async event => {
            const button = event.currentTarget;
            button.disabled = true;
            try {
                await signOut(auth);
                popover.hidden = true;
                trigger.setAttribute('aria-expanded', 'false');
                updateAccountUI(null);
            } catch (error) {
                console.error('Không đăng xuất được:', error);
                showStatus('Không thể đăng xuất. Hãy thử lại.', 'error');
            } finally { button.disabled = false; }
        });
        document.addEventListener('click', event => {
            if (!event.target.closest('.site-account-widget')) {
                popover.hidden = true;
                trigger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    onAuthStateChanged(auth, updateAccountUI, error => {
        console.error('Không tải được hồ sơ tài khoản:', error);
        showStatus('Không thể kiểm tra tài khoản. Hãy tải lại trang.', 'error');
    });
})();

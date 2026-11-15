(() => {
    'use strict';

    // Decrypt on demand; display examples as text, never executable HTML.
    const dataUrl = new URL('museum-notes-data.json', document.currentScript.src);
    let notes = null;

    const opener = document.getElementById('museum-notes-open');
    if (!opener) return;
    let dialog;
    let unlockAttempt = 0;

    async function unlockNotes(password) {
        if (!window.crypto?.subtle) throw new Error('UNSUPPORTED');
        let data;
        try {
            const response = await fetch(dataUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error('LOAD');
            data = await response.json();
        } catch (_) {
            throw new Error('LOAD');
        }
        if (data.version !== 1 || data.iterations !== 210000) throw new Error('LOAD');
        const bytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
        const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: bytes(data.salt), iterations: data.iterations, hash: 'SHA-256' },
            material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
        );
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(data.iv) }, key, bytes(data.ciphertext));
        const decoded = JSON.parse(new TextDecoder().decode(plaintext));
        if (!Array.isArray(decoded) || !decoded.every(note => typeof note.title === 'string' && typeof note.text === 'string')) throw new Error('LOAD');
        return decoded;
    }

    function buildDialog() {
        dialog = document.createElement('dialog');
        dialog.className = 'museum-notes';
        dialog.id = 'ghi-chu-bao-tang';
        dialog.setAttribute('aria-labelledby', 'museum-notes-title');
        const header = document.createElement('header');
        header.className = 'museum-notes__header';
        const title = document.createElement('h2');
        title.id = 'museum-notes-title';
        title.textContent = '📝 Ghi chú';
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'museum-notes__close';
        close.setAttribute('aria-label', 'Đóng ghi chú');
        close.autofocus = true;
        close.textContent = '×';
        close.addEventListener('click', () => dialog.close());
        header.append(title, close);
        const body = document.createElement('div');
        body.className = 'museum-notes__body';
        const status = document.createElement('p');
        status.className = 'museum-notes__status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');

        const lockForm = document.createElement('form');
        lockForm.className = 'museum-notes__lock';
        const instruction = document.createElement('p');
        instruction.textContent = 'Nhập mật khẩu để mở Ghi chú.';
        const label = document.createElement('label');
        label.htmlFor = 'museum-notes-password';
        label.textContent = 'Mật khẩu';
        const password = document.createElement('input');
        password.id = 'museum-notes-password';
        password.type = 'password';
        password.inputMode = 'numeric';
        password.autocomplete = 'current-password';
        password.required = true;
        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.textContent = 'Mở ghi chú';
        lockForm.append(instruction, label, password, submit);
        body.append(lockForm);
        password.addEventListener('input', () => {
            password.removeAttribute('aria-invalid');
            status.textContent = '';
        });
        lockForm.addEventListener('submit', async event => {
            event.preventDefault();
            if (submit.disabled) return;
            const attempt = ++unlockAttempt;
            const secret = password.value;
            password.value = '';
            password.disabled = submit.disabled = true;
            status.textContent = 'Đang mở ghi chú…';
            try {
                const decoded = await unlockNotes(secret);
                if (attempt !== unlockAttempt || !dialog.open) return;
                notes = decoded;
                status.textContent = '';
                renderNotes();
                body.querySelector('button')?.focus();
            } catch (error) {
                if (attempt !== unlockAttempt || !dialog.open) return;
                status.textContent = error.message === 'LOAD'
                    ? 'Không tải được ghi chú. Hãy kiểm tra kết nối và thử lại.'
                    : error.message === 'UNSUPPORTED'
                        ? 'Hãy mở website bằng HTTPS trong trình duyệt hỗ trợ mã hóa.'
                        : 'Mật khẩu chưa đúng. Vui lòng thử lại.';
                password.setAttribute('aria-invalid', 'true');
            } finally {
                if (attempt === unlockAttempt) {
                    password.disabled = submit.disabled = false;
                    if (!notes && dialog.open) password.focus();
                }
            }
        });

        function renderNotes() {
            body.replaceChildren();
            notes.forEach((note, index) => {
            const section = document.createElement('section');
            const toolbar = document.createElement('div');
            toolbar.className = 'museum-notes__toolbar';
            const heading = document.createElement('h3');
            heading.textContent = note.title;
            const copy = document.createElement('button');
            copy.type = 'button';
            copy.textContent = 'ok';
            copy.setAttribute('aria-label', 'ok — Sao chép ' + note.title.toLowerCase());
            copy.addEventListener('click', async () => {
                copy.disabled = true;
                try {
                    await copyText(note.text);
                    status.textContent = 'Đã sao chép đầy đủ ' + note.title.toLowerCase() + '.';
                } catch (_) {
                    status.textContent = 'Chưa sao chép được. Bạn có thể chọn văn bản trong khung để sao chép.';
                } finally {
                    copy.disabled = false;
                }
            });
            const code = document.createElement('pre');
            code.tabIndex = 0;
            code.setAttribute('aria-label', 'Nội dung ' + note.title.toLowerCase());
            code.textContent = note.text;
            code.id = 'museum-notes-code-' + index;
            code.hidden = true;
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'museum-notes__toggle';
            toggle.textContent = 'Xóa app';
            toggle.setAttribute('aria-label', 'Xóa app ' + note.title.toLowerCase());
            toggle.setAttribute('aria-controls', code.id);
            toggle.setAttribute('aria-expanded', 'false');
            toggle.addEventListener('click', () => {
                code.hidden = !code.hidden;
                toggle.textContent = code.hidden ? 'Xóa app' : 'Thu gọn';
                toggle.setAttribute('aria-label', toggle.textContent + ' ' + note.title.toLowerCase());
                toggle.setAttribute('aria-expanded', String(!code.hidden));
            });
            const actions = document.createElement('div');
            actions.className = 'museum-notes__actions';
            actions.append(toggle, copy);
            toolbar.append(heading, actions);
            section.append(toolbar, code);
            body.append(section);
            });
        }
        header.append(status);
        dialog.append(header, body);
        dialog.addEventListener('click', event => {
            const rect = dialog.getBoundingClientRect();
            if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
        });
        dialog.addEventListener('close', () => {
            ++unlockAttempt;
            notes = null;
            lockForm.reset();
            password.disabled = submit.disabled = false;
            password.removeAttribute('aria-invalid');
            body.replaceChildren(lockForm);
            status.textContent = '';
            document.querySelector('#nav-item-bao-tang > a')?.focus();
        });
        document.body.append(dialog);
    }

    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try { await navigator.clipboard.writeText(text); return; } catch (_) { /* Try the local fallback. */ }
        }
        const field = document.createElement('textarea');
        field.value = text;
        field.readOnly = true;
        field.className = 'museum-notes__copy-buffer';
        dialog.append(field);
        try {
            field.select();
            if (!document.execCommand('copy')) throw new Error('copy failed');
        } finally {
            field.remove();
        }
    }

    opener.addEventListener('click', event => {
        event.preventDefault();
        if (typeof window.dongTatCaDropdown === 'function') window.dongTatCaDropdown();
        if (!dialog) buildDialog();
        if (!dialog.open) {
            dialog.showModal();
            document.getElementById('museum-notes-password').focus();
        }
    });
})();

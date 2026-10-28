import base64
import os
import sys

def build_model_js(glb_path, js_path, var_name, model_id):
    if not os.path.exists(glb_path):
        print(f"Error: {glb_path} does not exist!")
        return False
    
    file_size = os.path.getsize(glb_path)
    print(f"Reading {glb_path} ({file_size} bytes)...")
    with open(glb_path, 'rb') as f:
        raw = f.read()
    
    print(f"Encoding to base64...")
    b64 = base64.b64encode(raw).decode('ascii')
    
    print(f"Writing {js_path}...")
    js_content = f"""/**
 * Tự động nạp mô hình 3D cổ vật ({os.path.basename(glb_path)})
 * Tương thích 100% khi chạy trực tiếp qua giao thức file:// chống lỗi CORS
 */
(function() {{
    try {{
        var b64Data = "{b64}";
        var sliceSize = 32768;
        var byteArrays = [];
        for (var offset = 0; offset < b64Data.length; offset += sliceSize) {{
            var slice = b64Data.slice(offset, offset + sliceSize);
            var byteChars = atob(slice);
            var bytes = new Uint8Array(byteChars.length);
            for (var i = 0; i < byteChars.length; i++) {{
                bytes[i] = byteChars.charCodeAt(i);
            }}
            byteArrays.push(bytes);
        }}
        var blob = new Blob(byteArrays, {{ type: 'model/gltf-binary' }});
        window.{var_name} = URL.createObjectURL(blob);
        b64Data = null;
        byteArrays = null;
        console.log("3D Model {model_id} loaded successfully via Blob:", window.{var_name});
        if (typeof window.onModel3DReady === 'function') {{
            window.onModel3DReady({model_id}, window.{var_name});
        }}
    }} catch (err) {{
        console.error("Lỗi khởi tạo mô hình 3D {model_id}:", err);
    }}
}})();
"""
    with open(js_path, 'w', encoding='utf-8') as out:
        out.write(js_content)
    
    print(f"Successfully generated {js_path} (size: {os.path.getsize(js_path)} bytes)")
    return True

if __name__ == '__main__':
    # 1. Trống Đồng Đông Sơn
    p1 = 'trong_ong_ong_son_-_viet_nam.glb'
    if not os.path.exists(p1):
        p1 = 'models/trong_dong_dong_son.glb'
    build_model_js(p1, 'models/model_trong_dong_data.js', '__MODEL_TRONG_DONG_BLOB_URL', 1)

    # 2. Cọc Gỗ Bạch Đằng
    p2 = 'coc_bach_ang_nam_1288.glb'
    if not os.path.exists(p2):
        p2 = 'models/coc_bach_dang_1288.glb'
    build_model_js(p2, 'models/model_coc_bach_dang_data.js', '__MODEL_COC_BACH_DANG_BLOB_URL', 2)

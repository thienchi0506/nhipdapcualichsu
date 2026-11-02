import { metrics } from './diagnostics.js';
import { validateRiverConfig } from '../sim/river.js';

export async function loadScene({ signal, onProgress }) {
  metrics.activeLoads++;
  try {
    onProgress(0, 'Đang đọc dữ liệu bến sông…');
    const response = await fetch(new URL('../../data/shell-scene.json', import.meta.url), { signal });
    if (!response.ok) throw new Error(`Không đọc được dữ liệu cảnh (HTTP ${response.status}).`);
    const data = await response.json();
    if (data.version !== 'bd938-shell-2' || data.roles?.length !== 4 || !data.quality) throw new Error('Dữ liệu bến thử không hợp lệ.');
    const riverResponse = await fetch(new URL('../../data/river-config.json', import.meta.url), { signal });
    if (!riverResponse.ok) throw new Error(`Không đọc được dữ liệu sông (HTTP ${riverResponse.status}).`);
    data.riverConfig = validateRiverConfig(await riverResponse.json());
    const actorResponse = await fetch(new URL('../../data/character-config.json', import.meta.url), { signal });
    if (!actorResponse.ok) throw new Error(`Không đọc được dữ liệu nhân vật (HTTP ${actorResponse.status}).`);
    data.characterConfig = await actorResponse.json();
    if (data.characterConfig.version !== 'bd938-characters-1') throw new Error('Dữ liệu nhân vật không đúng phiên bản.');
    signal.throwIfAborted();
    onProgress(1, 'Đã đọc dữ liệu. Đang tải thư viện và mô hình 3D…');
    // Imports cannot be cancelled; this module has no scene/loop side effects.
    // The caller's signal/generation prevents a late import from creating a session.
    const renderer = await import('../presentation/scene.js');
    signal.throwIfAborted();
    onProgress(2, 'Đã tải thư viện. Đang dựng cảnh và chuẩn bị ánh sáng…');
    return { data, createScene: renderer.createScene };
  } finally { metrics.activeLoads--; }
}

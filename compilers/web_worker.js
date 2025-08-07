export async function compileWebWorker(scadCode, quality, outputFormat, onUpdate, wasmPath = 'release/openscad.wasm.js') {
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

    worker.onmessage = (e) => {
        const { type, payload } = e.data;
        onUpdate({ type, payload });
    };

    worker.onerror = (err) => {
        onUpdate({ type: 'error', payload: err.message });
    };

    worker.postMessage({ scadCode, quality, outputFormat, wasmPath });

    return worker;
}
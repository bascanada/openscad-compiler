// Compiles scadCode using openscad-wasm in an inline web worker, returns a Promise

// Compiles scadCode using openscad-wasm in an inline web worker, returns a Promise
// Accepts scadCode and wasmPath
export async function compileWebWorker(scadCode, wasmPath = 'release/openscad.wasm.js') {
    // Worker code as a string
    const workerCode = `
        self.onmessage = async function(e) {
            const { scadCode, wasmPath } = e.data;
            try {
                importScripts(wasmPath);
                // Patch locateFile so .wasm is loaded from the same location as wasmPath
                if (typeof OpenSCAD !== 'undefined') {
                    OpenSCAD.locateFile = function(path) {
                        if (path.endsWith('.wasm')) {
                            // Replace .js with .wasm in the wasmPath
                            return wasmPath.replace(/\.js$/, '.wasm');
                        }
                        return path;
                    };
                }
                if (typeof OpenSCAD === 'undefined' || !OpenSCAD.compile) {
                    postMessage({ error: 'OpenSCAD WASM not loaded' });
                    return;
                }
                // Compile SCAD code
                const instance = await OpenSCAD();
                instance.FS.writeFile('/input.scad', scadCode);
                instance.callMain(['/input.scad', '-o', 'cube.stl',
                    '--enable=fast-csg',
                    '--enable=lazy-union',
                    '--enable=roof',
                ]);
                const output = instance.FS.readFile('cube.stl');
                postMessage({ result: output });
            } catch (err) {
                postMessage({ error: err.message || String(err) });
            }
        };
    `;

    // Create worker from Blob
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    return new Promise((resolve, reject) => {
        worker.onmessage = (e) => {
            const { result, error } = e.data;
            worker.terminate();
            if (error) {
                reject(new Error(error));
            } else {
                resolve(result);
            }
        };
        worker.onerror = (err) => {
            worker.terminate();
            reject(err);
        };
        worker.postMessage({ scadCode, wasmPath });
    });
}
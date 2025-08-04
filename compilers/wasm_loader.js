import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import {dirname, join} from 'path';

let wasmModule;
// Add a default value to the options parameter
async function OpenSCAD(options = {}) {
    if (!wasmModule) {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const wasmJsPath = join(__dirname, '../release', 'openscad.wasm.js');

        const wasmBinaryPath = join(__dirname, '../release', 'openscad.wasm');
        const wasmBinary = await fs.readFile(wasmBinaryPath);
        
        // This line will now work correctly because 'options' is always an object
        options.wasmBinary = wasmBinary;

        const wasmJsContent = await fs.readFile(wasmJsPath, 'utf8');
        const base64Content = Buffer.from(wasmJsContent).toString('base64');
        wasmModule = "data:text/javascript;base64," + base64Content;
    }

    const module = {
        noInitialRun: true,
        locateFile: (p) => new URL(`./${p}`, import.meta.url).href,
        ...options,
    };

    globalThis.OpenSCAD = module;
    await import(wasmModule + `#${Math.random()}`);
    delete globalThis.OpenSCAD;

    await new Promise((resolve) => {
        module.onRuntimeInitialized = () => resolve(null);
    });

    return module;
}

export { OpenSCAD as default };
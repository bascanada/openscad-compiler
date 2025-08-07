import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmJsPath = join(__dirname, '../release', 'openscad.wasm.js');
const wasmJsContent = readFileSync(wasmJsPath, 'utf8');
const wasmBinaryPath = join(__dirname, '../release', 'openscad.wasm');
const wasmBinary = readFileSync(wasmBinaryPath);

const OpenSCAD = (options) => {
    return new Promise((resolve) => {
        globalThis.OpenSCAD = {
            ...options,
            wasmBinary,
            onRuntimeInitialized: () => {
                resolve(globalThis.OpenSCAD);
            },
        };
        new Function(wasmJsContent)();
    });
};

export default OpenSCAD;
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmJsPath = join(__dirname, '../release', 'openscad.wasm.js');
const wasmJsContent = readFileSync(wasmJsPath, 'utf8');

const OpenSCAD = (options) => {
    const Module = {
        ...options,
    };
    new Function('Module', wasmJsContent)(Module);
    return Module;
};

export default OpenSCAD;
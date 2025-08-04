import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import {dirname, join} from 'path';

async function initializeOpenSCAD(options = {}) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const wasmJsPath = join(__dirname, '../release', 'openscad.wasm.js');
    const wasmBinaryPath = join(__dirname, '../release', 'openscad.wasm');
    const wasmBinary = await fs.readFile(wasmBinaryPath);
    
    options.wasmBinary = wasmBinary;

    const wasmJsContent = await fs.readFile(wasmJsPath, 'utf8');
    const base64Content = Buffer.from(wasmJsContent).toString('base64');
    const wasmModule = "data:text/javascript;base64," + base64Content;

    const module = {
        noInitialRun: true,
        locateFile: (p) => new URL(`./${p}`, import.meta.url).href,
        ...options,
    };

    globalThis.OpenSCAD = module;
    if (wasmModule.startsWith("data:text/javascript;base64,")) {
      const base64 = 'base64,';
      const base64Start = wasmModule.indexOf(base64) + base64.length;
      const script = Buffer.from(wasmModule.substring(base64Start), 'base64').toString();
      
      new Function(script)();
    } else {
      const dataUri = require('./openscad.wasm.js');
      const
        base64 = 'base64,',
        base64Start = dataUri.indexOf(base64) + base64.length,
        script = Buffer.from(dataUri.substring(base64Start), 'base64').toString();
      
      new Function(script)();
    }
    delete globalThis.OpenSCAD;

    await new Promise((resolve) => {
        module.onRuntimeInitialized = () => resolve(null);
    });

    return module;
}

async function OpenSCAD(options = {}) {
    return initializeOpenSCAD(options);
}

export { OpenSCAD as default };
import { Compiler } from './index.js';
import { writeFile } from 'node:fs/promises';


const compilerWasm = new Compiler({ engine: 'wasm' });
const compilerNative = new Compiler({ engine: 'native' });


Promise.all([
    compilerWasm.compile('cube(10);'),
    compilerNative.compile('cube(10);')
]).then(async ([wasmOutput, nativeOutput]) => {
    await writeFile('./cube_wasm.stl', wasmOutput);
    await writeFile('./cube_native.stl', nativeOutput);
});
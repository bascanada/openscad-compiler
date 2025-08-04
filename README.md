# openscad-compiler

Single interface to compile OpenSCAD files to STL on all platforms (Node.js, WASM, native, or web worker).

## Features
- Compile OpenSCAD files to STL
- Works in Node.js, browser (WASM), native, and web worker environments
- Uses [openscad-wasm](https://github.com/openscad/openscad-wasm) under the hood

## License
This project is licensed under GNU GPL v3. See the LICENSE file for details.

The included openscad-wasm release files are also licensed under GNU GPL v3. Their LICENSE is included in the `release/` folder.

## Usage
Install via npm:
```sh
npm install @bascanada/openscad-compiler
```

Import and use:
```js
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
```

## Author
Bascanada

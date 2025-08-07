import { Compiler } from './index.js';
import { writeFile } from 'node:fs/promises';

const compilerNative = new Compiler({ engine: 'native' });
const compilerWasm = new Compiler({ engine: 'wasm', outputFormat: '3mf' });

const text = `
//-- Car Window Vent Insert - Asymmetric Curve --//
// ... (same SCAD code as before) ...
`;

async function main() {
  console.log('Testing native compiler...');
  const nativeVersion = await compilerNative.getVersion();
  console.log('Native OpenSCAD version:', nativeVersion);

  compilerNative.compile(text, (message) => {
    console.log('Native compiler message:', message);
    if (message.type === 'output') {
      writeFile('./output_native.stl', message.payload);
    }
  });

  console.log('Testing WASM compiler...');
  compilerWasm.compile(text, (message) => {
    console.log('WASM compiler message:', message);
    if (message.type === 'output') {
      writeFile('./output_wasm.3mf', message.payload);
    }
  });
}

main();
import { Compiler } from './index.js';
import { writeFile, stat } from 'node:fs/promises';
import { strict as assert } from 'node:assert';

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

  compilerNative.compile(text, async (message) => {
    console.log('Native compiler message:', message);
    if (message.type === 'output') {
      await writeFile('./output_native.stl', message.payload);
      const stats = await stat('./output_native.stl');
      assert(stats.size > 0, 'Native output file is empty');
      console.log('Native compilation successful');
    }
  });

  console.log('Testing WASM compiler...');
  compilerWasm.compile(text, async (message) => {
    console.log('WASM compiler message:', message);
    if (message.type === 'output') {
      await writeFile('./output_wasm.3mf', message.payload);
      const stats = await stat('./output_wasm.3mf');
      assert(stats.size > 0, 'WASM output file is empty');
      console.log('WASM compilation successful');
    }
  });
}

main();
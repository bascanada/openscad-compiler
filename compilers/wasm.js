
import OpenSCAD from './wasm_loader.js';
import { EventEmitter } from 'events';

let instance;

/**
 * Compiles OpenSCAD code using the WASM engine, emitting live updates.
 * @param {string} scadCode - The OpenSCAD code.
 * @returns {EventEmitter} Emits 'stdout', 'stderr', 'done', and 'error' events.
 */
export function compileWasm(scadCode) {
  const emitter = new EventEmitter();
  (async () => {
    let stdout = '';
    let stderr = '';
    try {
      instance = await OpenSCAD({
        print: (text) => {
          stdout += text + '\n';
          emitter.emit('stdout', text + '\n');
        },
        printErr: (text) => {
          stderr += text + '\n';
          emitter.emit('stderr', text + '\n');
        }
      });
      instance.FS.writeFile("/input.scad", scadCode);

      instance.callMain(["/input.scad", "-o", "cube.stl",
        '--enable=fast-csg',
        '--enable=lazy-union',
        '--enable=roof',
      ]);

      const output = instance.FS.readFile("/cube.stl");
      // Convert Uint8Array to string for consistency
      let stlString;
      if (typeof output === 'string') {
        stlString = output;
      } else if (output instanceof Uint8Array) {
        stlString = new TextDecoder('utf-8').decode(output);
      } else {
        stlString = String(output);
      }
      emitter.emit('done', stlString);
    } catch (error) {
      emitter.emit('error', error);
    }
  })();
  return emitter;
}

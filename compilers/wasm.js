
import OpenSCAD from './wasm_loader.js';
import { EventEmitter } from 'events';

let instance;

/**
 * Compiles OpenSCAD code using the WASM engine, emitting live updates.
 * @param {string} scadCode - The OpenSCAD code.
 * @param {string} [fileType='stl'] - Output file type (e.g., 'stl', 'amf').
 * @param {string[]} [args=[]] - Extra command-line arguments.
 * @returns {EventEmitter} Emits 'stdout', 'stderr', 'done', and 'error' events.
 */
export function compileWasm(scadCode, fileType = 'stl', args = []) {
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

      const outputName = `/cube.${fileType}`;
      instance.callMain(["/input.scad", "-o", outputName].concat(args));

      const output = instance.FS.readFile(outputName);
      // Convert Uint8Array to string for consistency
      let resultString;
      if (typeof output === 'string') {
        resultString = output;
      } else if (output instanceof Uint8Array) {
        resultString = new TextDecoder('utf-8').decode(output);
      } else {
        resultString = String(output);
      }
      emitter.emit('done', resultString);
    } catch (error) {
      emitter.emit('error', error);
    }
  })();
  return emitter;
}

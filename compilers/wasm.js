import OpenSCAD from './wasm_loader.js';
import { Command } from './command.js';

let instance;

/**
 * Compiles OpenSCAD code using the WASM engine.
 * @param {string} scadCode - The OpenSCAD code.
 * @param {import('./command.js').Quality} quality - The desired quality.
 * @param {import('./command.js').OutputFormat} outputFormat - The output format.
 * @returns {Promise<Uint8Array>} The compiled data.
 */
export async function compileWasm(scadCode, quality, outputFormat) {
  try {
    instance = await OpenSCAD();
    instance.FS.writeFile("/input.scad", scadCode);

    const command = new Command({ version: '2022.03.20', quality, outputFormat });
    const outputFile = `output.${outputFormat}`;
    const args = command.getArgs('/input.scad', outputFile);

    instance.callMain(args);
    const output = instance.FS.readFile(outputFile);
    return output;
  } catch (error) {
    console.error('WASM Compilation Error:', error);
    throw new Error('Failed to compile with WASM engine.');
  }
}

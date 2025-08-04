import OpenSCAD from './wasm_loader.js';


let instance;
/**
 * Compiles OpenSCAD code using the WASM engine.
 * @param {string} scadCode - The OpenSCAD code.
 * @returns {Promise<string>} STL data as a string.
 */
export async function compileWasm(scadCode) {
  try {
    const instance = await OpenSCAD();
    instance.FS.writeFile("/input.scad", scadCode);
    instance.callMain(["/input.scad", "-o", "cube.stl"]);
    const output = instance.FS.readFile("/cube.stl");
    return output;
  } catch (error) {
    console.error('WASM Compilation Error:', error);
    throw new Error('Failed to compile with WASM engine.');
  }
}

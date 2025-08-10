import { compileWasm } from './compilers/wasm.js';
import { compileNative } from './compilers/native.js';

/**
 * @typedef {'wasm' | 'native' | 'webworker'} EngineType
 */


/**
 * Main compiler class that provides a unified interface.
 */
export class Compiler {
  /**
   * @param {object} options
   * @param {EngineType} options.engine - The compiler engine to use.
   * @param {string} [options.nativePath='openscad'] - Path to the native executable.
   * @param {string} [options.fileType='stl'] - Output file type (e.g., 'stl', 'amf').
   * @param {object} [options.args] - Optional: { fast: [...], full: [...] } extra args for each mode.
   */
  constructor({ engine = 'wasm', nativePath = 'openscad', fileType = 'stl', args = {} } = {}) {
    if (engine !== 'wasm' && engine !== 'native' && engine !== 'webworker') {
      throw new Error("Engine must be 'wasm' or 'native' or 'webworker'");
    }
    this.engine = engine;
    this.nativePath = nativePath;
    this.fileType = fileType;
    this.args = args;
  }

  /**
   * Compiles OpenSCAD code to a string (STL or other file type).
   * @param {string} scadCode - The OpenSCAD code to compile.
   * @param {string} [mode='fast'] - Compilation mode ('fast', 'full', etc.).
   * @returns {EventEmitter} Emits output events.
   */
  compile(scadCode, mode = 'fast') {
    const fileType = this.fileType || 'stl';
    const args = (this.args && this.args[mode]) ? this.args[mode] : [];
    if (this.engine === 'native') {
      return compileNative(scadCode, this.nativePath, fileType, args);
    } else if (this.engine === 'wasm') {
      return compileWasm(scadCode, fileType, args);
    } else if (this.engine === 'webworker') {
      throw new Error("WebWorker engine is not supporte yet");
    } else {
      throw new Error(`Unknown engine type: ${this.engine}`);
    }
  }
}
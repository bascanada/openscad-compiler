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
   */
  constructor({ engine = 'wasm', nativePath = 'openscad' } = {}) {
    if (engine !== 'wasm' && engine !== 'native' && engine !== 'webworker') {
      throw new Error("Engine must be 'wasm' or 'native' or 'webworker'");
    }
    this.engine = engine;
    this.nativePath = nativePath;
  }

  /**
   * Compiles OpenSCAD code to an STL string.
   * @param {string} scadCode - The OpenSCAD code to compile.
   * @returns {Promise<string>} A promise that resolves with the STL data.
   */
  async compile(scadCode) {
    if (this.engine === 'native') {
      return compileNative(scadCode, this.nativePath);
    } else if (this.engine === 'wasm') {
      return compileWasm(scadCode);
    } else if (this.engine === 'webworker') {
      throw new Error("WebWorker engine is not supporte yet");
    } else {
      throw new Error(`Unknown engine type: ${this.engine}`);
    }
  }
}
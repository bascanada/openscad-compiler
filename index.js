import { compileWasm } from './compilers/wasm.js';
import { compileNative, getOpenSCADVersion } from './compilers/native.js';
import { compileWebWorker } from './compilers/web_worker.js';
import { UpdateMessage } from './update_message.js';

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
   * @param {import('./compilers/command.js').Quality} [options.quality='render'] - The desired quality.
   * @param {import('./compilers/command.js').OutputFormat} [options.outputFormat='stl'] - The output format.
   */
  constructor({ engine = 'wasm', nativePath = 'openscad', quality = 'render', outputFormat = 'stl' } = {}) {
    if (engine !== 'wasm' && engine !== 'native' && engine !== 'webworker') {
      throw new Error("Engine must be 'wasm' or 'native' or 'webworker'");
    }
    this.engine = engine;
    this.nativePath = nativePath;
    this.quality = quality;
    this.outputFormat = outputFormat;
  }

  /**
   * Compiles OpenSCAD code.
   * @param {string} scadCode - The OpenSCAD code to compile.
   * @param {(message: UpdateMessage) => void} onUpdate - The callback function to receive updates.
   * @returns {Promise<void>} A promise that resolves when the compilation is finished.
   */
  async compile(scadCode, onUpdate) {
    if (this.engine === 'native') {
      try {
        onUpdate(new UpdateMessage({ type: 'compiling' }));
        const output = await compileNative(scadCode, this.nativePath, this.quality, this.outputFormat);
        onUpdate(new UpdateMessage({ type: 'output', payload: output }));
      } catch (error) {
        onUpdate(new UpdateMessage({ type: 'error', payload: error.message }));
      }
    } else if (this.engine === 'wasm') {
        try {
            onUpdate(new UpdateMessage({ type: 'compiling' }));
            const output = await compileWasm(scadCode, this.quality, this.outputFormat);
            onUpdate(new UpdateMessage({ type: 'output', payload: output }));
        } catch (error) {
            onUpdate(new UpdateMessage({ type: 'error', payload: error.message }));
        }
    } else {
      return compileWebWorker(scadCode, this.quality, this.outputFormat, (message) => {
        onUpdate(new UpdateMessage(message));
      });
    }
  }

  /**
   * Gets the OpenSCAD version.
   * @returns {Promise<string>} The OpenSCAD version.
   */
  async getVersion() {
    if (this.engine === 'native') {
      return getOpenSCADVersion(this.nativePath);
    } else {
      // WASM and WebWorker engines don't have a version number
      return 'wasm';
    }
  }
}
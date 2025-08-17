import { compileWasm, getWasmVersion } from './compilers/wasm.js';
import { compileNative, getNativeVersion } from './compilers/native.js';
import { extractDateVersion } from './utils.js';
import stl from 'node-stl';

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
  constructor({ engine = 'wasm', nativePath = 'openscad', fileType = 'stl', args = {
    fast: undefined,
    full: undefined
  } } = {}) {
    if (engine !== 'wasm' && engine !== 'native' && engine !== 'webworker') {
      throw new Error("Engine must be 'wasm' or 'native' or 'webworker'");
    }
    this.engine = engine;
    this.nativePath = nativePath;
    this.fileType = fileType;
    this.args = args;

    if (!this.args.fast) {
      this.args.fast = this.getDefaultFastArgs();
    } else if (!this.args.full) {
      this.args.full = this.getDefaultArgs();
    }

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

  /**
   * Gets the date-style version of the underlying OpenSCAD engine.
   * @returns {Promise<string|null>} Resolves with the date-style version string, or null if not found.
   */
  async getVersion() {
    let versionString;
    if (this.engine === 'native') {
      versionString = await getNativeVersion(this.nativePath);
    } else if (this.engine === 'wasm') {
      versionString = await getWasmVersion();
    } else if (this.engine === 'webworker') {
      throw new Error('WebWorker engine does not support version query yet');
    } else {
      throw new Error(`Unknown engine type: ${this.engine}`);
    }
    return extractDateVersion(versionString);
  }


  getDefaultFastArgs() {
    return [ "--enable=lazy-union", "--backend=manifold" ];
  }

  getDefaultArgs() {
    return [];
  }

  /**
   * Generates the OpenSCAD scene graph (CSG) as raw file output (no JSON conversion).
   * @param {string} scadCode - The OpenSCAD code to compile.
   * @returns {Promise<Buffer>} A promise that resolves with the raw CSG file Buffer.
   */
  getSceneGraph(scadCode) {
    return new Promise((resolve, reject) => {
      const originalFileType = this.fileType;
      this.fileType = 'csg';

      // Always use 'full' mode for an accurate scene graph
      const emitter = this.compile(scadCode, 'full');

      emitter.on('done', (csgOutput) => {
        this.fileType = originalFileType; // Restore fileType
        try {
          // Return raw Buffer for the CSG file. Convert string outputs to Buffer.
          const buf = Buffer.isBuffer(csgOutput) ? csgOutput : Buffer.from(String(csgOutput), 'utf8');
          resolve(buf);
        } catch (error) {
          reject(new Error(`Failed to return CSG output: ${error.message}`));
        }
      });

      emitter.on('error', (error) => {
        this.fileType = originalFileType; // Restore on error
        reject(error);
      });
    });
  }

  /**
   * Compiles the model to STL and returns its physical dimensions and properties.
   * @param {string} scadCode - The OpenSCAD code to compile.
   * @returns {Promise<object>} A promise resolving with the dimension information.
   */
  getDimensions(scadCode) {
    return new Promise((resolve, reject) => {
      const originalFileType = this.fileType;
      this.fileType = 'stl';

      const emitter = this.compile(scadCode, 'full');

      emitter.on('done', (stlOutput) => {
        this.fileType = originalFileType; // Restore
        try {
          // Handle Buffer from native engine or string from other engines
          const stlBuffer = Buffer.isBuffer(stlOutput) ? stlOutput : Buffer.from(String(stlOutput), 'utf8');
          // node-stl exports a class; construct it with new
          const modelInfo = new stl(stlBuffer);

          const dimensions = {
            volume_cm3: modelInfo.volume,
            surfaceArea_cm2: modelInfo.area,
            boundingBox_mm: modelInfo.boundingBox,
            centerOfMass_mm: modelInfo.centerOfMass,
          };
          resolve(dimensions);
        } catch (error) {
          reject(new Error(`Failed to analyze STL data: ${error.message}`));
        }
      });

      emitter.on('error', (error) => {
        this.fileType = originalFileType; // Restore
        reject(error);
      });
    });
  }

  /**
   * Generates a PNG preview of the model using OpenSCAD's autocenter/viewall flags.
   * @param {string} scadCode - The OpenSCAD code.
   * @param {object} [options] - Preview options.
   * @param {string} [options.camera] - Optional camera string to override auto view.
   * @param {string} [options.imgsize='1024,768'] - Image dimensions.
   * @returns {Promise<Buffer>} Resolves with the PNG image buffer.
   */
  getPreview(scadCode, options = {}) {
    return new Promise((resolve, reject) => {
      const originalFileType = this.fileType;
      const originalArgs = JSON.parse(JSON.stringify(this.args));
      this.fileType = 'png';

      const previewArgs = [
        '--autocenter', // Center the model
        '--viewall',    // Zoom to fit the model in the view
        `--imgsize=${options.imgsize || '1024,768'}`,
      ];

      // Allow optional camera override
      if (options.camera) {
        previewArgs.push(`--camera=${options.camera}`);
      }

      // Merge preview args into the 'full' arg set for the call, preserving originals
      this.args.full = (originalArgs.full || []).concat(previewArgs);

      const emitter = this.compile(scadCode, 'full');

      // collect stderr for debugging
      let stderrBuf = '';
      emitter.on('stderr', (data) => {
        try { stderrBuf += String(data); } catch (e) {}
      });

      emitter.on('done', (pngOutput) => {
        // Restore state
        this.fileType = originalFileType;
        this.args = originalArgs;
        try {
          if (Buffer.isBuffer(pngOutput)) {
            resolve(pngOutput);
          } else {
            resolve(Buffer.from(String(pngOutput), 'binary'));
          }
        } catch (err) {
          reject(new Error(`Failed to convert PNG output to Buffer: ${err.message}`));
        }
      });

      emitter.on('error', (error) => {
        // Restore state
        this.fileType = originalFileType;
        this.args = originalArgs;
        reject(new Error(`OpenSCAD error: ${error.message}. Stderr: ${stderrBuf}`));
      });
    });
  }
}
/**
 * Web Worker for OpenSCAD WASM compilation
 * This worker handles the WASM compilation in a separate thread
 */

import OpenSCAD from './wasm_loader_browser.js';

let instance;

/**
 * Gets the version of the WASM OpenSCAD engine.
 * @returns {Promise<string>} Resolves with the version string.
 */
async function getWasmVersion() {
    let version = '';
    let wasmInstance;
    try {
        wasmInstance = await OpenSCAD({
            print: (text) => {
                version += text + '\n';
            },
            printErr: (text) => {
                version += text + '\n';
            }
        });
        
        // Call with --version, which should print version and exit
        wasmInstance.callMain(['--version']);
        
        // Wait a tick to let output flush (WASM is sync)
        await new Promise((r) => setTimeout(r, 10));
        
        // Try to extract version from output
        const match = version.match(/OpenSCAD version[^\n]*/i);
        if (match) {
            return match[0];
        }
        return version.trim();
    } catch (error) {
        throw new Error(`Failed to get WASM version: ${error.message}`);
    }
}

/**
 * Compiles OpenSCAD code using the WASM engine in the worker
 * @param {string} scadCode - The OpenSCAD code.
 * @param {string} fileType - Output file type (e.g., 'stl', 'amf').
 * @param {string[]} args - Extra command-line arguments.
 * @returns {Promise<string>} The compiled output.
 */
async function compileWasm(scadCode, fileType = 'stl', args = []) {
    let stdout = '';
    let stderr = '';
    
    try {
        instance = await OpenSCAD({
            print: (text) => {
                stdout += text + '\n';
                // Send stdout updates to main thread
                self.postMessage({
                    type: 'stdout',
                    data: text + '\n'
                });
            },
            printErr: (text) => {
                stderr += text + '\n';
                // Send stderr updates to main thread
                self.postMessage({
                    type: 'stderr', 
                    data: text + '\n'
                });
            }
        });

        // Write the input file
        instance.FS.writeFile("/input.scad", scadCode);

        const outputName = `/output.${fileType}`;
        
        // Run OpenSCAD compilation
        instance.callMain(["/input.scad", "-o", outputName].concat(args));

        // Read the output file
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

        return resultString;
    } catch (error) {
        throw new Error(`Compilation failed: ${error.message}`);
    }
}

// Handle messages from the main thread
self.onmessage = async function(e) {
    const { id, type, scadCode, fileType, args } = e.data;
    
    try {
        switch (type) {
            case 'compile':
                const result = await compileWasm(scadCode, fileType, args);
                self.postMessage({
                    type: 'done',
                    id: id,
                    data: result
                });
                break;
                
            case 'getVersion':
                const version = await getWasmVersion();
                self.postMessage({
                    type: 'version',
                    id: id,
                    data: version
                });
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            id: id,
            error: error.message
        });
    }
};

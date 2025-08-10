/**
 * Browser-compatible WASM loader for OpenSCAD
 * This loads the WASM module using fetch instead of Node.js fs
 */

async function initializeOpenSCAD(options = {}) {
    // In browser, we need to fetch the WASM files from URLs
    const wasmJsUrl = new URL('../release/openscad.wasm.js', import.meta.url);
    const wasmBinaryUrl = new URL('../release/openscad.wasm', import.meta.url);
    
    try {
        // Fetch the WASM binary
        const wasmBinaryResponse = await fetch(wasmBinaryUrl);
        if (!wasmBinaryResponse.ok) {
            throw new Error(`Failed to fetch WASM binary: ${wasmBinaryResponse.status}`);
        }
        const wasmBinary = await wasmBinaryResponse.arrayBuffer();
        options.wasmBinary = new Uint8Array(wasmBinary);

        // Fetch the WASM JS file
        const wasmJsResponse = await fetch(wasmJsUrl);
        if (!wasmJsResponse.ok) {
            throw new Error(`Failed to fetch WASM JS: ${wasmJsResponse.status}`);
        }
        const wasmJsContent = await wasmJsResponse.text();

        const module = {
            noInitialRun: true,
            locateFile: (path) => {
                // Return the URL for the requested file
                if (path === 'openscad.wasm') {
                    return wasmBinaryUrl.href;
                }
                return new URL(`./${path}`, import.meta.url).href;
            },
            ...options,
        };

        // Store module globally temporarily for the WASM JS to access
        globalThis.OpenSCAD = module;
        
        // Execute the WASM JS content
        // Create a function scope to execute the WASM JS code
        const wasmJsFunction = new Function(wasmJsContent);
        wasmJsFunction();
        
        // Clean up global
        delete globalThis.OpenSCAD;

        // Wait for runtime initialization
        await new Promise((resolve, reject) => {
            module.onRuntimeInitialized = () => resolve();
            // Add error handling
            module.onAbort = (error) => reject(new Error(`WASM module aborted: ${error}`));
            // Set a timeout as fallback
            setTimeout(() => reject(new Error('WASM initialization timeout')), 30000);
        });

        return module;
    } catch (error) {
        throw new Error(`Failed to initialize OpenSCAD WASM: ${error.message}`);
    }
}

async function OpenSCAD(options = {}) {
    return initializeOpenSCAD(options);
}

export { OpenSCAD as default };

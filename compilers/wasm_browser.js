/**
 * Browser-compatible OpenSCAD compiler using Web Workers
 * This provides the same interface as the Node.js version but runs in the browser
 */

/**
 * Custom EventEmitter-like class for browser compatibility
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(eventName, listener) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(listener);
        return this;
    }
    
    emit(eventName, ...args) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
        return this;
    }
    
    removeListener(eventName, listener) {
        if (this.events[eventName]) {
            const index = this.events[eventName].indexOf(listener);
            if (index > -1) {
                this.events[eventName].splice(index, 1);
            }
        }
        return this;
    }
    
    removeAllListeners(eventName) {
        if (eventName) {
            delete this.events[eventName];
        } else {
            this.events = {};
        }
        return this;
    }
}

let workerInstance = null;
let messageId = 0;
const pendingMessages = new Map();

/**
 * Creates a new worker instance if needed
 */
function getWorker() {
    if (!workerInstance) {
        const workerUrl = new URL('./openscad-worker.js', import.meta.url);
        workerInstance = new Worker(workerUrl, { type: 'module' });
        
        workerInstance.onmessage = function(e) {
            const { type, id, data, error } = e.data;
            
            if (pendingMessages.has(id)) {
                const { emitter, resolve, reject } = pendingMessages.get(id);
                
                switch (type) {
                    case 'stdout':
                        emitter.emit('stdout', data);
                        break;
                    case 'stderr':
                        emitter.emit('stderr', data);
                        break;
                    case 'done':
                        emitter.emit('done', data);
                        pendingMessages.delete(id);
                        resolve(data);
                        break;
                    case 'version':
                        pendingMessages.delete(id);
                        resolve(data);
                        break;
                    case 'error':
                        emitter.emit('error', new Error(error));
                        pendingMessages.delete(id);
                        reject(new Error(error));
                        break;
                }
            }
        };
        
        workerInstance.onerror = function(error) {
            console.error('Worker error:', error);
            // Reject all pending messages
            for (const [id, { emitter, reject }] of pendingMessages) {
                emitter.emit('error', error);
                reject(error);
            }
            pendingMessages.clear();
        };
    }
    
    return workerInstance;
}

/**
 * Gets the version of the WASM OpenSCAD engine.
 * @returns {Promise<string>} Resolves with the version string.
 */
export async function getWasmVersion() {
    const worker = getWorker();
    const id = ++messageId;
    
    return new Promise((resolve, reject) => {
        const emitter = new EventEmitter();
        pendingMessages.set(id, { emitter, resolve, reject });
        
        worker.postMessage({
            id: id,
            type: 'getVersion'
        });
        
        // Set a timeout for the version request
        setTimeout(() => {
            if (pendingMessages.has(id)) {
                pendingMessages.delete(id);
                reject(new Error('Version request timeout'));
            }
        }, 10000);
    });
}

/**
 * Compiles OpenSCAD code using the WASM engine in a web worker, emitting live updates.
 * @param {string} scadCode - The OpenSCAD code.
 * @param {string} [fileType='stl'] - Output file type (e.g., 'stl', 'amf').
 * @param {string[]} [args=[]] - Extra command-line arguments.
 * @returns {EventEmitter} Emits 'stdout', 'stderr', 'done', and 'error' events.
 */
export function compileWasm(scadCode, fileType = 'stl', args = []) {
    const emitter = new EventEmitter();
    const worker = getWorker();
    const id = ++messageId;
    
    // Store the promise resolvers for this message
    const promise = new Promise((resolve, reject) => {
        pendingMessages.set(id, { emitter, resolve, reject });
    });
    
    // Send compilation request to worker
    worker.postMessage({
        id: id,
        type: 'compile',
        scadCode: scadCode,
        fileType: fileType,
        args: args
    });
    
    // Set a timeout for compilation (adjust as needed)
    setTimeout(() => {
        if (pendingMessages.has(id)) {
            const { emitter, reject } = pendingMessages.get(id);
            pendingMessages.delete(id);
            const error = new Error('Compilation timeout');
            emitter.emit('error', error);
            reject(error);
        }
    }, 60000); // 60 second timeout
    
    return emitter;
}

/**
 * Cleanup function to terminate the worker
 */
export function terminateWorker() {
    if (workerInstance) {
        workerInstance.terminate();
        workerInstance = null;
        pendingMessages.clear();
    }
}

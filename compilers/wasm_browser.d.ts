/**
 * Browser-compatible EventEmitter interface
 */
export interface EventEmitter {
    on(eventName: string, listener: (...args: any[]) => void): this;
    emit(eventName: string, ...args: any[]): boolean;
    removeListener(eventName: string, listener: (...args: any[]) => void): this;
    removeAllListeners(eventName?: string): this;
}

/**
 * Gets the version of the WASM OpenSCAD engine.
 * @returns Promise that resolves with the version string.
 */
export function getWasmVersion(): Promise<string>;

/**
 * Compiles OpenSCAD code using the WASM engine in a web worker, emitting live updates.
 * @param scadCode The OpenSCAD code to compile.
 * @param fileType Output file type (e.g., 'stl', 'amf'). Defaults to 'stl'.
 * @param args Extra command-line arguments. Defaults to empty array.
 * @returns EventEmitter that emits 'stdout', 'stderr', 'done', and 'error' events.
 */
export function compileWasm(
    scadCode: string, 
    fileType?: string, 
    args?: string[]
): EventEmitter;

/**
 * Terminates the web worker (useful for cleanup).
 */
export function terminateWorker(): void;

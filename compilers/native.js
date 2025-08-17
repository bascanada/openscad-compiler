/**
 * Gets the version of the native OpenSCAD executable.
 * @param {string} executablePath - Path to the openscad executable.
 * @returns {Promise<string>} Resolves with the version string.
 */
export async function getNativeVersion(executablePath = 'openscad') {
  return new Promise((resolve, reject) => {
    const proc = spawn(executablePath, ['--version']);
    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    proc.stderr.on('data', (data) => {
      output += data.toString();
    });
    proc.on('error', (err) => reject(err));
    proc.on('close', () => {
      // Try to extract version from output
      const match = output.match(/OpenSCAD version[^\n]*/i);
      if (match) {
        resolve(match[0]);
      } else {
        resolve(output.trim());
      }
    });
  });
}
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';


/**
 * Compiles OpenSCAD code using the native executable, emitting live updates.
 * @param {string} scadCode - The OpenSCAD code.
 * @param {string} executablePath - Path to the openscad executable.
 * @param {string} [fileType='stl'] - Output file type (e.g., 'stl', 'amf').
 * @param {string[]} [args=[]] - Extra command-line arguments.
 * @returns {EventEmitter} Emits 'stdout', 'stderr', 'done', and 'error' events.
 */
export function compileNative(scadCode, executablePath, fileType = 'stl', args = []) {
  const emitter = new EventEmitter();
  (async () => {
    const tempId = randomBytes(8).toString('hex');
    const tempDir = tmpdir();
    const inputFile = join(tempDir, `openscad-input-${tempId}.scad`);
    const outputFile = join(tempDir, `openscad-output-${tempId}.${fileType}`);

    try {
      await fs.writeFile(inputFile, scadCode);
      const baseArgs = ['-o', outputFile, inputFile];
      const process = spawn(
        executablePath,
        baseArgs.concat(args)
      );

      process.stdout && process.stdout.on('data', (data) => {
        emitter.emit('stdout', data.toString());
      });
      process.stderr && process.stderr.on('data', (data) => {
        emitter.emit('stderr', data.toString());
      });

      process.on('error', (error) => {
        emitter.emit('error', error);
      });

      process.on('close', async (code) => {
        try {
          if (code === 0) {
            try {
              const result = await fs.readFile(outputFile);
              emitter.emit('done', result);
            } catch (err) {
              emitter.emit('error', err);
            }
          } else {
            emitter.emit('error', new Error(`Native OpenSCAD process exited with code ${code}.`));
          }
        } finally {
          // Clean up temporary files after process exits
          await fs.unlink(inputFile).catch(() => {});
          await fs.unlink(outputFile).catch(() => {});
        }
      });
    } catch (err) {
      emitter.emit('error', err);
      // Clean up if process never started
      await fs.unlink(inputFile).catch(() => {});
      await fs.unlink(outputFile).catch(() => {});
    }
  })();
  return emitter;
}
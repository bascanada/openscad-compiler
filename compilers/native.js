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
 * @returns {EventEmitter} Emits 'stdout', 'stderr', 'done', and 'error' events.
 */
export function compileNative(scadCode, executablePath) {
  const emitter = new EventEmitter();
  (async () => {
    const tempId = randomBytes(8).toString('hex');
    const tempDir = tmpdir();
    const inputFile = join(tempDir, `openscad-input-${tempId}.scad`);
    const outputFile = join(tempDir, `openscad-output-${tempId}.stl`);

    try {
      await fs.writeFile(inputFile, scadCode);
      const process = spawn(executablePath, ['-o', outputFile, inputFile,
        '--backend=manifold',
        '--enable=lazy-union',
        '--enable=roof',
      ]);

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
        if (code === 0) {
          try {
            const stl = await fs.readFile(outputFile, 'utf8');
            emitter.emit('done', stl);
          } catch (err) {
            emitter.emit('error', err);
          }
        } else {
          emitter.emit('error', new Error(`Native OpenSCAD process exited with code ${code}.`));
        }
      });
    } catch (err) {
      emitter.emit('error', err);
    } finally {
      // Clean up temporary files
      try {
        await fs.unlink(inputFile);
        await fs.unlink(outputFile);
      } catch (cleanupErr) {
        emitter.emit('error', cleanupErr);
      }
    }
  })();
  return emitter;
}
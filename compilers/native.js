import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

/**
 * Compiles OpenSCAD code using the native executable.
 * @param {string} scadCode - The OpenSCAD code.
 * @param {string} executablePath - Path to the openscad executable.
 * @returns {Promise<string>} STL data as a string.
 */
export async function compileNative(scadCode, executablePath) {
  const tempId = randomBytes(8).toString('hex');
  const tempDir = tmpdir();
  const inputFile = join(tempDir, `openscad-input-${tempId}.scad`);
  const outputFile = join(tempDir, `openscad-output-${tempId}.stl`);

  try {
    // Write the input .scad file
    await fs.writeFile(inputFile, scadCode);

    // Run the native openscad command
    await new Promise((resolve, reject) => {
      const process = spawn(executablePath, ['-o', outputFile, inputFile, '--preview', '--viewall', '--autocenter']);
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('error', (error) => {
        console.error('Native Compilation Error (spawn):', error);
        if (error.code === 'ENOENT') {
          return reject(
            new Error(
              `Failed to execute native OpenSCAD. The executable was not found at the specified path: "${executablePath}". Please ensure the path is correct in the extension settings.`
            )
          );
        }
        reject(new Error('Failed to spawn native OpenSCAD process.'));
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          const errorMessage = `Native OpenSCAD process exited with code ${code}.`;
          console.error(errorMessage);
          console.error('stderr:', stderr);
          reject(new Error(`${errorMessage}\n${stderr}`));
        }
      });
    });

    // Read the resulting .stl file
    return await fs.readFile(outputFile, 'utf8');

  } finally {
    // Cleanup temporary files
    await fs.unlink(inputFile).catch(() => {}); // Ignore errors if file doesn't exist
    await fs.unlink(outputFile).catch(() => {});
  }
}
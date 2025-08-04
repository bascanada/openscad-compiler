import { execFile } from 'child_process';
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
      execFile(executablePath, ['-o', outputFile, inputFile], (error) => {
        if (error) {
          console.error('Native Compilation Error:', error);
          return reject(new Error('Failed to execute native OpenSCAD. Is it installed and in your PATH?'));
        }
        resolve();
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
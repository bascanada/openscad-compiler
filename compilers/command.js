/**
 * @typedef {'stl' | '3mf'} OutputFormat
 */

/**
 * @typedef {'preview' | 'render'} Quality
 */

/**
 * Generates OpenSCAD command-line arguments.
 */
export class Command {
  /**
   * @param {object} options
   * @param {string} options.version - The OpenSCAD version.
   * @param {Quality} options.quality - The desired quality.
   * @param {OutputFormat} options.outputFormat - The output format.
   */
  constructor({ version, quality, outputFormat }) {
    this.version = version;
    this.quality = quality;
    this.outputFormat = outputFormat;
  }

  /**
   * Gets the command-line arguments.
   * @param {string} inputFile - The input file path.
   * @param {string} outputFile - The output file path.
   * @returns {string[]} The command-line arguments.
   */
  getArgs(inputFile, outputFile) {
    const args = ['-o', outputFile, inputFile];

    if (this.quality === 'preview') {
      if (this.version.startsWith('2021')) {
        args.push('--preview');
      } else {
        args.push('--preview=fast');
      }
    }

    return args;
  }
}

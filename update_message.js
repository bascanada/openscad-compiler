/**
 * @typedef {'compiling' | 'output' | 'error'} MessageType
 */

/**
 * Represents a message sent from the compiler.
 */
export class UpdateMessage {
  /**
   * @param {object} options
   * @param {MessageType} options.type - The message type.
   * @param {any} [options.payload] - The message payload.
   */
  constructor({ type, payload }) {
    this.type = type;
    this.payload = payload;
  }
}

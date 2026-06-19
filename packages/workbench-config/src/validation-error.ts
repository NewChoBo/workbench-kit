export class WorkbenchConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkbenchConfigValidationError';
  }
}

/**
 * Consistent success response shape across all endpoints.
 * { success: true, statusCode, message, data }
 */
export class ApiResponse {
  constructor(statusCode, data = null, message = 'Success') {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}

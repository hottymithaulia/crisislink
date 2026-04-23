/**
 * Standard API Response Format
 * Ensures consistent response structure across all endpoints
 */

class ApiResponse {
  /**
   * Create success response
   * @param {any} data - Response data
   * @param {string} message - Optional success message
   * @returns {Object} Standardized success response
   */
  static success(data = null, message = 'Success') {
    return {
      success: true,
      data,
      error: null,
      message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create error response
   * @param {string} error - Error message
   * @param {number} code - HTTP status code (optional)
   * @param {any} details - Additional error details
   * @returns {Object} Standardized error response
   */
  static error(error, code = 500, details = null) {
    return {
      success: false,
      data: null,
      error: {
        message: error,
        code,
        details
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create paginated response
   * @param {Array} data - Response data
   * @param {Object} pagination - Pagination info
   * @param {string} message - Optional message
   * @returns {Object} Paginated response
   */
  static paginated(data, pagination, message = 'Success') {
    return {
      success: true,
      data,
      pagination,
      error: null,
      message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Express middleware for consistent responses
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next
   */
  static middleware(req, res, next) {
    res.apiSuccess = (data, message) => {
      res.status(200).json(ApiResponse.success(data, message));
    };

    res.apiError = (error, code = 500, details) => {
      res.status(code).json(ApiResponse.error(error, code, details));
    };

    res.apiCreated = (data, message = 'Created successfully') => {
      res.status(201).json(ApiResponse.success(data, message));
    };

    res.apiPaginated = (data, pagination, message) => {
      res.status(200).json(ApiResponse.paginated(data, pagination, message));
    };

    next();
  }
}

module.exports = ApiResponse;

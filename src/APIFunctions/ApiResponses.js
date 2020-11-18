/**
 * Class to hold the server responses
 * @member {bool} error - Lets us know if there was any error regarding
 * the API call. This variable should be false if there was no error.
 * @member {any} responseData - Contains anything we would like to return
 * from the API call (e.g. object array or error data)
 * @member {string|null} token - An authentication token
 */
class ApiResponse {
  constructor(error = false, responseData = null) {
    this.error = error;
    this.responseData = responseData;
  }
}

module.exports = {
  ApiResponse
};
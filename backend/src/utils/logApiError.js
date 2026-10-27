function logApiError(req, error, event, route = req.route?.path || 'unmatched') {
  console.error(JSON.stringify({
    level: 'error',
    event,
    requestId: req.requestId || null,
    method: req.method,
    route,
    errorCode: error.code || error.name || 'UNKNOWN',
    cleanupFailed: Boolean(error.cleanupError),
  }));
}

module.exports = logApiError;
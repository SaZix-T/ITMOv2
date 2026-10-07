module.exports = function errorHandler(err, req, res, _next) {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
};
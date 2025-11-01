// middlewares/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error('📛 Stack erreur :', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;

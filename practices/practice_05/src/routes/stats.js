const { Router } = require('express');

module.exports = function statsRouter(db) {
  const router = Router();

  router.get('/completed', (req, res, next) => {
    try {
      res.json(db.statsCompleted());
    } catch (err) {
      next(err);
    }
  });

  return router;
};

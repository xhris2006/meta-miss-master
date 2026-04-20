const rankingService = require("../services/ranking.service");

class RankingController {
  async getGlobalRanking(req, res, next) {
    try {
      const { type } = req.query;
      const ranking = await rankingService.getGlobalRanking(type);
      res.json({ success: true, data: ranking });
    } catch (err) {
      next(err);
    }
  }

  async getTopN(req, res, next) {
    try {
      const { n = 5, type } = req.query;
      const ranking = await rankingService.getTopN(+n, type);
      res.json({ success: true, data: ranking });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await rankingService.getStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RankingController();

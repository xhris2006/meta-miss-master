const voteService = require("../services/vote.service");

class VoteController {
  async getVotesByCandidate(req, res, next) {
    try {
      const votes = await voteService.getVotesByCandidate(req.params.candidateId);
      res.json({ success: true, data: votes });
    } catch (err) {
      next(err);
    }
  }

  async getUserVotes(req, res, next) {
    try {
      const votes = await voteService.getUserVotes(req.user.id);
      res.json({ success: true, data: votes });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VoteController();

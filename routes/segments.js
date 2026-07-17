const express = require('express');
const router = express.Router();
const { getSegmentDistribution, getMonthlySegmentTrend, getSegmentList } = require('../controllers/segmentController');

router.get('/', getSegmentList);
router.get('/distribution', getSegmentDistribution);
router.get('/trend', getMonthlySegmentTrend);

module.exports = router;

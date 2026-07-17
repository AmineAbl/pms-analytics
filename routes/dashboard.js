const express = require('express');
const router = express.Router();
const { getDashboard, getMonthlyTrend } = require('../controllers/dashboardController');

router.get('/', getDashboard);
router.get('/trend', getMonthlyTrend);

module.exports = router;

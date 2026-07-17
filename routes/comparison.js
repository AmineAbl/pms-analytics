const express = require('express');
const router = express.Router();
const { compareYTD, compareMonthly } = require('../controllers/comparisonController');

router.get('/ytd', compareYTD);
router.get('/monthly', compareMonthly);

module.exports = router;

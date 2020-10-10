const express = require('express');
const router = express.Router();

/* Routes import */
const word = require('./word');

/* Routes linking */
router.use('/api/v1/word', word);

module.exports = router;

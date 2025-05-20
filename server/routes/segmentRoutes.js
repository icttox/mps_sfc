const express = require('express');
const router = express.Router();
const { 
  getSegmentFolioCuts,
  searchSegmentFolios,
  getLocations
} = require('../controllers/segmentController');

// Route to get segment folio cut details
router.get('/sfc', getSegmentFolioCuts);

// Route to search for segment folios
router.get('/search-folios', searchSegmentFolios);

// Route to get locations
router.get('/locations', getLocations);

module.exports = router;
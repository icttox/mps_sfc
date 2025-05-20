const { pool } = require('../config/db');
const { getSegmentDetailsQuery, formatSegmentDetails } = require('../models/segment_query');

/**
 * Get segment details with associated BOM information
 * @param {Object} req - Express request object with segment IDs
 * @param {Object} res - Express response object
 */
const getSegmentFolioCuts = async (req, res) => {
  try {
    const { ids, location } = req.query;
    console.log(`Received request for segment folio cuts with IDs: ${ids}, location: ${location}`);
    
    // For the initial request without IDs, we'll just show the most recent segments
    let query;
    try {
      if (!ids) {
        console.log('No segment IDs provided, returning most recent segments');
        query = getSegmentDetailsQuery(null, 1, 500, location);
      } else {
        // Parse segment IDs
        let segmentIds;
        // Handle both array and comma-separated string formats
        segmentIds = Array.isArray(ids) ? ids : ids.split(',').map(id => id.trim());
        
        // Validate that we have at least one ID
        if (segmentIds.length === 0) {
          return res.status(400).json({ 
            message: 'At least one segment ID is required' 
          });
        }
        
        // Validate that all IDs are valid numbers
        segmentIds.forEach(id => {
          if (isNaN(parseInt(id))) {
            throw new Error(`Invalid segment ID: ${id}`);
          }
        });
        
        query = getSegmentDetailsQuery(segmentIds.join(','), 1, 500, location);
      }
      
      console.log('Generated SQL query:', query);
      
      // Set statement timeout to 3 minutes (180000ms)
      await pool.query('SET statement_timeout = 180000');
      
      // Execute the main query with a longer timeout
      console.log('Starting query execution with extended timeout...');
      const { rows } = await pool.query(query);
      console.log(`Query executed successfully, received ${rows.length} rows`);
      
      if (rows.length === 0) {
        console.log('Query returned zero rows');
        return res.status(404).json({ message: 'No segment data found for the specified criteria' });
      }
      
      // Format data for response
      console.log('Formatting segment details data');
      const formattedData = formatSegmentDetails(rows);
      console.log('Data formatting completed successfully');
      
      return res.status(200).json(formattedData);
    } catch (dbError) {
      console.error('Database query execution failed:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error in getSegmentFolioCuts:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message,
      details: error.toString() 
    });
  }
};

/**
 * Search for segment folios in the database
 * @param {Object} req - Express request object with search parameters
 * @param {Object} res - Express response object
 */
const searchSegmentFolios = async (req, res) => {
  try {
    const { term } = req.query;
    
    if (!term) {
      return res.status(400).json({ message: 'Search term is required' });
    }
    
    // Query to search for segment folios
    const query = `
      SELECT 
        ms.id,
        ms.folio,
        ms.name,
        ms.state,
        sl.name AS location_name
      FROM 
        mrp_segment ms
      LEFT JOIN
        stock_location sl ON ms.location_id = sl.id
      WHERE 
        ms.folio ILIKE $1 OR
        ms.name ILIKE $1
      ORDER BY 
        ms.folio
      LIMIT 50
    `;
    
    const { rows } = await pool.query(query, [`%${term}%`]);
    
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error searching segment folios:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Get all unique locations from segments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getLocations = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT sl.name as location 
      FROM stock_location sl
      INNER JOIN mrp_segment ms ON ms.location_id = sl.id
      WHERE sl.name IS NOT NULL AND sl.id NOT IN (12)
      ORDER BY sl.name ASC
    `;
    
    const { rows } = await pool.query(query);
    return res.status(200).json(rows.map(row => row.location));
  } catch (error) {
    console.error('Error fetching locations:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  getSegmentFolioCuts,
  searchSegmentFolios,
  getLocations
};
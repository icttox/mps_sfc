/**
 * SQL query to retrieve segment details with associated BOM information
 * @param {string} ids - Comma-separated segment IDs
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @param {string} location - Location name to filter by
 * @returns {string} SQL query
 */
const getSegmentDetailsQuery = (ids, page = 1, limit = 500, location = null) => {
  const conditions = [];
  
  conditions.push("ms.state NOT IN ('cancel', 'done')");
  conditions.push("mp.state NOT IN ('draft', 'transfer', 'cancel', 'done')");
  
  if (ids) {
    conditions.push(`ms.id IN (${ids})`);
  }
  
  if (location && location.trim()) {
    // Escapar comillas simples en el nombre de la ubicación
    const escapedLocation = location.replace(/'/g, "''");
    conditions.push(`sl.name = '${escapedLocation}'`);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const query = `
    SELECT
      ms.folio,
      sl.name AS location,
      ms.name,
      ms.state,
      mp.name AS production,
      so.name AS order,
      mp.product_qty,
      pp.default_code,
      COALESCE(it.value,pp.individual_name,it2.value,pt.name) AS product,
      CASE 
          WHEN TRIM(STRING_AGG(CONCAT(ptal.name_web, ' ', pav.name), ' ')) <> ''
          THEN STRING_AGG(CONCAT(ptal.name_web, ' ', pav.name), ' ')
          ELSE mpc.name END AS color,
      mbld.thickness,
      mbld.side,
      mbld.width_cut,
      mbld.long_cut
    FROM mrp_segment AS ms
    LEFT JOIN stock_location AS sl ON ms.location_id = sl.id
    LEFT JOIN mrp_segment_line AS msl ON ms.id = msl.segment_id
    LEFT JOIN mrp_production AS mp ON msl.mrp_production_id = mp.id
    LEFT JOIN mrp_production_sale_rel AS mpsr ON mp.id = mpsr.production_id
    LEFT JOIN sale_order AS so ON COALESCE(mp.sale_id, mpsr.sale_id) = so.id
    LEFT JOIN product_product AS pp ON mp.product_id = pp.id
    LEFT JOIN product_template AS pt ON pp.product_tmpl_id = pt.id
    LEFT JOIN ir_translation AS it ON it.lang = 'es_MX' 
        AND it.name = 'product.product,individual_name' AND it.res_id = pp.id
    LEFT JOIN ir_translation AS it2 ON it2.lang = 'es_MX' 
        AND it2.name = 'product.template,name' AND it2.res_id = pt.id
    LEFT JOIN mrp_bom AS mb ON mp.bom_id = mb.id
    LEFT JOIN mrp_bom_line AS mbl ON mb.id = mbl.bom_id
    INNER JOIN mrp_bom_line_detail AS mbld ON mbl.id = mbld.bom_line_id
    LEFT JOIN mrp_product_color AS mpc ON mbld.color_id = mpc.id
    LEFT JOIN product_product AS pp2 ON mbl.product_id = pp2.id
    LEFT JOIN product_attribute_value_product_product_rel AS pavppr ON pp2.id = pavppr.product_product_id
    LEFT JOIN product_attribute_value AS pav ON pavppr.product_attribute_value_id = pav.id
    LEFT JOIN product_template_attribute_line AS ptal ON pp2.product_tmpl_id = ptal.product_tmpl_id
        AND pav.attribute_id = ptal.attribute_id
    ${whereClause}
    GROUP BY ms.id,so.id,mp.id,sl.id,pp.id,mbld.id,mpc.id,it.id,it2.id,pt.id
    ORDER BY color,mbld.thickness,ms.folio,mp.name,pp.default_code
  `;
  
  console.log('Generated SQL query:', query);
  return query;
};

/**
 * Format the segment details results for use in the application
 * @param {Array} rows - The raw query results
 * @returns {Array} - Formatted segment details array
 */
const formatSegmentDetails = (rows) => {
  const result = [];
  
  for (const row of rows) {
    result.push({
      folio: row.folio || '',
      location: row.location || '',
      segment_name: row.name || '',
      state: row.state || '',
      production: row.production || '',
      order: row.order || '',
      product_qty: Number(row.product_qty) || 0,
      product_code: row.default_code || '',
      product: row.product || '',
      color: row.color || '',
      thickness: row.thickness || 0,
      side: row.side || '',
      width_cut: row.width_cut || 0,
      long_cut: row.long_cut || 0,
      attribute: row.attribute || ''
    });
  }
  
  return result;
};

module.exports = {
  getSegmentDetailsQuery,
  formatSegmentDetails
};
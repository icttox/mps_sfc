/**
 * SQL query to generate the production schedule data
 * Includes only productions with state not in 'cancel', 'transfer', 'draft'
 * Links mrp_production with sale_order through mrp_production_sale_line_rel
 * @param {string} startDate - Start date in YYYY-MM-DD format for filtering
 * @param {string} endDate - End date in YYYY-MM-DD format for filtering
 * @param {boolean} includeNoCommitmentOrders - Whether to include sales orders without commitment dates
 */

const getProductionScheduleQuery = (startDate, endDate, includeNoCommitmentOrders = false) => {
  return `
    WITH valid_manufacturing_orders AS (
      SELECT
        mp.id AS production_id
      FROM mrp_production mp
      WHERE 
        mp.state NOT IN ('cancel', 'transfer', 'draft')
        AND (
          -- Include manufacturing orders with production dates in range
          NOT EXISTS (SELECT 1
            FROM mrp_production_sale_rel mpsr
            WHERE mpsr.production_id = mp.id
          )
          -- OR include manufacturing orders with sales orders that have commitment dates in range
          -- If includeNoCommitmentOrders is true, include orders without commitment date as well
          OR
          EXISTS (
            SELECT 1
            FROM mrp_production_sale_rel mpsr
            JOIN sale_order so ON mpsr.sale_id = so.id
            WHERE 
              mpsr.production_id = mp.id
              AND (
                ${includeNoCommitmentOrders ? 
                  `(so.commitment_date BETWEEN '${startDate}' AND '${endDate}' OR so.commitment_date IS NULL)` 
                  : 
                  `(so.commitment_date BETWEEN '${startDate}' AND '${endDate}')`
                }
              )
          )
        )
    ),
    valid_bill_of_material AS (
      SELECT
        mb.id AS bom_id
      FROM mrp_bom mb
      WHERE mb.active
        AND mb.product_id IN (SELECT product_id FROM mrp_production WHERE id IN (SELECT production_id FROM valid_manufacturing_orders))
    ),
    bom_line_details_color AS (
      SELECT
        mbl.id AS bom_line_id,
        CASE WHEN TRIM(STRING_AGG(CONCAT(ptal.name_web, ' ', pav.name), ' ')) <> ''
          THEN STRING_AGG(CONCAT(ptal.name_web, ' ', pav.name), ' ')
          ELSE Null END AS color
      FROM valid_bill_of_material vbom
      JOIN mrp_bom mb ON vbom.bom_id = mb.id
      JOIN mrp_bom_line mbl ON mb.id = mbl.bom_id
      JOIN product_product AS pp ON mbl.product_id = pp.id
      LEFT JOIN product_attribute_value_product_product_rel AS pavppr ON pp.id = pavppr.product_product_id
      LEFT JOIN product_attribute_value AS pav ON pavppr.product_attribute_value_id = pav.id
      LEFT JOIN product_template_attribute_line AS ptal ON pp.product_tmpl_id = ptal.product_tmpl_id
          AND pav.attribute_id = ptal.attribute_id
      GROUP BY mbl.id
    ),
    bom_line_details AS (
      SELECT
        mbld.bom_line_id,
        json_agg(
          json_build_object(
            'row', mbld.row,
            'width_cut', mbld.width_cut,
            'long_cut', mbld.long_cut,
            'thickness', mbld.thickness,
            'name', mbld.name,
            'kilos', mbld.kilos,
            'quantity', mbld.quantity,
            'color', COALESCE(bldc.color, pc.name),
            'caliber', cal.name_caliber,
            'side', mbld.side
          )
        ) AS details
      FROM 
        mrp_bom_line_detail mbld
      LEFT JOIN 
        mrp_product_color pc ON mbld.color_id = pc.id
      LEFT JOIN 
        mrp_product_caliber cal ON mbld.caliber_id = cal.id
      LEFT JOIN 
        bom_line_details_color bldc ON mbld.bom_line_id = bldc.bom_line_id
      WHERE 
        mbld.bom_line_id IN (
          SELECT id FROM mrp_bom_line WHERE bom_id IN (
            SELECT bom_id FROM valid_bill_of_material))
      GROUP BY
        mbld.bom_line_id
    ),
    bom_components AS (
      SELECT
        mb.product_id,
        jsonb_agg(
          jsonb_build_object(
            'line_id', mbl.id,
            'location_id', mbl.location_id,
            'location_name', sl.name,
            'product_id', mbl.product_id,
            'product_code', pp.default_code,
            'product_name', pt.name,
            'quantity', mbl.product_qty,
            'uom_name', uu.name,
            'details', COALESCE(bld.details, '[]'::json),
            'tiene_detalle', (bld.details IS NOT NULL)
          )
        ) AS component_data
      FROM 
        valid_bill_of_material vbom
      JOIN 
        mrp_bom mb ON vbom.bom_id = mb.id
      JOIN
        mrp_bom_line mbl ON mb.id = mbl.bom_id
      LEFT JOIN
        stock_location sl ON mbl.location_id = sl.id
      LEFT JOIN
        product_product pp ON mbl.product_id = pp.id
      LEFT JOIN
        product_template pt ON pp.product_tmpl_id = pt.id
      LEFT JOIN
        uom_uom uu ON mbl.product_uom_id = uu.id
      LEFT JOIN
        bom_line_details bld ON mbl.id = bld.bom_line_id
      GROUP BY
        mb.product_id
    ),
	production_workorders AS (
      SELECT
        mwo.production_id,
        jsonb_agg(
          jsonb_build_object(
            'name', mwo.name,
            'qty_produced', mwo.qty_produced,
            'qty_producing', mwo.qty_producing,
            'qty_production', mwo.qty,
            'workcenter', mwc.name,
            'state', mwo.state,
            'operation', mo.name,
            'sequence', mwo.sequence
          ) ORDER BY mwo.sequence
        ) AS workorder_data
      FROM 
        valid_manufacturing_orders vmo
      JOIN 
        mrp_workorder mwo ON vmo.production_id = mwo.production_id
      LEFT JOIN
        mrp_workcenter mwc ON mwo.workcenter_id = mwc.id
      LEFT JOIN
        mrp_routing_workcenter mo ON mwo.operation_id = mo.id
      GROUP BY
        mwo.production_id
    ),
	production_sale_line AS (
	  SELECT
        mpsl.production_id,
		sol.order_id,
        jsonb_agg(
          jsonb_build_object(
		    'sale_line_id', sol.id,
			'sol_product_id', ppsol.id,
			'sol_product_code', ppsol.default_code,
            'sol_template_name', ptsol.name,
            'sol_product_individual', ppsol.individual_name,
            'sol_qty', sol.product_uom_qty,
            'sol_pending_qty', sol.pending_qty
          ) ORDER BY mpsl.production_id
        ) AS sale_line_data
      FROM 
        valid_manufacturing_orders vmo
      JOIN 
        mrp_production_sale_line_rel mpsl ON vmo.production_id = mpsl.production_id
      JOIN
        sale_order_line sol ON mpsl.sale_line_id = sol.id
      JOIN
        product_product ppsol ON sol.product_id = ppsol.id
      JOIN
        product_template ptsol ON ppsol.product_tmpl_id = ptsol.id
      GROUP BY 
        mpsl.production_id, sol.order_id
    ),
	production_sale AS (
	  SELECT
        mps.production_id,
		mps.sale_id,
		jsonb_agg(
          jsonb_build_object(
            'name', so.name,
            'client_order_ref', so.client_order_ref,
            'commitment_date', so.commitment_date,
            'shipment_date', so.shipment_date,
            'date_validator', so.date_validator,
            'date_order', so.date_order,
            'order_priority', so.priority,
            'manufacture', so.manufacture,
            'partner', rp.name,
			'order_lines', COALESCE(psl.sale_line_data, '[]'::jsonb)
          ) ORDER BY so.commitment_date
        ) AS sale_data
      FROM 
        valid_manufacturing_orders vmo
      JOIN 
        mrp_production_sale_rel mps ON vmo.production_id = mps.production_id
      JOIN
        sale_order so ON mps.sale_id = so.id
	  JOIN
	    res_partner rp ON so.partner_id = rp.id
	  JOIN
	    production_sale_line psl ON mps.production_id = psl.production_id AND mps.sale_id = psl.order_id
      GROUP BY 
        mps.production_id, mps.sale_id
    ),
	product_attributes AS (
	  SELECT
        pavppr.product_product_id,
		jsonb_agg(
          jsonb_build_object(
            'attribute_name', pa.name,
            'attribute_value', pav.name
          ) ORDER BY pa.name
        ) AS attributes_data
      FROM 
        product_attribute_value_product_product_rel pavppr
      JOIN
        product_attribute_value pav ON pavppr.product_attribute_value_id = pav.id
	  JOIN
	    product_attribute pa ON pav.attribute_id = pa.id
      WHERE 
        pavppr.product_product_id IN (
          SELECT product_id FROM mrp_production WHERE id IN (
            SELECT production_id FROM valid_manufacturing_orders
          )
        )
      GROUP BY 
        pavppr.product_product_id
    ),
	product_stock AS (
    SELECT 
        sq.product_id,
        jsonb_agg(
            jsonb_build_object(
                'onhand_location', ohsl.name,
                'onhand_quantity', ROUND(sq.quantity_sum::numeric, 4)
            ) ORDER BY ohsl.name
        ) AS onhand_data
	    FROM (
	        SELECT 
	            product_id,
	            location_id,
	            SUM(quantity) AS quantity_sum
	        FROM 
	            stock_quant
	        WHERE 
	            company_id = 1
              AND product_id IN (
                SELECT product_id FROM mrp_production WHERE id IN (
                  SELECT production_id FROM valid_manufacturing_orders
                )
              )
	        GROUP BY 
	            product_id, location_id
	    ) sq
	    JOIN
	        stock_location ohsl ON ohsl.id = sq.location_id
	    WHERE
	        ohsl.usage = 'internal'
	    GROUP BY
	        sq.product_id
	),
	production_segments AS (
      SELECT
        msl.mrp_production_id,
        jsonb_agg(
          jsonb_build_object(
            'segment_id', ms.id,
            'name', ms.name,
            'state', ms.state,
            'folio', ms.folio,
            'date', ms.date,
            'express', ms.express,
            'qty_segmented', COALESCE(msl.manufacture_qty, msl.qty_segmented, msl.product_qty, 0)
          ) ORDER BY ms.date
        ) AS segment_data
      FROM
        mrp_segment_line msl
      JOIN
        mrp_segment ms ON msl.segment_id = ms.id
      WHERE
        msl.mrp_production_id IN (
          SELECT production_id FROM valid_manufacturing_orders
        )
      GROUP BY
        msl.mrp_production_id
    )

	 SELECT
      mp.id AS production_id,
      mp.name AS production_name,
      mp.product_id,
      mp.product_qty as production_qty,
      mp.state,
      mp.partner_id,
      sl.name AS location_name,
      pp.default_code AS product_code,
      pp.individual_name,
      pt.name AS product_name,
      COALESCE(pf.name, 'Sin Familia') AS family_name,
      COALESCE(pl.name, 'Sin Linea') AS line_name,
      COALESCE(pg.name, 'Sin Grupo') AS group_name,
      COALESCE(py.name, 'Sin Tipo') AS type_name,
      COALESCE(pcg."Nombre", 'Sin Categoria') AS category_name,
      COALESCE(uu.name, 'Unit') AS uom_name,
      bc.component_data,
      pw.workorder_data,
	  ps.sale_data,
	  att.attributes_data,
	  pstk.onhand_data,
	  pseg.segment_data
    FROM 
      valid_manufacturing_orders vmo
    JOIN 
      mrp_production mp ON vmo.production_id = mp.id
    JOIN 
      product_product pp ON mp.product_id = pp.id
    JOIN 
      product_template pt ON pp.product_tmpl_id = pt.id
    LEFT JOIN 
      stock_location sl ON mp.procurement_location_id = sl.id
    LEFT JOIN
      production_sale ps ON mp.id = ps.production_id
    LEFT JOIN
      bom_components bc ON mp.product_id = bc.product_id
    LEFT JOIN
      production_workorders pw ON mp.id = pw.production_id
	LEFT JOIN
      product_attributes att ON mp.product_id = att.product_product_id
	LEFT JOIN
	  product_stock pstk ON mp.product_id = pstk.product_id
	LEFT JOIN
	  production_segments pseg ON mp.id = pseg.mrp_production_id 
    LEFT JOIN
      product_family pf ON pt.family_id = pf.id
    LEFT JOIN
      product_group pg ON pt.group_id = pg.id
    LEFT JOIN
      product_line pl ON pt.line_id = pl.id
    LEFT JOIN
      product_type py ON pt.type_id = py.id
    LEFT JOIN
      uom_uom uu ON pt.uom_id = uu.id
    LEFT JOIN
      ir_property ip ON ip.res_id = 'product.template,' || pt.id::Text AND fields_id = 17662 AND ip.company_id = 1
    LEFT JOIN
      product_category_company_geb pcg ON pcg.id = SPLIT_PART(ip.value_reference, ',', 2)::Numeric
    GROUP BY
      mp.id, mp.name, mp.product_id, mp.product_qty, mp.state, mp.partner_id, 
      mp.procurement_location_id, sl.name, pp.default_code, pp.individual_name, pt.name, 
      pf.name, pl.name, pg.name, py.name, uu.name, pcg."Nombre",
      bc.component_data, pw.workorder_data, ps.sale_data, att.attributes_data, pstk.onhand_data, pseg.segment_data
    ORDER BY
      sl.name
  `;
};

/**
 * Process the query results into a JSON structure matching the required format
 * @param {Array} rows - The query results
 * @param {boolean} includeNoCommitmentOrders - Whether to include sales orders without commitment dates
 * @returns {Object} The formatted JSON object
 */
const formatProductionSchedule = async (rows, includeNoCommitmentOrders = false) => {
  const result = {};

  // Log filtering parameters
  console.log(`Formatting production data with includeNoCommitmentOrders: ${includeNoCommitmentOrders}`);

  for (const row of rows) {
    // Use location_name if available, otherwise fall back to default
    const warehouseName = row.location_name || 'Sin Almacén';
    
    // Use individual_name if available, otherwise use product_name
    const productName = row.individual_name || row.product_name;
    const productKey = `[${row.product_code}] ${productName}`;
    
    // Create warehouse if it doesn't exist
    if (!result[warehouseName]) {
      result[warehouseName] = {};
    }
    
    // Create product if it doesn't exist
    if (!result[warehouseName][productKey]) {
      // Parse BOM components
      const bomComponents = parseBomComponents(row);
      
      // Parse workorders
      const workorders = parseWorkorders(row);
      
      // Parse attributes
      const attributes = parseAttributes(row.attributes_data);
      
      // Parse stock data
      const stockData = parseStockData(row.onhand_data);
      
      // Calculate tiene_detalle and tiene_workorders
      const tiene_detalle = bomComponents.some(comp => comp.tiene_detalle);
      const tiene_workorders = workorders.length > 0;
      
      // Initialize product structure
      result[warehouseName][productKey] = {
        total_qty: Number(row.production_qty) || 0,
        familia: row.family_name || 'Sin Familia',
        grupo: row.group_name || 'Sin Grupo',
        linea: row.line_name || 'Sin Linea',
        tipo: row.type_name || 'Sin Tipo',
        categoria: row.category_name || 'Sin Categoria',
        uom: row.uom_name || 'Unit',
        state: row.state,
        tiene_detalle: tiene_detalle,
        tiene_workorders: tiene_workorders,
        MOs: [],
        bill_of_materials: bomComponents,
        atributos: attributes,
        stock: stockData
      };
      
      // Create MO entry
      const mo = {
        name: row.production_name,
        state: row.state,
        product_qty: Number(row.production_qty) || 0,
        workorders: workorders,
        segments: parseSegments(row.segment_data),
        pedidos: {}
      };
      
      // Process sales orders data
      if (row.sale_data && Array.isArray(row.sale_data)) {
        for (const saleOrder of row.sale_data) {
          // Each sale_data item represents one sale order
          const orderName = saleOrder.name;
          const solicitudDate = saleOrder.date_order ? new Date(saleOrder.date_order).toISOString().split('T')[0] : '';
          const compromisoDate = saleOrder.commitment_date ? new Date(saleOrder.commitment_date).toISOString() : '';
          const shipmentDate = saleOrder.shipment_date ? new Date(saleOrder.shipment_date).toISOString() : '';
          const dateValidator = saleOrder.date_validator ? new Date(saleOrder.date_validator).toISOString() : '';
          
          // Log if we find orders without commitment dates
          if (!compromisoDate) {
            console.log(`Found order without commitment date: ${orderName} - includeNoCommitmentOrders is ${includeNoCommitmentOrders}`);
          }
          
          // Skip orders without commitment dates if not including them
          if (!includeNoCommitmentOrders && !compromisoDate) {
            console.log(`Skipping order ${orderName} because it has no commitment date and includeNoCommitmentOrders is false`);
            continue;
          }
          
          // Calculate total quantity from order_lines
          let totalQty = 0;
          let pendingQty = 0;
          
          if (saleOrder.order_lines && Array.isArray(saleOrder.order_lines)) {
            for (const line of saleOrder.order_lines) {
              totalQty += Number(line.sol_qty) || 0;
              pendingQty += Number(line.sol_pending_qty) || 0;
            }
          }
          
          // Add sale order to MO's pedidos
          mo.pedidos[orderName] = {
            cantidad: totalQty,
            solicitud: solicitudDate,
            compromiso: compromisoDate,
            shipment_date: shipmentDate,
            date_validator: dateValidator,
            manufactura: saleOrder.manufacture || 'line',
            prioridad: mapOrderPriority(saleOrder.order_priority),
            partner: saleOrder.partner || '',
            pending_qty: pendingQty,
            sale_line_products: saleOrder.order_lines.map(line => ({
              sale_line_id: line.sale_line_id,
              product_id: line.sol_product_id,
              product_name: '[' + line.sol_product_code + '] ' + (line.sol_product_individual || line.sol_template_name),
              product_qty: Number(line.sol_qty) || 0,
              sale_order_name: orderName
            }))
          };
        }
      }
      
      // Add MO to product
      result[warehouseName][productKey].MOs.push(mo);
    } else {
      // If product exists, just add this production as another MO
      const workorders = parseWorkorders(row);
      
      // Create MO entry
      const mo = {
        name: row.production_name,
        state: row.state,
        product_qty: Number(row.production_qty) || 0,
        workorders: workorders,
        segments: parseSegments(row.segment_data),
        pedidos: {}
      };
      
      // Process sales orders data
      if (row.sale_data && Array.isArray(row.sale_data)) {
        for (const saleOrder of row.sale_data) {
          // Each sale_data item represents one sale order
          const orderName = saleOrder.name;
          const solicitudDate = saleOrder.date_order ? new Date(saleOrder.date_order).toISOString().split('T')[0] : '';
          const compromisoDate = saleOrder.commitment_date ? new Date(saleOrder.commitment_date).toISOString() : '';
          const shipmentDate = saleOrder.shipment_date ? new Date(saleOrder.shipment_date).toISOString() : '';
          const dateValidator = saleOrder.date_validator ? new Date(saleOrder.date_validator).toISOString() : '';
          
          // Log if we find orders without commitment dates
          if (!compromisoDate) {
            console.log(`Found order without commitment date: ${orderName} - includeNoCommitmentOrders is ${includeNoCommitmentOrders}`);
          }
          
          // Skip orders without commitment dates if not including them
          if (!includeNoCommitmentOrders && !compromisoDate) {
            console.log(`Skipping order ${orderName} because it has no commitment date and includeNoCommitmentOrders is false`);
            continue;
          }
          
          // Calculate total quantity from order_lines
          let totalQty = 0;
          let pendingQty = 0;
          
          if (saleOrder.order_lines && Array.isArray(saleOrder.order_lines)) {
            for (const line of saleOrder.order_lines) {
              totalQty += Number(line.sol_qty) || 0;
              pendingQty += Number(line.sol_pending_qty) || 0;
            }
          }
          
          // Add sale order to MO's pedidos
          mo.pedidos[orderName] = {
            cantidad: totalQty,
            solicitud: solicitudDate,
            compromiso: compromisoDate,
            shipment_date: shipmentDate,
            date_validator: dateValidator,
            manufactura: saleOrder.manufacture || 'line',
            prioridad: mapOrderPriority(saleOrder.order_priority),
            partner: saleOrder.partner || '',
            pending_qty: pendingQty,
            sale_line_products: saleOrder.order_lines.map(line => ({
              sale_line_id: line.sale_line_id,
              product_id: line.sol_product_id,
              product_name: '[' + line.sol_product_code + '] ' + (line.sol_product_individual || line.sol_template_name),
              product_qty: Number(line.sol_qty) || 0,
              sale_order_name: orderName
            }))
          };
        }
      }
      
      // Add MO to product
      result[warehouseName][productKey].MOs.push(mo);
      
      // Update total quantity
      result[warehouseName][productKey].total_qty += Number(row.production_qty) || 0;
    }
  }
  
  return result;
};

/**
 * Map priority codes to readable values
 * @param {String} priority - Priority code from database
 * @returns {String} - Human-readable priority level
 */
const mapOrderPriority = (priority) => {
  switch(priority) {
    case '0':
    case '1':
      return 'Alta';
    case '2':
      return 'Media';
    case '3':
      return 'Baja';
    default:
      return 'Normal';
  }
};


/**
 * Parse the attributes data from the new SQL query structure
 * @param {Array|Object|String} attributes - Attributes data from SQL
 * @returns {Object} - Object of format {attr1: value1, attr2: value2}
 */
const parseAttributes = (attributes) => {
  // If we have no attributes at all, return default
  if (!attributes) {
    return { "Atributo": "Sin Atributos" };
  }
  
  // Handle the new attributes_data array structure
  if (Array.isArray(attributes)) {
    const result = {};
    for (const attr of attributes) {
      if (attr && attr.attribute_name && attr.attribute_value) {
        result[attr.attribute_name] = attr.attribute_value;
      }
    }
    return Object.keys(result).length ? result : { "Atributo": "Sin Atributos" };
  }
  
  // If it's already an object (from json_object_agg), just return it
  if (typeof attributes === 'object' && !Array.isArray(attributes)) {
    return Object.keys(attributes).length ? attributes : { "Atributo": "Sin Atributos" };
  }
  
  // If it's a string (from the old STRING_AGG format), parse it
  if (typeof attributes === 'string') {
    const result = {};
    const pairs = attributes.split('|');
    
    for (const pair of pairs) {
      if (pair && pair.includes(':')) {
        const [key, value] = pair.split(':');
        result[key.trim()] = value.trim();
      }
    }
    
    return Object.keys(result).length ? result : { "Atributo": "Sin Atributos" };
  }
  
  // Default case
  return { "Atributo": "Sin Atributos" };
};


/**
 * Process BOM components data from SQL query
 * @param {Object} row - The query result row
 * @returns {Array} - Array of component objects
 */
const parseBomComponents = (row) => {
  // If no component data available
  if (!row.component_data) {
    return [];
  }

  let componentData;
  
  // Parse the JSON component data
  try {
    // If it's a string, parse it, otherwise assume it's already an object
    if (typeof row.component_data === 'string') {
      componentData = JSON.parse(row.component_data);
    } else {
      componentData = row.component_data;
    }
  } catch (error) {
    console.error('Error parsing component data:', error);
    return [];
  }
  
  // Return the array directly if it's already structured correctly
  if (Array.isArray(componentData)) {
    return componentData;
  }
  
  // Return empty array as fallback
  return [];
};

/**
 * Process workorder data from SQL query
 * @param {Object} row - The query result row
 * @returns {Array} - Array of workorder objects
 */
const parseWorkorders = (row) => {
  // If no workorder data available
  if (!row.workorder_data) {
    return [];
  }

  let workorderData;
  
  // Parse the JSON workorder data
  try {
    // If it's a string, parse it, otherwise assume it's already an object
    if (typeof row.workorder_data === 'string') {
      workorderData = JSON.parse(row.workorder_data);
    } else {
      workorderData = row.workorder_data;
    }
  } catch (error) {
    console.error('Error parsing workorder data:', error);
    return [];
  }
  
  // Return the array directly if it's already structured correctly
  if (Array.isArray(workorderData)) {
    return workorderData;
  }
  
  // Return empty array as fallback
  return [];
};

/**
 * Process stock data from SQL query
 * @param {Array|Object|String} stockData - Stock data from SQL
 * @returns {Object} - Object with location quantities
 */
const parseStockData = (stockData) => {
  // If no stock data available
  if (!stockData) {
    return { total: 0, locations: [] };
  }

  let parsedStockData;
  
  // Parse the JSON stock data
  try {
    // If it's a string, parse it, otherwise assume it's already an object
    if (typeof stockData === 'string') {
      parsedStockData = JSON.parse(stockData);
    } else {
      parsedStockData = stockData;
    }
  } catch (error) {
    console.error('Error parsing stock data:', error);
    return { total: 0, locations: [] };
  }
  
  // If it's an array of location quantities
  if (Array.isArray(parsedStockData)) {
    let total = 0;
    const locations = [];
    
    for (const item of parsedStockData) {
      if (item && typeof item === 'object') {
        const locationName = item.onhand_location || 'Unknown';
        const quantity = Number(item.onhand_quantity) || 0;
        
        locations.push({
          location: locationName,
          quantity: quantity
        });
        
        total += quantity;
      }
    }
    
    return {
      total: total,
      locations: locations
    };
  }
  
  // Return default structure if no valid data
  return { total: 0, locations: [] };
};

/**
 * Process segment data from SQL query
 * @param {Array|Object|String} segmentData - Segment data from SQL
 * @returns {Array} - Array of segment objects
 */
const parseSegments = (segmentData) => {
  // Handle missing or invalid segment data
  if (!segmentData) {
    return [];
  }
  
  // Handle string input (happens when data comes from REST API)
  if (typeof segmentData === 'string') {
    try {
      segmentData = JSON.parse(segmentData);
    } catch (e) {
      console.error('Error parsing segment data:', e);
      return [];
    }
  }
  
  // Ensure we're working with an array
  if (!Array.isArray(segmentData)) {
    segmentData = [segmentData];
  }
  
  // Process each segment entry
  return segmentData.map(segment => ({
    segment_id: segment.segment_id,
    name: segment.name,
    state: segment.state,
    folio: segment.folio,
    date: segment.date ? new Date(segment.date).toISOString() : '',
    express: segment.express,
    qty_segmented: Number(segment.qty_segmented) || 0
  }));
};

/**
 * Get a simpler query for testing performance issues
 * This query retrieves basic production data without all the complex joins
 */
const getSimpleProductionQuery = () => {
  return `
    SELECT
      mp.id AS production_id,
      mp.name AS production_name,
      mp.product_id,
      mp.product_qty as production_qty,
      mp.state,
      mp.partner_id,
      pp.default_code AS product_code,
      pt.name AS product_name,
      mp.date_planned_start,
      mp.date_planned_finished
    FROM
      mrp_production mp
    JOIN
      product_product pp ON mp.product_id = pp.id
    JOIN
      product_template pt ON pp.product_tmpl_id = pt.id
    WHERE
      mp.state NOT IN ('cancel', 'transfer', 'draft')
    ORDER BY
      mp.date_planned_start
    LIMIT 100
  `;
};

module.exports = {
  getProductionScheduleQuery,
  getSimpleProductionQuery,
  formatProductionSchedule,
  parseSegments
};
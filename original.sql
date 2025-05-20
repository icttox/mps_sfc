WITH bom_line_details AS (
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
            'color', pc.name,
            'caliber', cal.name_caliber
          )
        ) AS details
      FROM 
        mrp_bom_line_detail mbld
      LEFT JOIN 
        mrp_product_color pc ON mbld.color_id = pc.id
      LEFT JOIN 
        mrp_product_caliber cal ON mbld.caliber_id = cal.id
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
        mrp_bom mb
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
        mrp_workorder mwo
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
        mrp_production_sale_line_rel mpsl
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
            'expected_date', so.expected_date,
            'date_order', so.date_order,
            'order_priority', so.priority,
            'manufacture', so.manufacture,
            'partner', rp.name,
			'order_lines', COALESCE(psl.sale_line_data, '[]'::jsonb)
          ) ORDER BY so.commitment_date
        ) AS sale_data
      FROM 
        mrp_production_sale_rel mps
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
      GROUP BY 
        pavppr.product_product_id
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
	  att.attributes_data
    FROM 
      mrp_production mp
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
      ir_property ip ON ip.res_id = 'product.template,' || pt.id::Text AND fields_id = 17662
    LEFT JOIN
      product_category_company_geb pcg ON pcg.id = SPLIT_PART(ip.value_reference, ',', 2)::Numeric
    WHERE 
      mp.state NOT IN ('cancel', 'transfer', 'draft')
      AND mp.create_date >= '2023-12-01'
    GROUP BY
      mp.id, mp.name, mp.product_id, mp.product_qty, mp.state, mp.partner_id, 
      mp.procurement_location_id, sl.name, pp.default_code, pp.individual_name, pt.name, 
      pf.name, pl.name, pg.name, py.name, uu.name, pcg."Nombre",
      bc.component_data, pw.workorder_data, ps.sale_data, att.attributes_data
    ORDER BY
      sl.name
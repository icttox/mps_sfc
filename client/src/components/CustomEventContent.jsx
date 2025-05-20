import React from 'react';
import { useEffect } from 'react';
import moment from 'moment';

// This component creates tooltips for calendar events
const CustomEventContent = ({ event }) => {
  const { title, extendedProps } = event;
  const type = extendedProps.type || 'unknown';
  
  // Extract common properties with fallbacks
  const quantity = extendedProps.quantity || extendedProps.product_qty || 0;
  const uom = extendedProps.uom || 'Units';
  const familia = extendedProps.familia || '';
  const grupo = extendedProps.grupo || '';
  const categoria = extendedProps.categoria || '';
  const linea = extendedProps.linea || '';
  const tipo = extendedProps.tipo || '';
  
  // Generate display info
  let displayInfo = '';
  
  if (type === 'product') {
    displayInfo = 'Qty: ' + quantity + ' ' + uom;
  } else if (type === 'salesOrder') {
    displayInfo = (extendedProps.totalProducts || 0) + ' products - ' + (extendedProps.partner || 'Unknown');
    
    // Check if there are any products with MOs in this sales order
    const hasMoProducts = extendedProps.products && extendedProps.products.some(
      product => product.MOs && product.MOs.length > 0
    );
    
    if (hasMoProducts) {
      displayInfo += ' (with Manufacturing Orders)';
    }
  } else if (type === 'cut') {
    displayInfo = (extendedProps.totalCuts || 0) + ' cuts';
  } else if (type === 'workorder') {
    displayInfo = 'Work Order: ' + (extendedProps.name || title);
    
    if (extendedProps.state) {
      displayInfo += ' - Status: ' + extendedProps.state;
    }
    
    if (extendedProps.totalWorkorders) {
      displayInfo += ' - ' + extendedProps.totalWorkorders + ' operations';
    }
    
    if (extendedProps.totalMOs) {
      displayInfo += ' - ' + extendedProps.totalMOs + ' MOs';
    }
  } else {
    // Fallback for unknown types
    displayInfo = title;
  }
  
  // Generate a detailed tooltip with section toggles - without the title and buttons
  // which will be added as React components instead
  let html = '<div class="tooltip-content">';
  
  // Skip the basic info section in the HTML string, as we'll render it in React
  
  // Add attributes section if available
  if (extendedProps.atributos && Object.keys(extendedProps.atributos).length > 0 && extendedProps.atributos.Atributo !== 'Sin Atributos') {
    const attributesSectionId = 'attributes-' + Math.random().toString(36).substring(2, 10);
    
    html += '<div class="section-container" style="margin-bottom: 15px; border: 1px solid #d0e3ff; border-radius: 6px; overflow: hidden;">';
    html += '<div class="section-header" style="background-color: #e6f0ff; padding: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="return window.toggleSection(\'' + attributesSectionId + '\')">';
    html += '<div style="display: flex; align-items: center;">';
    html += '<span style="display: inline-block; background-color: #0056b3; color: white; font-size: 0.7em; padding: 2px 6px; border-radius: 3px; margin-right: 8px;">ATT</span>';
    html += '<span style="font-weight: 600; color: #0056b3;">Attributes</span>';
    html += '</div>';
    html += '<span class="section-icon section-icon-' + attributesSectionId + '" style="font-weight: bold; font-size: 0.8em; color: #0056b3;">▼</span>';
    html += '</div>';
    html += '<div class="section-content section-content-' + attributesSectionId + '" style="padding: 10px; border-top: 1px solid #d0e3ff;">';
    
    html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
    
    // Add each attribute
    Object.entries(extendedProps.atributos).forEach(([key, value]) => {
      if (key !== 'Atributo') {
        html += '<span style="background-color: #e9ecef; padding: 5px 10px; border-radius: 4px; font-size: 0.85em; border-left: 3px solid #007bff;">';
        html += '<strong style="color: #0056b3;">' + key + ':</strong> ' + value;
        html += '</span>';
      }
    });
    
    html += '</div>';
    html += '</div></div>';
  }
  
  // Add Products with Manufacturing Orders section for Sales Orders view
  if (type === 'salesOrder' && extendedProps.products && extendedProps.products.length > 0) {
    // Filter products that have MOs
    const productsWithMOs = extendedProps.products.filter(
      product => product.MOs && product.MOs.length > 0
    );
    
    if (productsWithMOs.length > 0) {
      const productsMOSectionId = 'products-with-mos-' + Math.random().toString(36).substring(2, 10);
      
      html += '<div class="section-container" style="margin-bottom: 15px; border: 1px solid #d0e3ff; border-radius: 6px; overflow: hidden;">';
      html += '<div class="section-header" style="background-color: #e6f0ff; padding: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="return window.toggleSection(\'' + productsMOSectionId + '\')">';
      html += '<div style="display: flex; align-items: center;">';
      html += '<span style="display: inline-block; background-color: #0056b3; color: white; font-size: 0.7em; padding: 2px 6px; border-radius: 3px; margin-right: 8px;">PDT+MO</span>';
      html += '<span style="font-weight: 600; color: #0056b3;">Products with Manufacturing Orders</span>';
      html += '</div>';
      html += '<span class="section-icon section-icon-' + productsMOSectionId + '" style="font-weight: bold; font-size: 0.8em; color: #0056b3;">►</span>';
      html += '</div>';
      html += '<div class="section-content section-content-' + productsMOSectionId + '" style="padding: 10px; border-top: 1px solid #d0e3ff;">';
      
      html += '<ul style="list-style-type: none; margin: 0; padding: 0;">';
      
      // Add each product with MO
      productsWithMOs.forEach(product => {
        const productSectionId = 'product-' + (product.id || Math.random().toString(36).substring(2, 10));
        
        html += '<li style="margin-bottom: 15px; border: 1px solid #e9ecef; border-radius: 4px; overflow: hidden;">';
        
        // Product header (toggleable)
        html += '<div class="section-header" style="background-color: #f8f9fa; padding: 8px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="return window.toggleSection(\'' + productSectionId + '\')">';
        html += '<div style="font-weight: 500; color: #0056b3;">';
        html += '<strong style="color: #0056b3;">' + (product.code || '') + '</strong> - ' + (product.name || 'Unnamed Product');
        html += '</div>';
        html += '<span class="section-icon section-icon-' + productSectionId + '" style="font-weight: bold; font-size: 0.8em; color: #0056b3;">►</span>';
        html += '</div>';
        
        // Product content
        html += '<div class="section-content section-content-' + productSectionId + '" style="padding: 8px 10px; border-top: 1px solid #e9ecef;">';
        
        // Product basic info
        html += '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">';
        html += '<span style="background-color: #e9ecef; padding: 3px 8px; border-radius: 4px; font-size: 0.85em;">';
        html += '<strong>Quantity:</strong> ' + (product.product_qty || '0') + ' ' + (product.product_uom || 'Units');
        html += '</span>';
        
        if (product.familia) {
          html += '<span style="background-color: #e9ecef; padding: 3px 8px; border-radius: 4px; font-size: 0.85em;">';
          html += '<strong>Family:</strong> ' + product.familia;
          html += '</span>';
        }
        
        if (product.grupo) {
          html += '<span style="background-color: #e9ecef; padding: 3px 8px; border-radius: 4px; font-size: 0.85em;">';
          html += '<strong>Group:</strong> ' + product.grupo;
          html += '</span>';
        }
        
        html += '</div>';
        
        // List MOs for this product
        if (product.MOs && product.MOs.length > 0) {
          const moListSectionId = 'mo-list-' + (product.id || Math.random().toString(36).substring(2, 10));
          
          html += '<div style="margin-top: 8px; border: 1px solid #d0e3ff; border-radius: 4px; overflow: hidden;">';
          html += '<div class="section-header" style="background-color: #e6f0ff; padding: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="return window.toggleSection(\'' + moListSectionId + '\')">';
          html += '<div style="display: flex; align-items: center;">';
          html += '<span style="display: inline-block; background-color: #0056b3; color: white; font-size: 0.7em; padding: 2px 6px; border-radius: 3px; margin-right: 8px;">MO</span>';
          html += '<span style="font-weight: 600; color: #0056b3;">Manufacturing Orders</span>';
          html += '</div>';
          html += '<span class="section-icon section-icon-' + moListSectionId + '" style="font-weight: bold; font-size: 0.8em; color: #0056b3;">►</span>';
          html += '</div>';
          html += '<div class="section-content section-content-' + moListSectionId + '" style="padding: 8px; border-top: 1px solid #d0e3ff;">';
          
          // Add each MO
          product.MOs.forEach(mo => {
            const moDetailId = 'mo-detail-' + (mo.name || 'unknown') + '-' + Math.random().toString(36).substring(2, 10);
            
            html += '<div style="border: 1px solid #d0e3ff; border-radius: 4px; overflow: hidden; margin-bottom: 10px;">';
            
            // MO header (toggleable)
            html += '<div class="section-header" style="background-color: #f0f8ff; padding: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="return window.toggleSection(\'' + moDetailId + '\')">';
            html += '<div style="display: flex; align-items: center;">';
            html += '<span style="display: inline-block; background-color: #0056b3; color: white; font-size: 0.75em; padding: 2px 6px; border-radius: 3px; margin-right: 8px;">MO</span>';
            html += '<span style="font-weight: 600; color: #0056b3;">' + (mo.name || 'Unknown') + '</span>';
            html += '</div>';
            html += '<span class="section-icon section-icon-' + moDetailId + '" style="font-weight: bold; font-size: 0.8em; color: #0056b3;">►</span>';
            html += '</div>';
            
            // MO details section (toggleable content)
            html += '<div class="section-content section-content-' + moDetailId + '" style="padding: 8px; background-color: #f8fbff;">';
            
            // Basic MO info
            html += '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">';
            html += '<span style="background-color: #e9ecef; padding: 3px 8px; border-radius: 4px; font-size: 0.85em;">';
            html += '<strong>Status:</strong> ' + (mo.state || 'Unknown');
            html += '</span>';
            html += '<span style="background-color: #e9ecef; padding: 3px 8px; border-radius: 4px; font-size: 0.85em;">';
            html += '<strong>Quantity:</strong> ' + (mo.product_qty || '0') + ' ' + (mo.product_uom || 'Units');
            html += '</span>';
            
            if (mo.date_planned_start) {
              html += '<span style="background-color: #e9ecef; padding: 3px 8px; border-radius: 4px; font-size: 0.85em;">';
              html += '<strong>Start Date:</strong> ' + moment.utc(mo.date_planned_start).format('YYYY-MM-DD');
              html += '</span>';
            }
            
            if (mo.date_planned_finished) {
              html += '<span style="background-color: #e9ecef; padding: 3px 8px; border-radius: 4px; font-size: 0.85em;">';
              html += '<strong>End Date:</strong> ' + moment.utc(mo.date_planned_finished).format('YYYY-MM-DD');
              html += '</span>';
            }
            
            html += '</div>';
            
            // Add work orders section if available
            if (mo.workorders && mo.workorders.length > 0) {
              const workordersSectionId = 'workorders-' + (mo.name || 'unknown') + '-' + Math.random().toString(36).substring(2, 10);
              
              html += '<div style="margin-top: 8px; border: 1px solid #d0e3ff; border-radius: 4px; overflow: hidden;">';
              html += '<div class="section-header" style="background-color: #e6f0ff; padding: 6px 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="return window.toggleSection(\'' + workordersSectionId + '\')">';
              html += '<div style="display: flex; align-items: center;">';
              html += '<span style="display: inline-block; background-color: #0056b3; color: white; font-size: 0.7em; padding: 2px 6px; border-radius: 3px; margin-right: 8px;">WO</span>';
              html += '<span style="font-weight: 600; color: #0056b3;">Work Orders</span>';
              html += '</div>';
              html += '<span class="section-icon section-icon-' + workordersSectionId + '" style="font-weight: bold; font-size: 0.8em; color: #0056b3;">►</span>';
              html += '</div>';
              html += '<div class="section-content section-content-' + workordersSectionId + '" style="padding: 6px 8px; border-top: 1px solid #d0e3ff;">';
              
              // Add each work order
              mo.workorders.forEach(wo => {
                html += '<div style="background-color: #e9ecef; padding: 5px 8px; border-radius: 4px; font-size: 0.85em; border-left: 3px solid #007bff; margin-bottom: 6px; width: 100%;">';
                html += '<div style="font-weight: 500; color: #0056b3;">' + (wo.name || 'Unnamed Work Order') + '</div>';
                html += '<div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px;">';
                
                if (wo.state) {
                  html += '<span style="background-color: #f8fbff; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">';
                  html += '<strong>Status:</strong> ' + wo.state;
                  html += '</span>';
                }
                
                if (wo.date_planned) {
                  html += '<span style="background-color: #f8fbff; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">';
                  html += '<strong>Planned:</strong> ' + moment.utc(wo.date_planned).format('YYYY-MM-DD');
                  html += '</span>';
                }
                
                if (wo.qty) {
                  html += '<span style="background-color: #f8fbff; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">';
                  html += '<strong>Qty:</strong> ' + wo.qty;
                  html += '</span>';
                }
                
                if (wo.workcenter) {
                  html += '<span style="background-color: #f8fbff; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">';
                  html += '<strong>Work Center:</strong> ' + wo.workcenter;
                  html += '</span>';
                }
                
                html += '</div></div>';
              });
              
              html += '</div></div>';
            }
            
            // Display a segment section with the second segment if available, otherwise show the first
            if (mo.segments && mo.segments.length > 0) {
              // Create unique section ID
              const segmentsSectionId = 'segments-' + (mo.name || 'unknown') + '-' + Math.random().toString(36).substring(2, 10);
              
              html += '<div style="margin-top: 8px; border: 1px solid #d0e3ff; border-radius: 4px; overflow: hidden;">';
              html += '<div class="section-header" style="background-color: #e6f0ff; padding: 6px 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="return window.toggleSection(\'' + segmentsSectionId + '\')">';
              html += '<div style="display: flex; align-items: center;">';
              html += '<span style="display: inline-block; background-color: #0056b3; color: white; font-size: 0.7em; padding: 2px 6px; border-radius: 3px; margin-right: 8px;">SEG</span>';
              html += '<span style="font-weight: 600; color: #0056b3;">Segments</span>';
              html += '</div>';
              html += '<span class="section-icon section-icon-' + segmentsSectionId + '" style="font-weight: bold; font-size: 0.8em; color: #0056b3;">►</span>';
              html += '</div>';
              html += '<div class="section-content section-content-' + segmentsSectionId + '" style="padding: 6px 8px; border-top: 1px solid #d0e3ff;">';
              
              // Use the second segment if available, otherwise use the first segment
              const segment = mo.segments.length > 1 ? mo.segments[1] : mo.segments[0];
              
              html += '<div style="background-color: #e9ecef; padding: 5px 8px; border-radius: 4px; font-size: 0.85em; border-left: 3px solid #007bff; margin-bottom: 6px; width: 100%;">';
              html += '<div style="font-weight: 500; color: #0056b3;">' + (segment.name || 'Unnamed Segment') + '</div>';
              html += '<div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px;">';
              
              if (segment.state) {
                html += '<span style="background-color: #f8fbff; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">';
                html += '<strong>Status:</strong> ' + segment.state;
                html += '</span>';
              }
              
              if (segment.folio) {
                html += '<span style="background-color: #f8fbff; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">';
                html += '<strong>Folio:</strong> ' + segment.folio;
                html += '</span>';
              }
              
              if (segment.date) {
                html += '<span style="background-color: #f8fbff; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">';
                html += '<strong>Date:</strong> ' + moment.utc(segment.date).format('YYYY-MM-DD');
                html += '</span>';
              }
              
              if (segment.qty_segmented) {
                html += '<span style="background-color: #f8fbff; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">';
                html += '<strong>Qty:</strong> ' + segment.qty_segmented;
                html += '</span>';
              }
              
              if (segment.express) {
                html += '<span style="background-color: #ffedee; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; color: #dc3545;">';
                html += '<strong>Express</strong>';
                html += '</span>';
              }
              
              html += '</div></div>';
              
              html += '</div></div>';
            }
            
            html += '</div></div>';
          });
          
          html += '</div></div>';
        }
        
        html += '</div></li>';
      });
      
      html += '</ul></div></div>';
    }
  }
  
  // The rest of your HTML generation code...
  // Add Manufacturing Orders section if available
  // Add BOM section if available
  // Add other sections as needed
  
  // Close tooltip content
  html += '</div>';
  
  // Add toggle script to document head
  useEffect(() => {
    // Check if we already added our script
    if (!window.tooltipSectionsScriptAdded) {
      // If there's an existing script, remove it to avoid duplicates
      const existingScript = document.getElementById('tooltip-sections-script');
      if (existingScript) {
        existingScript.remove();
      }
      
      const toggleScript = document.createElement('script');
      toggleScript.id = 'tooltip-sections-script';
      toggleScript.textContent = `
        // Simple toggle function for sections with better compatibility
        window.toggleSection = function(sectionId) {
          console.log("Toggle section called with ID:", sectionId);
          
          try {
            // Don't try to use CSS selector escaping - use data-section-id instead
            // This avoids all issues with special characters in IDs
            
            // For consistency, look for both the element and its icon 
            let content = null;
            let icon = null;
            
            // Find all elements and manually check for matching data-section-id
            const allSections = document.querySelectorAll('.section-content');
            for (let i = 0; i < allSections.length; i++) {
              const sectionIdAttr = allSections[i].getAttribute('data-section-id');
              const classNames = allSections[i].className.split(' ');
              
              // Check either the data attribute or if one of the classes contains the ID
              if (sectionIdAttr === sectionId || 
                  classNames.some(cls => cls === 'section-content-' + sectionId)) {
                content = allSections[i];
                break;
              }
            }
            
            // Find icon in the same way
            const allIcons = document.querySelectorAll('.section-icon');
            for (let i = 0; i < allIcons.length; i++) {
              const iconIdAttr = allIcons[i].getAttribute('data-section-id');
              const classNames = allIcons[i].className.split(' ');
              
              // Check either the data attribute or if one of the classes contains the ID
              if (iconIdAttr === sectionId || 
                  classNames.some(cls => cls === 'section-icon-' + sectionId)) {
                icon = allIcons[i];
                break;
              }
            }
            
            // If content section found, toggle it
            if (content) {
              console.log("Found content element for section:", sectionId);
              const currentDisplay = window.getComputedStyle(content).display;
              const newDisplay = currentDisplay === 'none' ? 'block' : 'none';
              content.style.display = newDisplay;
              console.log("Set display to:", newDisplay);
              
              if (icon) {
                icon.textContent = newDisplay === 'none' ? '►' : '▼';
                console.log("Updated icon");
              }
            } else {
              console.warn("Could not find content element for section:", sectionId);
            }
          } catch (error) {
            console.error("Error in toggleSection:", error);
          }
          
          // Always prevent default and stop propagation
          if (event) {
            event.preventDefault();
            event.stopPropagation();
          }
          return false;
        };
        
        // Add initialization function for the tooltips
        window.initializeSections = function() {
          console.log("Initializing tooltip sections");
          
          // Determine the active tooltip - we need to find the one currently showing
          // Look for the actively shown tooltip in the DOM (element with the react-tooltip class and not hidden)
          const activeTooltips = document.querySelectorAll('.react-tooltip[data-show="true"]');
          console.log("Found " + activeTooltips.length + " active tooltips");
          
          // For each active tooltip, initialize its sections
          activeTooltips.forEach(tooltip => {
            // 1. Set proper data attributes on section elements in this tooltip
            tooltip.querySelectorAll('.section-content').forEach(el => {
              const classNames = el.className.split(' ');
              classNames.forEach(className => {
                if (className.startsWith('section-content-')) {
                  const sectionId = className.replace('section-content-', '');
                  el.setAttribute('data-section-id', sectionId);
                  
                  // Make all sections collapsed by default
                  el.style.display = 'none';
                }
              });
            });
            
            // 2. Do the same for all icon elements
            tooltip.querySelectorAll('.section-icon').forEach(el => {
              const classNames = el.className.split(' ');
              classNames.forEach(className => {
                if (className.startsWith('section-icon-')) {
                  const sectionId = className.replace('section-icon-', '');
                  el.setAttribute('data-section-id', sectionId);
                  
                  // Set arrow to collapsed state
                  el.textContent = '►';
                }
              });
            });
            
            console.log("Sections initialized for tooltip: " + (tooltip.id || 'unnamed'));
          });
          
          // If no active tooltips found, fall back to document-wide initialization
          if (activeTooltips.length === 0) {
            console.log("No active tooltips found, falling back to document-wide initialization");
            
            // 1. Set proper data attributes on all section elements for easier selection
            document.querySelectorAll('.section-content').forEach(el => {
              const classNames = el.className.split(' ');
              classNames.forEach(className => {
                if (className.startsWith('section-content-')) {
                  const sectionId = className.replace('section-content-', '');
                  el.setAttribute('data-section-id', sectionId);
                  
                  // Make all sections collapsed by default
                  el.style.display = 'none';
                }
              });
            });
            
            // 2. Do the same for all icon elements
            document.querySelectorAll('.section-icon').forEach(el => {
              const classNames = el.className.split(' ');
              classNames.forEach(className => {
                if (className.startsWith('section-icon-')) {
                  const sectionId = className.replace('section-icon-', '');
                  el.setAttribute('data-section-id', sectionId);
                  
                  // Set arrow to collapsed state
                  el.textContent = '►';
                }
              });
            });
          }
          
          console.log("Tooltip sections initialization complete");
        };
        
        // Helper functions to expand/collapse all sections
        window.expandAllSections = function() {
          document.querySelectorAll('.section-content').forEach(el => {
            el.style.display = 'block';
          });
          document.querySelectorAll('.section-icon').forEach(el => {
            el.textContent = '▼';
          });
        };
        
        window.collapseAllSections = function() {
          document.querySelectorAll('.section-content').forEach(el => {
            el.style.display = 'none';
          });
          document.querySelectorAll('.section-icon').forEach(el => {
            el.textContent = '►';
          });
        };
      `;
      document.head.appendChild(toggleScript);
      
      // Mark that we've added the script
      window.tooltipSectionsScriptAdded = true;
    }
  }, []);
  
  // Initialize tooltip sections after component mounts
  useEffect(() => {
    // Call initializeSections on the next tick after rendering
    const timer = setTimeout(() => {
      if (window.initializeSections) {
        window.initializeSections();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Remove any embedded scripts to avoid security issues
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Create markup for React's dangerouslySetInnerHTML
  const createMarkup = () => ({ __html: html });
  
  return (
    <div className="tooltip-content" style={{ maxWidth: '100%', padding: '15px 20px' }}>
      {/* Title is now shown in the modal header, so we can hide it here */}
      <div style={{ marginBottom: '8px', display: 'none' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2em', color: '#2B547E' }}>{title}</h3>
      </div>
      
      {/* Comprehensive basic info section */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {/* Common properties for all types */}
          <span style={{ 
            backgroundColor: '#e9ecef', 
            padding: '5px 10px', 
            borderRadius: '4px', 
            fontSize: '0.85em', 
            borderLeft: '3px solid #007bff'
          }}>
            <strong style={{ color: '#0056b3' }}>Type:</strong> {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
          
          {/* Product type specific properties */}
          {(type === 'product' || quantity > 0) && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Quantity:</strong> {quantity} {uom}
            </span>
          )}
          
          {/* Sales order specific properties */}
          {type === 'salesOrder' && extendedProps.partner && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Customer:</strong> {extendedProps.partner}
            </span>
          )}
          
          {type === 'salesOrder' && extendedProps.totalProducts && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Products:</strong> {extendedProps.totalProducts}
            </span>
          )}
          
          {type === 'salesOrder' && extendedProps.prioridad && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Priority:</strong> {extendedProps.prioridad}
            </span>
          )}
          
          {/* Cut specific properties */}
          {type === 'cut' && extendedProps.totalCuts && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Total Cuts:</strong> {extendedProps.totalCuts}
            </span>
          )}
          
          {/* Show a special indicator for BOM-originated cuts */}
          {type === 'cut' && extendedProps.isBomCut && (
            <span style={{ 
              backgroundColor: '#e3f2fd', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #1565c0'
            }}>
              <strong style={{ color: '#1565c0' }}>MO Component</strong>
              {extendedProps.sourceComponent && ` of ${extendedProps.sourceComponent}`}
            </span>
          )}
          
          {type === 'cut' && extendedProps.totalProducts && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Products:</strong> {extendedProps.totalProducts}
            </span>
          )}
          
          {/* Product classification properties (for all types) */}
          {familia && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Family:</strong> {familia}
            </span>
          )}
          
          {grupo && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Group:</strong> {grupo}
            </span>
          )}
          
          {linea && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Line:</strong> {linea}
            </span>
          )}
          
          {categoria && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Category:</strong> {categoria}
            </span>
          )}
          
          {tipo && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Type:</strong> {tipo}
            </span>
          )}
          
          {/* Cut specific common properties */}
          {type === 'cut' && extendedProps.commonProps && extendedProps.commonProps.width && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Width:</strong> {extendedProps.commonProps.width}
            </span>
          )}
          
          {type === 'cut' && extendedProps.commonProps && extendedProps.commonProps.length && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Length:</strong> {extendedProps.commonProps.length}
            </span>
          )}
          
          {type === 'cut' && extendedProps.commonProps && extendedProps.commonProps.thickness && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Thickness:</strong> {extendedProps.commonProps.thickness}
            </span>
          )}
          
          {type === 'cut' && extendedProps.commonProps && extendedProps.commonProps.caliber && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Caliber:</strong> {extendedProps.commonProps.caliber}
            </span>
          )}
          
          {type === 'cut' && extendedProps.commonProps && extendedProps.commonProps.color && extendedProps.commonProps.color !== 'Sin definir' && (
            <span style={{ 
              backgroundColor: '#e9ecef', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              fontSize: '0.85em', 
              borderLeft: '3px solid #007bff'
            }}>
              <strong style={{ color: '#0056b3' }}>Color:</strong> {extendedProps.commonProps.color}
            </span>
          )}
        </div>
      </div>
      
      {/* Compact controls for expand/collapse */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '10px',
        backgroundColor: '#f8f9fa',
        padding: '4px 6px',
        borderRadius: '4px',
        border: '1px solid #e2e6ea'
      }}>
        <button 
          style={{ 
            backgroundColor: '#e7f1ff', 
            color: '#0056b3',
            border: '1px solid #b8daff', 
            borderRadius: '3px', 
            padding: '3px 8px', 
            fontSize: '0.7em', 
            fontWeight: 'bold',
            cursor: 'pointer',
            margin: '0 3px',
            transition: 'all 0.2s ease'
          }}
          onClick={() => {
            if (window.expandAllSections) {
              window.expandAllSections();
            }
          }}
        >
          Expand All
        </button>
        <button 
          style={{ 
            backgroundColor: '#f8f9fa', 
            color: '#6c757d',
            border: '1px solid #dae0e5', 
            borderRadius: '3px', 
            padding: '3px 8px', 
            fontSize: '0.7em', 
            fontWeight: 'bold',
            cursor: 'pointer',
            margin: '0 3px',
            transition: 'all 0.2s ease'
          }}
          onClick={() => {
            if (window.collapseAllSections) {
              window.collapseAllSections();
            }
          }}
        >
          Collapse All
        </button>
      </div>
      
      {/* Render the rest of the content from the HTML string */}
      <div dangerouslySetInnerHTML={createMarkup()} 
        style={{ 
          fontSize: '0.9em',
          lineHeight: '1.4'
        }} 
      />
      
      {/* For normal display in calendar (hidden) */}
      <div style={{ display: 'none' }}>
        <div className="event-title">{title}</div>
        <div className="event-info">{displayInfo}</div>
      </div>
    </div>
  );
};

export default CustomEventContent;
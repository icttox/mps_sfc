import React, { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import allLocales from '@fullcalendar/core/locales-all';
import moment from 'moment';
import 'moment/locale/es';  // Import Spanish locale for moment
import ResourceFilter from './ResourceFilter';
import { useTranslation } from 'react-i18next';

// Set moment to use Spanish locale
moment.locale('es');

// Import CustomEventContent component for the modal
import CustomEventContent from './CustomEventContent';

// Create a custom event content renderer
const renderEventContent = (eventInfo, t) => {
  const { event } = eventInfo;
  const { title, extendedProps } = event;
  const { type } = extendedProps;
  
  // Generate display info for calendar square
  let displayInfo = '';
  
  if (type === 'product') {
    const { quantity, uom } = extendedProps;
    
    // Extract product code from title
    let productCode = '';
    let productName = title;
    const codeMatch = title.match(/^\[(.*?)\]\s*(.*)/);
    if (codeMatch) {
      productCode = codeMatch[1];
      productName = codeMatch[2];
    }
    
    // Show code, name, and quantity with translations
    const detailsButton = `<button 
      class="product-details-btn" 
      onclick="window.showProductDetails(event, '${event.id}')" 
      style="margin-top: 4px; padding: 2px 6px; font-size: 0.7em; background-color: #0056b3; color: white; border: none; border-radius: 3px; cursor: pointer;"
    >
      ${t('calendar.viewDetails')}
    </button>`;
    
    displayInfo = productCode ? 
      `${t('calendar.events.product.code')}: ${productCode}<br>${t('calendar.events.product.name')}: ${productName}<br>${quantity || 0} ${uom || t('calendar.events.product.uom')}<br>${detailsButton}` : 
      `${title}<br>${quantity || 0} ${uom || t('calendar.events.product.uom')}<br>${detailsButton}`;
  } 
  else if (type === 'salesOrder') {
    const { orderNumber, partner } = extendedProps;
    displayInfo = `${t('calendar.events.salesOrder.number')}: ${orderNumber}<br>${t('calendar.events.salesOrder.partner')}: ${partner}`;
  }
  else if (type === 'cut') {
    const { cutKey, commonProps } = extendedProps;
    
    let displayText = `${t('calendar.events.cut.key')}: ${cutKey}`;
    
    if (commonProps && commonProps.caliber) {
      displayText += `<br>${t('calendar.events.cut.caliber')}: ${commonProps.caliber}`;
    }
    
    displayInfo = displayText;
  }
  else if (type === 'workorder') {
    let displayText = title;
    
    if (extendedProps.state) {
      displayText += `<br>${t('calendar.events.workorder.state')}: ${extendedProps.state}`;
    }
    
    if (extendedProps.primaryWorkcenter) {
      displayText += `<br>${t('calendar.events.workorder.workcenter')}: ${extendedProps.primaryWorkcenter}`;
    }
    
    if (extendedProps.totalQuantity) {
      displayText += `<br>${t('calendar.events.workorder.quantity')}: ${extendedProps.totalQuantity}`;
    }
    
    displayInfo = displayText;
  }
  
  // Create a simple ID for this event for modal reference
  const eventId = `event-${event.id || Math.random().toString(36).substring(2)}`;
  
  // Return a simple div with the display info and click handler for the modal
  return {
    html: `<div class="custom-event-content">
      <div 
        class="event-title clickable-event" 
        style="font-size: 0.85em; line-height: 1.3; white-space: normal; overflow: visible; text-overflow: clip; word-wrap: break-word; font-weight: 500; cursor: pointer;"
        data-event-id="${eventId}"
        data-event-type="${type}"
        onclick="window.handleEventClick(this)"
      >${displayInfo}</div>
    </div>`
  };
};

// Add global handlers
// Toggle component details handler
window.toggleComponentDetails = (componentId) => {
  // For static interfaces, just toggle the display of any matching detail elements
  const detailsElement = document.querySelector(`.details-${componentId}`);
  if (detailsElement) {
    const currentDisplay = detailsElement.style.display;
    detailsElement.style.display = currentDisplay === 'none' ? 'block' : 'none';
  }
};

// Product details button handler
window.showProductDetails = (event, eventId) => {
  // Stop event propagation to prevent calendar event click
  event.stopPropagation();
  event.preventDefault();
  
  // Find the event in the calendar
  const numericId = eventId.replace('event-', '');
  
  // Create a custom event to show product details modal
  const customEvent = new CustomEvent('showProductDetailsModal', {
    detail: {
      eventId: numericId
    }
  });
  document.dispatchEvent(customEvent);
  
  return false;
};

// Event click handler for modal
window.handleEventClick = (element) => {
  const eventId = element.getAttribute('data-event-id');
  const eventType = element.getAttribute('data-event-type');
  
  if (eventId && eventType) {
    // Find the event in the global filteredEvents array
    // Commented out unused variable
    // const numericId = eventId.replace('event-', '');
    
    // Dispatch a custom event that React can listen to
    const event = new CustomEvent('showEventModal', {
      detail: {
        eventId,
        eventType
      }
    });
    document.dispatchEvent(event);
  }
  
  // Force the tooltip to stay open
  const tooltips = document.querySelectorAll('[data-tooltip-id="calendar-tooltip"]');
  if (tooltips.length > 0) {
    // Move focus back to the element to keep tooltip open
    tooltips[0].focus();
  }
  
  return false;
};

// The section toggling is now handled directly in the HTML via window.toggleSection

const ProductionCalendar = ({ productionData }) => {
  const { t } = useTranslation();
  const [allResources, setAllResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const calendarRef = useRef(null);
  const [viewMode, setViewMode] = useState('products'); // 'products', 'salesOrders', 'cuts', or 'workorders'
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('product');
  
  // Modal state variables
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [selectedProductEvent, setSelectedProductEvent] = useState(null);

  // Effect to listen for custom event for regular modal opening
  useEffect(() => {
    const handleModalEvent = (e) => {
      const { eventId } = e.detail; // eventType not used
      
      // Find the event in the filteredEvents array
      // Commented out unused variable
      // const numericId = eventId.replace('event-', '');
      
      const targetEvent = filteredEvents.find(e => {
        // Check for exact string match
        if (`event-${e.id}` === eventId) return true;
        
        // Check for numeric match (using the extracted ID)
        const extractedId = eventId.replace('event-', '');
        if (e.id === parseInt(extractedId, 10)) return true;
        
        // Check if the event ID is contained in the eventId (for random IDs)
        if (typeof e.id === 'string' && eventId.includes(e.id)) return true;
        
        return false;
      });
      
      if (targetEvent) {
        setSelectedEvent(targetEvent);
        setShowModal(true);
      } else {
        console.warn(`Could not find event with ID ${eventId} for modal`);
      }
    };
    
    // Add event listener
    document.addEventListener('showEventModal', handleModalEvent);
    
    // Clean up
    return () => {
      document.removeEventListener('showEventModal', handleModalEvent);
    };
  }, [filteredEvents]);
  
  // Effect to listen for product details button click
  useEffect(() => {
    const handleProductDetailsEvent = (e) => {
      const { eventId } = e.detail;
      
      // Find the product event in the filteredEvents array
      const targetEvent = filteredEvents.find(e => {
        // Check for exact match
        if (e.id === eventId) return true;
        
        // Check for numeric match
        if (e.id === parseInt(eventId, 10)) return true;
        
        return false;
      });
      
      if (targetEvent && targetEvent.extendedProps.type === 'product') {
        console.log("Found product event for details modal:", targetEvent);
        setSelectedProductEvent(targetEvent);
        setShowProductDetailsModal(true);
      } else {
        console.warn(`Could not find product event with ID ${eventId} for details modal`);
      }
    };
    
    // Add event listener
    document.addEventListener('showProductDetailsModal', handleProductDetailsEvent);
    
    // Clean up
    return () => {
      document.removeEventListener('showProductDetailsModal', handleProductDetailsEvent);
    };
  }, [filteredEvents]);
  
  useEffect(() => {
    console.log("ProductionData changed - processing new data");
    
    if (!productionData) {
      console.log("No production data provided");
      setAllResources([]); // Initialize with empty array to avoid undefined
      setFilteredResources([]);
      return;
    }

    // Check if productionData is an empty object
    if (Object.keys(productionData).length === 0) {
      console.log("Production data is empty");
      setAllResources([]); // Initialize with empty array to avoid undefined
      setFilteredResources([]);
      return;
    }
    
    // Add DEBUG log to dump some sample data to console
    console.log("🔍 DEBUG: Examining productionData structure");
    // Get list of workstations
    const workstations = Object.keys(productionData);
    if (workstations.length > 0) {
      const sampleWorkstation = workstations[0];
      const products = Object.keys(productionData[sampleWorkstation]);
      
      if (products.length > 0) {
        const sampleProduct = products[0];
        const productData = productionData[sampleWorkstation][sampleProduct];
        
        console.log(`Sample product: ${sampleProduct} in workstation: ${sampleWorkstation}`);
        console.log("Product fields:", Object.keys(productData));
        
        // Check for BOM data
        if (productData.bill_of_materials || productData.billOfMaterials) {
          const bomData = productData.bill_of_materials || productData.billOfMaterials;
          console.log("🔍 BOM data found!", {
            bomLength: bomData.length,
            sampleComponent: bomData.length > 0 ? {
              productName: bomData[0].product_name,
              hasDetails: !!(bomData[0].details && bomData[0].details.length > 0),
              detailsLength: bomData[0].details ? bomData[0].details.length : 0
            } : null
          });
          
          // Check for components with details
          const componentsWithDetails = bomData.filter(comp => 
            comp.details && comp.details.length > 0
          );
          console.log(`🔍 Found ${componentsWithDetails.length} components with details out of ${bomData.length} total components`);
          
          if (componentsWithDetails.length > 0) {
            const sampleDetail = componentsWithDetails[0].details[0];
            console.log("🔍 Sample detail fields:", Object.keys(sampleDetail));
            console.log("🔍 Sample detail name:", sampleDetail.name);
          }
        } else {
          console.log("🔍 No BOM data found in sample product");
        }
        
        // Check for cut details
        if (productData.tiene_detalle && productData.detalle_corte) {
          console.log("🔍 Cut details found!");
          const cutNames = Object.keys(productData.detalle_corte);
          console.log(`🔍 Found ${cutNames.length} cut details`);
          
          if (cutNames.length > 0) {
            const sampleCutName = cutNames[0];
            const sampleCut = productData.detalle_corte[sampleCutName];
            console.log("🔍 Sample cut fields:", Object.keys(sampleCut));
            console.log("🔍 Sample cut name:", sampleCutName);
            console.log("🔍 Does cut have name property?", Object.prototype.hasOwnProperty.call(sampleCut, 'name'));
            if (sampleCut.name) {
              console.log("🔍 Cut name value:", sampleCut.name);
            }
          }
        } else {
          console.log("🔍 No cut details found in sample product");
        }
      }
    }

    // Debug: Check if we have valid data
    const sampleWorkstation = Object.keys(productionData)[0];
    if (!sampleWorkstation || !productionData[sampleWorkstation]) {
      console.log("Invalid workstation data");
      return;
    }
    
    if (Object.keys(productionData[sampleWorkstation]).length === 0) {
      console.log("Workstation has no products");
      return;
    }
    
    const sampleProduct = Object.keys(productionData[sampleWorkstation])[0];
    if (!sampleProduct) {
      console.log("No sample product found");
      return;
    }
    
    console.log(`Processing ${Object.keys(productionData).length} workstations in '${viewMode}' view mode`);
    
    // const productDetails = productionData[sampleWorkstation][sampleProduct]; // Unused variable

    // Extract workstations as resources
    const workstationResources = Object.keys(productionData).map((workstation) => ({
      id: workstation,
      title: workstation,
    }));
    
    setAllResources(workstationResources);
    setFilteredResources(workstationResources);
    
    let calendarEvents = [];
    let eventId = 1;
    
    if (viewMode === 'products') {
      // Extract products as events
      Object.entries(productionData).forEach(([workstation, products]) => {
        Object.entries(products).forEach(([product, details]) => {
          // For each product, use the earliest sales order date as the start date
          let earliestDate = null;
          let salesOrders = [];
          
          // Check for MOs array and gather sales orders from all MOs
          if (details.MOs && Array.isArray(details.MOs)) {
            // Deduplicate MOs first - some MOs are duplicated in the data
            const uniqueMOs = [];
            details.MOs.forEach(mo => {
              if (!uniqueMOs.some(existingMo => existingMo.name === mo.name)) {
                uniqueMOs.push(mo);
              }
            });
            
            // Process each unique MO
            uniqueMOs.forEach(mo => {
              if (mo.pedidos) {
                Object.entries(mo.pedidos).forEach(([orderNumber, orderDetails]) => {
                  const orderDate = moment(orderDetails.compromiso || orderDetails.solicitud);
                  salesOrders.push({
                    orderNumber,
                    ...orderDetails
                  });
                  
                  if (!earliestDate || orderDate.isBefore(earliestDate)) {
                    earliestDate = orderDate;
                  }
                });
              }
            });
          }
          // For backward compatibility, also check if pedidos exists at the product level
          else if (details.pedidos) {
            Object.entries(details.pedidos).forEach(([orderNumber, orderDetails]) => {
              const orderDate = moment(orderDetails.compromiso || orderDetails.solicitud);
              salesOrders.push({
                orderNumber,
                ...orderDetails
              });
              
              if (!earliestDate || orderDate.isBefore(earliestDate)) {
                earliestDate = orderDate;
              }
            });
          }
          
          // If no dates found or date is in the past, use today as fallback
          if (!earliestDate || earliestDate.isBefore(moment(), 'day')) {
            earliestDate = moment();
          }
          
          calendarEvents.push({
            id: eventId++,
            resourceId: workstation,
            title: product,
            start: earliestDate.format('YYYY-MM-DD'),
            end: moment(earliestDate).add(1, 'days').format('YYYY-MM-DD'),
            display: 'block', // Use block display to fix day/week views
            extendedProps: {
              type: 'product',
              salesOrders,
              quantity: details.total_qty,
              familia: details.familia,
              grupo: details.grupo,
              linea: details.linea,
              tipo: details.tipo,
              categoria: details.categoria,
              uom: details.uom,
              tieneDetalle: details.tiene_detalle,
              tieneWorkorders: details.tiene_workorders,
              atributos: details.atributos,
              billOfMaterials: details.bill_of_materials || [],
              // Include MO data (might be a single object or an array)
              MO: details.MO || null,
              MOs: details.MOs || [],
            },
            backgroundColor: getColorForCategory(details.familia),
          });
        
        });
      });
    } 
    else if (viewMode === 'salesOrders') {
      // Group by order number across all workstations and products
      const orderMap = new Map(); // Map to store orders by orderNumber
      
      // First, collect all products for each order across all MOs
      Object.entries(productionData).forEach(([workstation, products]) => {
        Object.entries(products).forEach(([product, details]) => {
          // Check for MOs array and process all orders from all MOs
          if (details.MOs && Array.isArray(details.MOs)) {
            // Deduplicate MOs first - some MOs are duplicated in the data
            const uniqueMOs = [];
            details.MOs.forEach(mo => {
              if (!uniqueMOs.some(existingMo => existingMo.name === mo.name)) {
                uniqueMOs.push(mo);
              }
            });
            
            // Process each unique MO
            uniqueMOs.forEach(mo => {
              if (mo.pedidos) {
                Object.entries(mo.pedidos).forEach(([orderNumber, orderDetails]) => {
                  if (!orderMap.has(orderNumber)) {
                    orderMap.set(orderNumber, {
                      orderDetails: { 
                        partner: orderDetails.partner,
                        prioridad: orderDetails.prioridad,
                        compromiso: orderDetails.compromiso,
                        solicitud: orderDetails.solicitud,
                        expected: orderDetails.expected,
                        manufactura: orderDetails.manufactura
                      },
                      date: moment(orderDetails.compromiso || orderDetails.solicitud),
                      products: [],
                      workstations: new Set(),
                      moName: mo.name // Track which MO this order is associated with
                    });
                  }
                  
                  // Check if this product already exists in the order
                  const existingProductIndex = orderMap.get(orderNumber).products.findIndex(
                    p => p.product === product || p.name === (details.name || product) || p.code === (details.code || product)
                  );
                  
                  if (existingProductIndex === -1) {
                    // Product doesn't exist in the order yet, add it
                    orderMap.get(orderNumber).products.push({
                      product,
                      name: details.name || product,
                      code: details.code || product,
                      cantidad: orderDetails.cantidad,
                      product_qty: details.product_qty,
                      product_uom: details.uom,
                      workstation,
                      familia: details.familia,
                      grupo: details.grupo,
                      categoria: details.categoria,
                      tipo: details.tipo,
                      linea: details.linea,
                      uom: details.uom,
                      atributos: details.atributos,
                      tieneDetalle: details.tiene_detalle,
                      moName: mo.name, // Track which MO this product is from
                      // Include the complete MO object in an array
                      MOs: [mo]
                    });
                  } else {
                    // Product already exists, just add this MO to its MOs array if not already there
                    const existingProduct = orderMap.get(orderNumber).products[existingProductIndex];
                    if (!existingProduct.MOs.some(existingMo => existingMo.name === mo.name)) {
                      existingProduct.MOs.push(mo);
                    }
                  }
                  
                  // Add this workstation to the set
                  orderMap.get(orderNumber).workstations.add(workstation);
                });
              }
            });
          }
          // For backward compatibility, check for pedidos at product level
          else if (details.pedidos) {
            Object.entries(details.pedidos).forEach(([orderNumber, orderDetails]) => {
              if (!orderMap.has(orderNumber)) {
                orderMap.set(orderNumber, {
                  orderDetails: { 
                    partner: orderDetails.partner,
                    prioridad: orderDetails.prioridad,
                    compromiso: orderDetails.compromiso,
                    solicitud: orderDetails.solicitud,
                    expected: orderDetails.expected,
                    manufactura: orderDetails.manufactura
                  },
                  date: moment(orderDetails.compromiso || orderDetails.solicitud),
                  products: [],
                  workstations: new Set()
                });
              }
              
              // Check if this product already exists in the order
              const existingProductIndex = orderMap.get(orderNumber).products.findIndex(
                p => p.product === product
              );
              
              if (existingProductIndex === -1) {
                // Product doesn't exist in the order yet, add it
                orderMap.get(orderNumber).products.push({
                  product,
                  cantidad: orderDetails.cantidad,
                  workstation,
                  familia: details.familia,
                  grupo: details.grupo,
                  categoria: details.categoria,
                  tipo: details.tipo,
                  linea: details.linea,
                  uom: details.uom,
                  atributos: details.atributos,
                  tieneDetalle: details.tiene_detalle
                });
              } else {
                // Product already exists, just update the quantity if needed
                const existingProduct = orderMap.get(orderNumber).products[existingProductIndex];
                if (existingProduct.cantidad < orderDetails.cantidad) {
                  existingProduct.cantidad = orderDetails.cantidad;
                }
              }
              
              // Add this workstation to the set
              orderMap.get(orderNumber).workstations.add(workstation);
            });
          }
        });
      });
      
      // Now create events for each order
      orderMap.forEach((orderData, orderNumber) => {
        // Determine primary workstation (the one with most products)
        const workstationCounts = {};
        orderData.products.forEach(product => {
          workstationCounts[product.workstation] = (workstationCounts[product.workstation] || 0) + 1;
        });
        
        const primaryWorkstation = Object.entries(workstationCounts)
          .sort((a, b) => b[1] - a[1])[0][0];
        
        // Ensure date is not in the past
        if (orderData.date.isBefore(moment(), 'day')) {
          orderData.date = moment();
        }
        
        // Create the event
        calendarEvents.push({
          id: eventId++,
          resourceId: primaryWorkstation,
          title: `${orderNumber} - ${orderData.orderDetails.partner}`,
          start: orderData.date.format('YYYY-MM-DD'),
          end: moment(orderData.date).add(1, 'days').format('YYYY-MM-DD'),
          display: 'block', // Use block display to fix day/week views
          extendedProps: {
            type: 'salesOrder',
            orderNumber,
            products: orderData.products,
            totalProducts: orderData.products.length,
            partner: orderData.orderDetails.partner,
            prioridad: orderData.orderDetails.prioridad,
            compromiso: orderData.orderDetails.compromiso,
            solicitud: orderData.orderDetails.solicitud,
            shipment_date: orderData.orderDetails.shipment_date,
            date_validator: orderData.orderDetails.date_validator,
            manufactura: orderData.orderDetails.manufactura,
            workstations: Array.from(orderData.workstations),
          },
          backgroundColor: getPriorityColor(orderData.orderDetails.prioridad),
        });
      });
    }
    else if (viewMode === 'workorders') {
      // Create a map to group Work Orders by their names across all manufacturing orders
      const workorderMap = new Map(); // Map to store workorders by name
      
      // First, collect all workorders from all MOs across all products
      Object.entries(productionData).forEach(([workstation, products]) => {
        Object.entries(products).forEach(([product, details]) => {
          // Process workorders from MO array
          if (details.MOs && Array.isArray(details.MOs)) {
            // Deduplicate MOs first
            const uniqueMOs = [];
            details.MOs.forEach(mo => {
              if (!uniqueMOs.some(existingMo => existingMo.name === mo.name)) {
                uniqueMOs.push(mo);
              }
            });
            
            // Process each unique MO
            uniqueMOs.forEach(mo => {
              if (mo.workorders && Array.isArray(mo.workorders) && mo.workorders.length > 0) {
                console.log(`Found ${mo.workorders.length} workorders in MO: ${mo.name} for product: ${product}`);
                
                // Process each workorder
                mo.workorders.forEach(wo => {
                  const woName = wo.name;
                  if (!woName) return; // Skip workorders without name
                  
                  if (!workorderMap.has(woName)) {
                    // Create new entry for this workorder
                    workorderMap.set(woName, {
                      workorders: [],
                      products: [],
                      workcenters: new Set(),
                      workstations: new Set(),
                      mos: new Set(),
                      earliestDate: null,
                      totalQuantity: 0
                    });
                  }
                  
                  // Add this workorder to the group
                  const woGroup = workorderMap.get(woName);
                  woGroup.workorders.push({
                    ...wo,
                    moName: mo.name,
                    product: product
                  });
                  
                  // Add this product if not already present
                  if (!woGroup.products.some(p => p.name === product)) {
                    woGroup.products.push({
                      name: product,
                      workstation,
                      familia: details.familia || '',
                      grupo: details.grupo || '',
                      categoria: details.categoria || '',
                      tipo: details.tipo || ''
                    });
                  }
                  
                  // Add this workcenter
                  if (wo.workcenter) {
                    woGroup.workcenters.add(wo.workcenter);
                  }
                  
                  // Add this workstation
                  woGroup.workstations.add(workstation);
                  
                  // Add this MO
                  woGroup.mos.add(mo.name);
                  
                  // Update total quantity
                  woGroup.totalQuantity += parseFloat(wo.qty_producing || 0);
                  
                  // Update earliest date if MO has dates
                  if (mo.date_planned_start) {
                    const moDate = moment(mo.date_planned_start);
                    if (!woGroup.earliestDate || moDate.isBefore(woGroup.earliestDate)) {
                      woGroup.earliestDate = moDate;
                    }
                  }
                });
              }
            });
          }
          
          // Also handle single MO object for backward compatibility
          if (details.MO && details.MO.workorders && Array.isArray(details.MO.workorders)) {
            const mo = details.MO;
            
            mo.workorders.forEach(wo => {
              const woName = wo.name;
              if (!woName) return; // Skip workorders without name
              
              if (!workorderMap.has(woName)) {
                workorderMap.set(woName, {
                  workorders: [],
                  products: [],
                  workcenters: new Set(),
                  workstations: new Set(),
                  mos: new Set(),
                  earliestDate: null,
                  totalQuantity: 0
                });
              }
              
              const woGroup = workorderMap.get(woName);
              woGroup.workorders.push({
                ...wo,
                moName: mo.name,
                product: product
              });
              
              if (!woGroup.products.some(p => p.name === product)) {
                woGroup.products.push({
                  name: product,
                  workstation,
                  familia: details.familia || '',
                  grupo: details.grupo || '',
                  categoria: details.categoria || ''
                });
              }
              
              if (wo.workcenter) {
                woGroup.workcenters.add(wo.workcenter);
              }
              
              woGroup.workstations.add(workstation);
              woGroup.mos.add(mo.name);
              woGroup.totalQuantity += parseFloat(wo.qty_producing || 0);
              
              if (mo.date_planned_start) {
                const moDate = moment(mo.date_planned_start);
                if (!woGroup.earliestDate || moDate.isBefore(woGroup.earliestDate)) {
                  woGroup.earliestDate = moDate;
                }
              }
            });
          }
        });
      });
      
      console.log(`Created ${workorderMap.size} workorder groups`);
      
      // Now create events for each workorder group
      workorderMap.forEach((woGroup, woName) => {
        // Determine primary workcenter from workcenters
        const primaryWorkcenter = Array.from(woGroup.workcenters)[0] || "Unknown Workcenter";
        
        // Determine primary workstation (the one with most products)
        const workstationCounts = {};
        woGroup.products.forEach(product => {
          const ws = product.workstation;
          workstationCounts[ws] = (workstationCounts[ws] || 0) + 1;
        });
        
        let primaryWorkstation;
        if (Object.keys(workstationCounts).length > 0) {
          primaryWorkstation = Object.entries(workstationCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
        } else {
          primaryWorkstation = Array.from(woGroup.workstations)[0] || "Unknown Workstation";
        }
        
        // If no date is set or date is in the past, use today
        if (!woGroup.earliestDate || woGroup.earliestDate.isBefore(moment(), 'day')) {
          woGroup.earliestDate = moment();
        }
        
        // Get state from workorders - use the most common state
        const stateCounts = {};
        woGroup.workorders.forEach(wo => {
          if (wo.state) {
            stateCounts[wo.state] = (stateCounts[wo.state] || 0) + 1;
          }
        });
        
        let primaryState = "pending";
        if (Object.keys(stateCounts).length > 0) {
          primaryState = Object.entries(stateCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
        }
        
        // Create the event
        calendarEvents.push({
          id: eventId++,
          resourceId: primaryWorkstation,
          title: woName,
          start: woGroup.earliestDate.format('YYYY-MM-DD'),
          end: moment(woGroup.earliestDate).add(1, 'days').format('YYYY-MM-DD'),
          display: 'block', // Use block display to fix day/week views
          extendedProps: {
            type: 'workorder',
            name: woName,
            workorders: woGroup.workorders,
            totalWorkorders: woGroup.workorders.length,
            products: woGroup.products,
            totalProducts: woGroup.products.length,
            workcenters: Array.from(woGroup.workcenters),
            primaryWorkcenter: primaryWorkcenter,
            workstations: Array.from(woGroup.workstations),
            mos: Array.from(woGroup.mos),
            totalMOs: woGroup.mos.size,
            state: primaryState,
            totalQuantity: woGroup.totalQuantity
          },
          backgroundColor: getWorkOrderStateColor(primaryState),
        });
      });
    }
    else if (viewMode === 'cuts') {
      // Create a global map to collect all cuts by their key/name
      const globalCutsByKey = new Map();
      console.log("Running cuts view mode aggregation");
      
      // First collect all cuts across all products and workstations
      Object.entries(productionData).forEach(([workstation, products]) => {
        Object.entries(products).forEach(([product, details]) => {
          // Process cuts from detalle_corte (direct cut details)
          if (details.tiene_detalle && details.detalle_corte) {
            console.log(`Processing cuts for product: ${product} with ${Object.keys(details.detalle_corte).length} cut details`);
            
            // Collect product info and sales orders for context
            const productInfo = {
              name: product,
              workstation,
              familia: details.familia,
              grupo: details.grupo,
              linea: details.linea,
              tipo: details.tipo,
              categoria: details.categoria,
              salesOrders: [],
              // Include MO data for manufacturing orders
              MO: details.MO || null,
              MOs: details.MOs || []
            };
            
            // Add sales orders info
            if (details.pedidos) {
              Object.entries(details.pedidos).forEach(([orderNumber, orderDetails]) => {
                // Calculate the cantidad2 for this order
                let orderCantidad2 = 0;
                if (details.detalle_corte) {
                  // For each cut, calculate the proportional cantidad2 for this order
                  Object.values(details.detalle_corte).forEach(cutDetails => {
                    if (cutDetails.cantidad2) {
                      // If there are multiple orders, distribute cantidad2 proportionally
                      const totalOrderQty = Object.values(details.pedidos).reduce((sum, order) => 
                        sum + parseFloat(order.cantidad || 0), 0);
                      
                      if (totalOrderQty > 0) {
                        // Get proportion for this order
                        const orderProportion = parseFloat(orderDetails.cantidad || 0) / totalOrderQty;
                        // Calculate this order's share of the cut's cantidad2
                        orderCantidad2 += orderProportion * parseInt(cutDetails.cantidad2 || 0);
                      }
                    }
                  });
                }
                
                productInfo.salesOrders.push({
                  orderNumber,
                  partner: orderDetails.partner,
                  cantidad: orderDetails.cantidad,
                  cantidad2: Math.round(orderCantidad2), // Round to nearest integer
                  prioridad: orderDetails.prioridad,
                  compromiso: orderDetails.compromiso,
                  manufactura: orderDetails.manufactura
                });
              });
            }
            
            // Process each cut in this product
            Object.entries(details.detalle_corte).forEach(([cutName, cutDetails]) => {
              console.log(`Cut detail found: ${cutName}`, cutDetails);
              
              // PRIORITY 1: Use the "name" field from cut details if available
              // This is the most reliable identifier for manufacturing order components
              let cutKey = '';
              if (cutDetails.name) {
                cutKey = cutDetails.name.trim();
                console.log(`Using name from details: ${cutKey}`);
              } 
              // PRIORITY 2: If no name field, extract from cutName
              else {
                cutKey = cutName;
                // Check if this is a cut detail with the format "NAME (dimensions)"
                const parenthesisIndex = cutName.indexOf('(');
                if (parenthesisIndex > 0) {
                  cutKey = cutName.substring(0, parenthesisIndex).trim();
                }
              }
              
              if (!globalCutsByKey.has(cutKey)) {
                globalCutsByKey.set(cutKey, {
                  workstations: new Set(),
                  products: [],
                  cuts: [],
                  commonProps: {}, // Will store common properties across all cuts
                  earliestDate: null
                });
              }
              
              const cutGroup = globalCutsByKey.get(cutKey);
              
              // Add this workstation
              cutGroup.workstations.add(workstation);
              
              // Add this product if not already present
              const existingProductIndex = cutGroup.products.findIndex(p => p.name === product);
              if (existingProductIndex === -1) {
                cutGroup.products.push(productInfo);
              }
              
              // Add this cut with product reference and original full name
              cutGroup.cuts.push({
                fullName: cutName,
                product,
                ...cutDetails
              });
              
              // Update the earliest date for this cut group
              if (details.pedidos) {
                Object.values(details.pedidos).forEach(orderDetails => {
                  const orderDate = moment(orderDetails.compromiso || orderDetails.solicitud);
                  if (!cutGroup.earliestDate || orderDate.isBefore(cutGroup.earliestDate)) {
                    cutGroup.earliestDate = orderDate;
                  }
                });
              }
              
              // Build up common properties by looking at the first cut
              if (cutGroup.cuts.length === 1) {
                // Initialize common properties from the first cut
                if (cutDetails.ancho) cutGroup.commonProps.width = cutDetails.ancho;
                if (cutDetails.largo) cutGroup.commonProps.length = cutDetails.largo;
                if (cutDetails.Espesor) cutGroup.commonProps.thickness = cutDetails.Espesor;
                if (cutDetails.Calibre) cutGroup.commonProps.caliber = cutDetails.Calibre;
                if (cutDetails.Color) cutGroup.commonProps.color = cutDetails.Color;
              } else {
                // For subsequent cuts, only keep properties that match
                if (cutGroup.commonProps.width && cutGroup.commonProps.width !== cutDetails.ancho) 
                  delete cutGroup.commonProps.width;
                if (cutGroup.commonProps.length && cutGroup.commonProps.length !== cutDetails.largo) 
                  delete cutGroup.commonProps.length;
                if (cutGroup.commonProps.thickness && cutGroup.commonProps.thickness !== cutDetails.Espesor) 
                  delete cutGroup.commonProps.thickness;
                if (cutGroup.commonProps.caliber && cutGroup.commonProps.caliber !== cutDetails.Calibre) 
                  delete cutGroup.commonProps.caliber;
                if (cutGroup.commonProps.color && cutGroup.commonProps.color !== cutDetails.Color) 
                  delete cutGroup.commonProps.color;
              }
            });
          }
          
          // ALSO process billOfMaterials for manufacturing order details
          if (details.billOfMaterials || details.bill_of_materials) {
            const bomData = details.billOfMaterials || details.bill_of_materials;
            
            if (Array.isArray(bomData) && bomData.length > 0) {
              console.log(`Processing BOM data for product: ${product} with ${bomData.length} components`);
              
              // Collect product info for context (same as above)
              const productInfo = {
                name: product,
                workstation,
                familia: details.familia,
                grupo: details.grupo,
                linea: details.linea,
                tipo: details.tipo,
                categoria: details.categoria,
                salesOrders: [],
                // Include MO data for manufacturing orders
                MO: details.MO || null,
                MOs: details.MOs || []
              };
              
              // Add sales orders info
              if (details.pedidos) {
                Object.entries(details.pedidos).forEach(([orderNumber, orderDetails]) => {
                  productInfo.salesOrders.push({
                    orderNumber,
                    partner: orderDetails.partner,
                    cantidad: orderDetails.cantidad,
                    prioridad: orderDetails.prioridad,
                    compromiso: orderDetails.compromiso,
                    manufactura: orderDetails.manufactura
                  });
                });
              }
              
              // Process each BOM component with details
              bomData.forEach(component => {
                if (component.details && Array.isArray(component.details) && component.details.length > 0) {
                  console.log(`Processing BOM component: ${component.product_name} with ${component.details.length} details`);
                  
                  // Process each detail as a cut
                  component.details.forEach(detail => {
                    console.log("Examining BOM detail:", detail);
                    
                    // Try multiple fields as possible keys for grouping
                    // 1. Try name field first
                    // 2. Try product_name 
                    // 3. Finally fall back to any identifying field
                    let cutKey = '';
                    if (detail.name) {
                      cutKey = detail.name.trim();
                    } else if (detail.product_name) {
                      cutKey = detail.product_name.trim();
                    } else if (detail.product_code) {
                      cutKey = detail.product_code.trim();
                    } else {
                      // Fall back to component name + row if available
                      if (component.product_name) {
                        cutKey = component.product_name.trim();
                        if (detail.row) {
                          cutKey += ` - Row ${detail.row}`;
                        }
                      } else {
                        // If all else fails, create a synthetic name from the cut properties
                        const props = [];
                        if (detail.caliber) props.push(`Cal. ${detail.caliber}`);
                        if (detail.width_cut) props.push(`W: ${detail.width_cut}`);
                        if (detail.long_cut) props.push(`L: ${detail.long_cut}`);
                        cutKey = props.join(' - ') || 'Unknown Component';
                      }
                    }
                    
                    console.log(`Processing BOM detail with key: ${cutKey}`);
                    
                    if (!globalCutsByKey.has(cutKey)) {
                      globalCutsByKey.set(cutKey, {
                        workstations: new Set(),
                        products: [],
                        cuts: [],
                        commonProps: {}, // Will store common properties across all cuts
                        earliestDate: null
                      });
                    }
                    
                    const cutGroup = globalCutsByKey.get(cutKey);
                    
                    // Add this workstation
                    cutGroup.workstations.add(workstation);
                    
                    // Add this product if not already present
                    const existingProductIndex = cutGroup.products.findIndex(p => p.name === product);
                    if (existingProductIndex === -1) {
                      cutGroup.products.push(productInfo);
                    }
                    
                    // Add this detail as a cut with product reference
                    cutGroup.cuts.push({
                      fullName: detail.name || cutKey,
                      product,
                      component: component.product_name,
                      ...detail
                    });
                    
                    // Update the earliest date for this cut group from product's sales orders
                    if (details.pedidos) {
                      Object.values(details.pedidos).forEach(orderDetails => {
                        const orderDate = moment(orderDetails.compromiso || orderDetails.solicitud);
                        if (!cutGroup.earliestDate || orderDate.isBefore(cutGroup.earliestDate)) {
                          cutGroup.earliestDate = orderDate;
                        }
                      });
                    }
                    
                    // Build up common properties
                    if (cutGroup.cuts.length === 1) {
                      // Initialize common properties from the first cut
                      if (detail.width_cut) cutGroup.commonProps.width = detail.width_cut;
                      if (detail.long_cut) cutGroup.commonProps.length = detail.long_cut;
                      if (detail.thickness) cutGroup.commonProps.thickness = detail.thickness;
                      if (detail.caliber) cutGroup.commonProps.caliber = detail.caliber;
                      if (detail.color) cutGroup.commonProps.color = detail.color;
                    } else {
                      // For subsequent cuts, only keep properties that match
                      if (cutGroup.commonProps.width && cutGroup.commonProps.width !== detail.width_cut) 
                        delete cutGroup.commonProps.width;
                      if (cutGroup.commonProps.length && cutGroup.commonProps.length !== detail.long_cut) 
                        delete cutGroup.commonProps.length;
                      if (cutGroup.commonProps.thickness && cutGroup.commonProps.thickness !== detail.thickness) 
                        delete cutGroup.commonProps.thickness;
                      if (cutGroup.commonProps.caliber && cutGroup.commonProps.caliber !== detail.caliber) 
                        delete cutGroup.commonProps.caliber;
                      if (cutGroup.commonProps.color && cutGroup.commonProps.color !== detail.color) 
                        delete cutGroup.commonProps.color;
                    }
                  });
                }
              });
            }
          }
        });
      });
      
      // Now create calendar events for each cut group
      console.log(`Created ${globalCutsByKey.size} cut groups after aggregation`);
      
      // Log some information about what was found in the cuts aggregation
      const bomCutCount = Array.from(globalCutsByKey.values()).filter(group => 
        group.cuts.some(cut => cut.component)
      ).length;
      
      console.log(`Found ${bomCutCount} cut groups from BoM details`);
      
      if (globalCutsByKey.size > 0) {
        // Sample a few cut keys to help with debugging
        const sampleKeys = Array.from(globalCutsByKey.keys()).slice(0, 3);
        console.log(`Sample cut keys: ${sampleKeys.join(', ')}`);
        
        // For each sample, show if it has BoM data
        sampleKeys.forEach(key => {
          const group = globalCutsByKey.get(key);
          const hasBomData = group.cuts.some(cut => cut.component);
          console.log(`Cut key '${key}': ${group.cuts.length} cuts, from BoM: ${hasBomData}`);
        });
      }
      
      globalCutsByKey.forEach((cutGroup, cutKey) => {
        console.log(`Processing cut group: ${cutKey} with ${cutGroup.cuts.length} cuts`); 
        
        // Skip if no cuts available
        if (cutGroup.cuts.length === 0) {
          console.log(`Skipping cut group ${cutKey} - no cuts available`);
          return;
        }
        
        // CRITICAL: Check if date is available - this is likely causing the 0 events issue
        if (!cutGroup.earliestDate || cutGroup.earliestDate.isBefore(moment(), 'day')) {
          // Try to assign a default date if none exists or if date is in the past
          const today = moment();
          console.log(`Cut group ${cutKey} has no date or date is in the past, assigning today's date`);
          cutGroup.earliestDate = today;
        }
        
        // Determine primary workstation (the one with most cuts)
        const workstationCounts = {};
        cutGroup.cuts.forEach(cut => {
          const productInfo = cutGroup.products.find(p => p.name === cut.product);
          const workstation = productInfo ? productInfo.workstation : null;
          if (workstation) {
            workstationCounts[workstation] = (workstationCounts[workstation] || 0) + 1;
          }
        });
        
        // Handle case where no workstation is found
        if (Object.keys(workstationCounts).length === 0) {
          console.log(`Cut group ${cutKey} has no workstation, skipping`);
          return;
        }
        
        const primaryWorkstation = Object.entries(workstationCounts)
          .sort((a, b) => b[1] - a[1])[0][0];
        
        // Get title with dimensions if they're common across all cuts
        let title = cutKey;
        
        // First, check if the cuts are actual manufacturing components
        const isMfgComponent = cutGroup.cuts.some(cut => 
          (cut.name === cutKey) || 
          (cut.component && typeof cut.component === 'string')
        );
        
        if (isMfgComponent) {
          // For manufacturing components, just use the cutKey as the title
          // This will show names like "COLD ROL 3/8 MECANISMO CIERRE"
          console.log(`Using manufacturing component name for title: ${cutKey}`);
          
          // Check if there's component info we can add to the title
          const componentNames = new Set();
          cutGroup.cuts.forEach(cut => {
            if (cut.component && typeof cut.component === 'string') {
              componentNames.add(cut.component.trim());
            }
          });
          
          // If we found component names, add the first one in parentheses
          if (componentNames.size > 0) {
            const componentName = Array.from(componentNames)[0];
            // Only add if different from cutKey to avoid repetition
            if (componentName !== cutKey) {
              title += ` (${componentName})`;
            }
          }
        } else {
          // For regular cuts, add dimensions if available
          const dimensions = [];
          if (cutGroup.commonProps.width) dimensions.push(`W:${cutGroup.commonProps.width}`);
          if (cutGroup.commonProps.length) dimensions.push(`L:${cutGroup.commonProps.length}`);
          if (dimensions.length > 0) {
            title += ` (${dimensions.join(' x ')})`;
          }
          
          // Add caliber if common
          if (cutGroup.commonProps.caliber) {
            title += ` - Cal.${cutGroup.commonProps.caliber}`;
          }
        }
        
        // Extract MO data from products
        let allMOs = [];
        cutGroup.products.forEach(product => {
          // Handle MOs array
          if (product.MOs && Array.isArray(product.MOs) && product.MOs.length > 0) {
            // Deduplicate MOs first - some MOs are duplicated in the data
            const uniqueMOs = [];
            product.MOs.forEach(mo => {
              if (!uniqueMOs.some(existingMo => existingMo.name === mo.name)) {
                uniqueMOs.push(mo);
              }
            });
            
            // Add each unique MO to allMOs if not already there
            uniqueMOs.forEach(mo => {
              if (!allMOs.some(existingMO => existingMO.name === mo.name)) {
                allMOs.push({...mo, productName: product.name});
              }
            });
          }
          
          // Handle single MO object
          if (product.MO && typeof product.MO === 'object' && product.MO !== null) {
            if (!allMOs.some(existingMO => existingMO.name === product.MO.name)) {
              allMOs.push({...product.MO, productName: product.name});
            }
          }
        });
        
        // Create a proper calendar event
        const newEvent = {
          id: eventId++,
          resourceId: primaryWorkstation,
          title: title,
          start: cutGroup.earliestDate.format('YYYY-MM-DD'),
          end: moment(cutGroup.earliestDate).add(1, 'days').format('YYYY-MM-DD'),
          display: 'block', // Use block display to fix day/week views
          extendedProps: {
            type: 'cut',
            cutKey,
            cuts: cutGroup.cuts,
            totalCuts: cutGroup.cuts.length,
            products: cutGroup.products,
            totalProducts: cutGroup.products.length,
            workstations: Array.from(cutGroup.workstations),
            commonProps: cutGroup.commonProps,
            // Add extracted MO data directly to extendedProps
            MOs: allMOs,
            hasMOs: allMOs.length > 0,
            // Add BOM-specific properties
            isBomCut: cutGroup.cuts.some(cut => cut.component),
            sourceComponent: cutGroup.cuts.find(cut => cut.component)?.component || null
          },
          backgroundColor: getCutColor(cutGroup.commonProps.caliber)
        };
        
        console.log(`Adding calendar event: ${title} in ${primaryWorkstation}`);
        calendarEvents.push(newEvent);
      });
    }
    
    setEvents(calendarEvents);
    setFilteredEvents(calendarEvents);
    
    // Additional logging for cuts view
    if (viewMode === 'cuts') {
      console.log(`✓ Cuts view processing complete - created ${calendarEvents.length} total events`);
      console.log(`  - ${calendarEvents.filter(e => e.extendedProps.isBomCut).length} events from BOM data`);
      console.log(`  - ${calendarEvents.filter(e => !e.extendedProps.isBomCut).length} events from regular cuts`);
      
      // Log sample events
      if (calendarEvents.length > 0) {
        const sampleEvent = calendarEvents[0];
        console.log("Sample event:", {
          title: sampleEvent.title,
          workstation: sampleEvent.resourceId,
          cutsCount: sampleEvent.extendedProps.cuts.length,
          isBomCut: sampleEvent.extendedProps.isBomCut
        });
      } else {
        console.log("⚠️ No events were created for Cuts view!");
      }
    }
    
    // Schedule initialization of sections after events are processed
    setTimeout(() => {
      console.log(`Event processing complete: ${calendarEvents.length} events created for ${viewMode} view`);
      if (window.initializeSections) {
        console.log("Running post-load section initialization");
        window.initializeSections();
      }
      
    }, 1000);
  }, [productionData, viewMode]);
  
  // Effect to initialize sections when modal is opened
  useEffect(() => {
    if (showModal && window.initializeSections) {
      console.log("Modal opened - initializing sections");
      setTimeout(() => {
        window.initializeSections();
      }, 50);
    }
  }, [showModal]);

  // Generate a color based on the product category
  const getColorForCategory = (category) => {
    const colors = {
      'Cajas de Herramientas': '#FF5733',
      'Mobiliario Metálico': '#33FF57',
      'Mobiliario Madera': '#3357FF',
      'Electrodomésticos': '#FF33A6',
      'Procesamiento': '#33FFF5'
    };
    
    return colors[category] || '#CCCCCC';
  };
  
  // Generate a color based on priority
  const getPriorityColor = (priority) => {
    const colors = {
      'Alta': '#e53935', // Red for high priority
      'Media': '#fb8c00', // Orange for medium priority
      'Baja': '#43a047'  // Green for low priority
    };
    
    return colors[priority] || '#78909c'; // Default gray
  };
  
  // Generate a color based on caliber
  const getCutColor = (caliber) => {
    const colors = {
      '12': '#e53935', // Red
      '14': '#fb8c00', // Orange
      '16': '#43a047', // Green
      '18': '#1e88e5', // Blue
      '20': '#8e24aa', // Purple
      '22': '#ffb300', // Amber
      '24': '#546e7a'  // Blue Grey
    };
    
    return colors[caliber] || '#9c27b0'; // Default purple
  };
  
  // Generate a color based on work order state
  const getWorkOrderStateColor = (state) => {
    const colors = {
      'done': '#43a047',     // Green for completed work orders
      'progress': '#1e88e5', // Blue for in-progress work orders
      'ready': '#fb8c00',    // Orange for ready work orders
      'pending': '#78909c',  // Grey for pending work orders
      'cancel': '#e53935'    // Red for canceled work orders
    };
    
    return colors[state] || '#78909c'; // Default grey
  };
  
  // Helper functions for data diagnostics
  const getProductCount = (data) => {
    let count = 0;
    if (!data) return count;
    
    Object.values(data).forEach(workstation => {
      count += Object.keys(workstation).length;
    });
    return count;
  };
  
  const countProductsWithBoM = (data) => {
    let count = 0;
    if (!data) return count;
    
    Object.values(data).forEach(workstation => {
      Object.values(workstation).forEach(product => {
        if (product.bill_of_materials && Array.isArray(product.bill_of_materials) && product.bill_of_materials.length > 0) {
          count++;
        } else if (product.billOfMaterials && Array.isArray(product.billOfMaterials) && product.billOfMaterials.length > 0) {
          count++;
        }
      });
    });
    return count;
  };
  
  const countProductsWithDetalle = (data) => {
    let count = 0;
    if (!data) return count;
    
    Object.values(data).forEach(workstation => {
      Object.values(workstation).forEach(product => {
        if (product.tiene_detalle && product.detalle_corte && Object.keys(product.detalle_corte).length > 0) {
          count++;
        }
      });
    });
    return count;
  };
  
  const sampleBomData = (data) => {
    if (!data) return;
    
    // Try to find a product with BoM data
    for (const workstation of Object.values(data)) {
      for (const product of Object.values(workstation)) {
        const bomData = product.billOfMaterials || product.bill_of_materials;
        if (bomData && Array.isArray(bomData) && bomData.length > 0) {
          console.log("Sample BoM data found:");
          
          // Log overall BoM structure
          console.log(`BoM has ${bomData.length} components`);
          
          // Find a component with details
          const componentWithDetails = bomData.find(comp => 
            comp.details && Array.isArray(comp.details) && comp.details.length > 0
          );
          
          if (componentWithDetails) {
            console.log("Sample component with details:", {
              productName: componentWithDetails.product_name,
              detailCount: componentWithDetails.details.length,
              sampleDetail: componentWithDetails.details[0]
            });
          } else {
            console.log("No components with details found in this BoM");
          }
          
          return; // Break after finding one sample
        }
      }
    }
    
    console.log("No BoM data found in any product");
  };


  const handleViewChange = (newView) => {
    console.log(`Changing view mode from ${viewMode} to ${newView}`);
    
    // Add detailed logging for debugging
    if (newView === 'cuts') {
      console.log("Starting detailed cuts view diagnostics...");
      
      // Log some details about the current data
      console.log(`Total products in data: ${getProductCount(productionData)}`);
      console.log(`Products with BoM data: ${countProductsWithBoM(productionData)}`);
      console.log(`Products with detalle_corte: ${countProductsWithDetalle(productionData)}`);
      
      // Sample some BoM data if available
      sampleBomData(productionData);
    }
    
    setViewMode(newView);
    // Reset search when view changes, but maintain resource filtering
    setSearchTerm('');
    
    // Apply only resource filtering
    const resourceFilteredEvents = events.filter(event => 
      filteredResources.some(resource => resource.id === event.resourceId)
    );
    setFilteredEvents(resourceFilteredEvents);
    
    // Force section re-initialization after view change
    setTimeout(() => {
      console.log("Reinitializing sections after view change");
      if (window.initializeSections) {
        window.initializeSections();
      }
      
    }, 500);
  };
  
  // Handle resource filter changes
  const handleResourceFilterChange = useCallback((selectedResourceIds) => {
    setFilteredResources(allResources.filter(resource => 
      selectedResourceIds.includes(resource.id)
    ));
    
    // Also filter events based on selected resources
    const updatedFilteredEvents = events.filter(event => 
      selectedResourceIds.includes(event.resourceId)
    );
    
    // Apply any existing search filter to these results
    if (searchTerm.trim()) {
      applySearchFilter(updatedFilteredEvents);
    } else {
      setFilteredEvents(updatedFilteredEvents);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allResources, events, searchTerm]);
  
  // Apply search filter to events
  const applySearchFilter = useCallback((eventsToFilter) => {
    const searchTermLower = searchTerm.toLowerCase();
    
    const filtered = eventsToFilter.filter(event => {
      // First check if event has required props
      if (!event || !event.extendedProps || !event.title) {
        console.log("Warning: Event missing required properties", event);
        return false;
      }
      
      // Add debug logging
      console.log(`Filtering event: ${event.title}, Type: ${event.extendedProps.type}, View Mode: ${viewMode}, Search Type: ${searchType}`);
      
      // Filter logic with improved error handling
      if (searchType === 'product') {
        if (viewMode === 'products') {
          return event.title.toLowerCase().includes(searchTermLower);
        } else if (viewMode === 'salesOrders') {
          return event.extendedProps.products && 
                 event.extendedProps.products.some(product => 
                   product.name && product.name.toLowerCase().includes(searchTermLower));
        } else if (viewMode === 'cuts') {
          return event.extendedProps.products && 
                 event.extendedProps.products.some(product => 
                   product.name && product.name.toLowerCase().includes(searchTermLower));
        } else if (viewMode === 'workorders') {
          return event.extendedProps.products && 
                 event.extendedProps.products.some(product => 
                   product.name && product.name.toLowerCase().includes(searchTermLower));
        }
      } else if (searchType === 'order') {
        if (viewMode === 'products') {
          return event.extendedProps.salesOrders && 
                 event.extendedProps.salesOrders.some(order => 
                   order.orderNumber && order.orderNumber.toLowerCase().includes(searchTermLower));
        } else if (viewMode === 'salesOrders') {
          return event.title.toLowerCase().includes(searchTermLower) || 
                 (event.extendedProps.orderNumber && 
                  event.extendedProps.orderNumber.toLowerCase().includes(searchTermLower));
        } else if (viewMode === 'cuts') {
          return event.extendedProps.products && 
                 event.extendedProps.products.some(product => 
                   product.salesOrders && product.salesOrders.some(order => 
                     order.orderNumber.toLowerCase().includes(searchTermLower)));
        } else if (viewMode === 'workorders') {
          // For workorders, search in MO names
          return event.extendedProps.mos && 
                 event.extendedProps.mos.some(moName => 
                   moName.toLowerCase().includes(searchTermLower));
        }
      }
      return false;
    });
    
    console.log(`Search complete. Found ${filtered.length} matches out of ${eventsToFilter.length} events`);
    setFilteredEvents(filtered);
    
    // Force section initialization after filtering
    setTimeout(() => {
      if (window.initializeSections) {
        window.initializeSections();
      }
    }, 100);
  }, [searchTerm, searchType, viewMode]);
  
  const handleSearch = (term, type) => {
    setSearchTerm(term);
    setSearchType(type);
    
    // First filter events by selected resources
    const resourceFilteredEvents = events.filter(event => 
      filteredResources.some(resource => resource.id === event.resourceId)
    );
    
    if (!term.trim()) {
      // If search term is empty, show events filtered by resources
      setFilteredEvents(resourceFilteredEvents);
      return;
    }
    
    const searchTermLower = term.toLowerCase();
    
    // Filter events based on search term and type, but only consider events from selected resources
    const filtered = resourceFilteredEvents.filter(event => {
      if (type === 'product') {
        // For product search, match against product title or product IDs
        if (viewMode === 'products') {
          return event.title.toLowerCase().includes(searchTermLower);
        } else if (viewMode === 'salesOrders') {
          // Search in the products within this sales order
          return event.extendedProps.products && 
                 event.extendedProps.products.some(product => 
                   product.name.toLowerCase().includes(searchTermLower));
        } else if (viewMode === 'cuts') {
          // Search in the products that use this cut
          return event.extendedProps.products && 
                 event.extendedProps.products.some(product => 
                   product.name.toLowerCase().includes(searchTermLower));
        } else if (viewMode === 'workorders') {
          // Search in the products associated with this workorder
          return event.extendedProps.products && 
                 event.extendedProps.products.some(product => 
                   product.name.toLowerCase().includes(searchTermLower));
        }
      } else if (type === 'order') {
        // For order search, match against order numbers
        if (viewMode === 'products') {
          // Check in the sales orders for this product
          return event.extendedProps.salesOrders && 
                 event.extendedProps.salesOrders.some(order => 
                   order.orderNumber.toLowerCase().includes(searchTermLower));
        } else if (viewMode === 'salesOrders') {
          // Direct match on order number or title (which contains order number)
          return event.title.toLowerCase().includes(searchTermLower) || 
                 (event.extendedProps.orderNumber && 
                  event.extendedProps.orderNumber.toLowerCase().includes(searchTermLower));
        } else if (viewMode === 'cuts') {
          // Check all products using this cut for orders containing the search term
          return event.extendedProps.products && 
                 event.extendedProps.products.some(product => 
                   product.salesOrders && product.salesOrders.some(order => 
                     order.orderNumber.toLowerCase().includes(searchTermLower)));
        } else if (viewMode === 'workorders') {
          // For workorders, search in MO names
          return event.extendedProps.mos && 
                 event.extendedProps.mos.some(moName => 
                   moName.toLowerCase().includes(searchTermLower));
        }
      }
      return false;
    });
    
    setFilteredEvents(filtered);
  };

  return (
    <div className="production-calendar">
      <div className="view-controls">
        <button 
          className={`view-button ${viewMode === 'products' ? 'active' : ''}`} 
          onClick={() => handleViewChange('products')}
        >
          {t('calendar.products')}
        </button>
        <button 
          className={`view-button ${viewMode === 'salesOrders' ? 'active' : ''}`} 
          onClick={() => handleViewChange('salesOrders')}
        >
          {t('calendar.salesOrders')}
        </button>
        <button 
          className={`view-button ${viewMode === 'cuts' ? 'active' : ''}`} 
          onClick={() => handleViewChange('cuts')}
        >
          {t('calendar.cuts')}
        </button>
        <button 
          className={`view-button ${viewMode === 'workorders' ? 'active' : ''}`} 
          onClick={() => handleViewChange('workorders')}
        >
          {t('calendar.workorders')}
        </button>
      </div>
      
      <div className="filter-search-container">
        <div className="filter-section">
          <ResourceFilter 
            title={t('calendar.workstations')}
            items={allResources || []} 
            itemKey="id"
            itemLabel="title"
            onFilterChange={handleResourceFilterChange}
            initiallyOpen={false}
          />
        </div>
        
        <div className="search-section">
          
          <div className="search-results">
            {searchTerm && (
              <div className="search-info">
                {filteredEvents.length === 0 ? (
                  <p>{t('calendar.noResultsFound')} {searchType === 'product' ? t('calendar.product') : t('calendar.salesOrder')}: <strong>{searchTerm}</strong></p>
                ) : (
                  <p>{t('calendar.foundResults')} {filteredEvents.length} {t('calendar.matches')} {searchType === 'product' ? t('calendar.product') : t('calendar.salesOrder')}: <strong>{searchTerm}</strong></p>
                )}
                <button 
                  className="clear-search" 
                  onClick={() => {
                    setSearchTerm('');
                    // Clear search but maintain resource filtering
                    const resourceFilteredEvents = events.filter(event => 
                      filteredResources.some(resource => resource.id === event.resourceId)
                    );
                    setFilteredEvents(resourceFilteredEvents);
                  }}
                >
                  {t('calendar.clearSearch')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin, dayGridPlugin]}
        initialView="resourceTimelineWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
        }}
        views={{
          resourceTimelineDay: {
            type: 'resourceTimeline',
            duration: { days: 1 },
            buttonText: t('calendar.day'),
            slotDuration: { hours: 2 },
            slotLabelFormat: [
              { hour: '2-digit', minute: '2-digit', hour12: false }
            ]
          },
          resourceTimelineWeek: {
            type: 'resourceTimeline',
            duration: { days: 7 },
            buttonText: t('calendar.week'),
            slotDuration: { days: 1 },
            slotLabelFormat: [
              { weekday: 'short', day: 'numeric', month: 'numeric', omitCommas: true }
            ]
          },
          resourceTimelineMonth: {
            type: 'resourceTimeline',
            duration: { days: 30 },
            buttonText: t('calendar.month'),
            slotDuration: { days: 1 },
            slotLabelFormat: [
              { day: 'numeric', weekday: 'short', omitCommas: true }
            ]
          }
        }}
        resources={filteredResources}
        events={filteredEvents}
        editable={true}
        droppable={true}
        eventResizableFromStart={true}
        eventStartEditable={true}
        eventDurationEditable={true}
        slotMinWidth={24}
        snapDuration="24:00:00"
        eventMinWidth={24}
        eventContent={(info) => renderEventContent(info, t)}
        height="auto"
        locales={allLocales}
        locale="es"
        titleFormat={{
          year: 'numeric',
          month: 'long'
        }}
        dayHeaderFormat={{
          weekday: 'short',
          day: '2-digit',
          omitCommas: true
        }}
        weekends={true}
        weekNumberCalculation="ISO"
        nowIndicator={true}
        now={new Date()}
        initialDate={new Date()}
        validRange={{
          start: new Date() // Only allow dates from today forward
        }}
        dayCellClassNames={(arg) => {
          const classes = [];
          // Highlight weekends with special class
          if (arg.date.getDay() === 0 || arg.date.getDay() === 6) {
            classes.push('fc-day-weekend');
            
            // Add specific day class for more targeted styling
            classes.push(arg.date.getDay() === 0 ? 'fc-day-sun' : 'fc-day-sat');
          }
          // Highlight today with special class
          if (moment(arg.date).isSame(moment(), 'day')) {
            classes.push('fc-day-today');
          }
          return classes;
        }}
        slotLabelClassNames={(arg) => {
          const classes = [];
          // Highlight weekends with special class
          if (arg.date.getDay() === 0 || arg.date.getDay() === 6) {
            classes.push('fc-slot-weekend');
            // Add specific day class for more targeted styling
            classes.push(arg.date.getDay() === 0 ? 'fc-day-sun' : 'fc-day-sat');
          }
          return classes;
        }}
        buttonText={{
          today: t('calendar.today'),
          day: t('calendar.day'),
          week: t('calendar.week'),
          month: t('calendar.month')
        }}
      />
      
      {/* Event Details Modal */}
      {showModal && selectedEvent && (
        <div className="event-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <div className="event-modal-content" style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            width: '90%',
            maxWidth: '550px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            animation: 'modalFadeIn 0.3s ease-out',
          }}>
            {/* Modal Header */}
            <div className="event-modal-header" style={{
              padding: '15px 20px',
              borderBottom: '1px solid #e2e6ea',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.25rem', 
                color: '#0056b3',
                fontWeight: 600
              }}>
                {selectedEvent.title}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#666',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                }}
                onMouseOver={(e) => e.target.style.color = '#dc3545'}
                onMouseOut={(e) => e.target.style.color = '#666'}
              >
                &times;
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="event-modal-body" style={{
              padding: '0',
              overflowY: 'auto',
              flex: 1,
            }}>
              <CustomEventContent event={selectedEvent} />
            </div>
            
            {/* Modal Footer */}
            <div className="event-modal-footer" style={{
              padding: '10px 20px',
              borderTop: '1px solid #e2e6ea',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                {t('calendar.close')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Product Details Modal */}
      {showProductDetailsModal && selectedProductEvent && (
        <div className="event-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <div className="event-modal-content" style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            width: '90%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            animation: 'modalFadeIn 0.3s ease-out',
          }}>
            {/* Modal Header */}
            <div className="event-modal-header" style={{
              padding: '15px 20px',
              borderBottom: '1px solid #e2e6ea',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.25rem', 
                color: '#0056b3',
                fontWeight: 600
              }}>
                {t('calendar.productDetails')} {selectedProductEvent.title}
              </h2>
              <button 
                onClick={() => setShowProductDetailsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#666',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                }}
                onMouseOver={(e) => e.target.style.color = '#dc3545'}
                onMouseOut={(e) => e.target.style.color = '#666'}
              >
                &times;
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="event-modal-body" style={{
              padding: '20px',
              overflowY: 'auto',
              flex: 1,
            }}>
              {/* Manufacturing Orders Section */}
              <div className="product-details-section" style={{
                marginBottom: '20px',
                border: '1px solid #d0e3ff',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div className="section-header" style={{
                  backgroundColor: '#e6f0ff',
                  padding: '12px 15px',
                  fontWeight: 'bold',
                  color: '#0056b3',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{
                    display: 'inline-block',
                    backgroundColor: '#0056b3',
                    color: 'white',
                    fontSize: '0.7em',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    marginRight: '8px'
                  }}>{t('calendar.mo')}</span>
                  {t('calendar.manufacturingOrders')}
                </div>
                
                <div className="section-content" style={{padding: '15px'}}>
                  {(selectedProductEvent.extendedProps.MOs && selectedProductEvent.extendedProps.MOs.length > 0) || selectedProductEvent.extendedProps.MO ? (
                    <div>
                      {/* Handle multiple MOs case */}
                      {selectedProductEvent.extendedProps.MOs && selectedProductEvent.extendedProps.MOs.length > 0 && 
                        selectedProductEvent.extendedProps.MOs.map((mo, index) => (
                        <div key={mo.name || index} style={{
                          border: '1px solid #e9ecef',
                          borderRadius: '4px',
                          marginBottom: '10px',
                          backgroundColor: '#f8f9fa',
                          padding: '10px'
                        }}>
                          <div style={{fontWeight: 'bold', marginBottom: '8px', color: '#0056b3'}}>
                            {mo.name || `${t('calendar.manufacturingOrder')} ${index + 1}`}
                          </div>
                          
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            marginBottom: '10px'
                          }}>
                            <span style={{
                              backgroundColor: '#e9ecef',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.85em'
                            }}>
                              <strong>{t('calendar.status')}: </strong> {mo.state || t('calendar.unknown')}
                            </span>
                            
                            <span style={{
                              backgroundColor: '#e9ecef',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.85em'
                            }}>
                              <strong>{t('calendar.quantity')}: </strong> {mo.product_qty || '0'} {selectedProductEvent.extendedProps.uom || t('calendar.units')}
                            </span>
                            
                            {mo.date_planned_start && (
                              <span style={{
                                backgroundColor: '#e9ecef',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85em'
                              }}>
                                <strong>{t('calendar.startDate')}: </strong> {moment.utc(mo.date_planned_start).format('YYYY-MM-DD')}
                              </span>
                            )}
                            
                            {mo.date_planned_finished && (
                              <span style={{
                                backgroundColor: '#e9ecef',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85em'
                              }}>
                                <strong>{t('calendar.endDate')}: </strong> {moment.utc(mo.date_planned_finished).format('YYYY-MM-DD')}
                              </span>
                            )}
                          </div>
                          
                          {/* Sales Orders */}
                          {mo.pedidos && Object.keys(mo.pedidos).length > 0 && (
                            <div style={{marginTop: '10px'}}>
                              <div style={{
                                fontWeight: 'bold',
                                marginBottom: '8px',
                                fontSize: '0.9em',
                                display: 'flex',
                                alignItems: 'center'
                              }}>
                                <span style={{
                                  display: 'inline-block',
                                  backgroundColor: '#0056b3',
                                  color: 'white',
                                  fontSize: '0.7em',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  marginRight: '8px'
                                }}>{t('calendar.so')}</span>
                                {t('calendar.relatedSalesOrders')}
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}>
                                {Object.entries(mo.pedidos).map(([orderNumber, orderDetails]) => (
                                  <div key={orderNumber} style={{
                                    border: '1px solid #e9ecef',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    backgroundColor: '#f8fbff'
                                  }}>
                                    <div style={{fontWeight: 'bold', marginBottom: '5px'}}>
                                      {orderNumber} - {orderDetails.partner || t('calendar.unknownCustomer')}
                                    </div>
                                    
                                    <div style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '5px'
                                    }}>
                                      <span style={{
                                        backgroundColor: '#e9ecef',
                                        padding: '2px 6px',
                                        borderRadius: '3px',
                                        fontSize: '0.8em'
                                      }}>
                                        <strong>{t('calendar.quantity')}: </strong> {orderDetails.cantidad || '0'}
                                      </span>
                                      
                                      {orderDetails.compromiso && (
                                        <span style={{
                                          backgroundColor: '#e9ecef',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          fontSize: '0.8em'
                                        }}>
                                          <strong>{t('calendar.commitment')}: </strong> {moment.utc(orderDetails.compromiso).format('YYYY-MM-DD')}
                                        </span>
                                      )}
                                      
                                      {orderDetails.prioridad && (
                                        <span style={{
                                          backgroundColor: '#e9ecef',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          fontSize: '0.8em'
                                        }}>
                                          <strong>{t('calendar.priority')}: </strong> {orderDetails.prioridad}
                                        </span>
                                      )}
                                      
                                      {orderDetails.manufactura && (
                                        <span style={{
                                          backgroundColor: '#e9ecef',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          fontSize: '0.8em'
                                        }}>
                                          <strong>{t('calendar.manufacturing')}: </strong> {orderDetails.manufactura}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Products from sales order line */}
                                    {orderDetails.sale_line_products && orderDetails.sale_line_products.length > 0 && (
                                      <div style={{marginTop: '8px'}}>
                                        <div style={{
                                          fontWeight: 'bold',
                                          fontSize: '0.85em',
                                          marginBottom: '5px',
                                          color: '#0056b3'
                                        }}>
                                          {t('calendar.lineProducts')}
                                        </div>
                                        
                                        <div style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '5px'
                                        }}>
                                          {orderDetails.sale_line_products.map((product, idx) => (
                                            <div key={idx} style={{
                                              backgroundColor: '#e9ecef',
                                              padding: '5px 8px',
                                              borderRadius: '3px',
                                              fontSize: '0.8em'
                                            }}>
                                              <strong>{product.product_name}</strong> - {t('calendar.quantity')}: {product.product_qty}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Handle single MO case (for backward compatibility) */}
                      {selectedProductEvent.extendedProps.MO && (
                        <div style={{
                          border: '1px solid #e9ecef',
                          borderRadius: '4px',
                          marginBottom: '10px',
                          backgroundColor: '#f8f9fa',
                          padding: '10px'
                        }}>
                          <div style={{fontWeight: 'bold', marginBottom: '8px', color: '#0056b3'}}>
                            {selectedProductEvent.extendedProps.MO.name || t('calendar.manufacturingOrder')}
                          </div>
                          
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            marginBottom: '10px'
                          }}>
                            <span style={{
                              backgroundColor: '#e9ecef',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.85em'
                            }}>
                              <strong>{t('calendar.status')}: </strong> {selectedProductEvent.extendedProps.MO.state || t('calendar.unknown')}
                            </span>
                            
                            <span style={{
                              backgroundColor: '#e9ecef',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.85em'
                            }}>
                              <strong>{t('calendar.quantity')}: </strong> {selectedProductEvent.extendedProps.MO.product_qty || '0'} {selectedProductEvent.extendedProps.uom || t('calendar.units')}
                            </span>
                            
                            {selectedProductEvent.extendedProps.MO.date_planned_start && (
                              <span style={{
                                backgroundColor: '#e9ecef',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85em'
                              }}>
                                <strong>{t('calendar.startDate')}: </strong> {moment.utc(selectedProductEvent.extendedProps.MO.date_planned_start).format('YYYY-MM-DD')}
                              </span>
                            )}
                            
                            {selectedProductEvent.extendedProps.MO.date_planned_finished && (
                              <span style={{
                                backgroundColor: '#e9ecef',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85em'
                              }}>
                                <strong>{t('calendar.endDate')}: </strong> {moment.utc(selectedProductEvent.extendedProps.MO.date_planned_finished).format('YYYY-MM-DD')}
                              </span>
                            )}
                          </div>
                          
                          {/* Sales Orders for single MO */}
                          {selectedProductEvent.extendedProps.MO.pedidos && 
                           Object.keys(selectedProductEvent.extendedProps.MO.pedidos).length > 0 && (
                            <div style={{marginTop: '10px'}}>
                              <div style={{
                                fontWeight: 'bold',
                                marginBottom: '8px',
                                fontSize: '0.9em',
                                display: 'flex',
                                alignItems: 'center'
                              }}>
                                <span style={{
                                  display: 'inline-block',
                                  backgroundColor: '#0056b3',
                                  color: 'white',
                                  fontSize: '0.7em',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  marginRight: '8px'
                                }}>{t('calendar.so')}</span>
                                {t('calendar.relatedSalesOrders')}
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}>
                                {Object.entries(selectedProductEvent.extendedProps.MO.pedidos).map(([orderNumber, orderDetails]) => (
                                  <div key={orderNumber} style={{
                                    border: '1px solid #e9ecef',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    backgroundColor: '#f8fbff'
                                  }}>
                                    <div style={{fontWeight: 'bold', marginBottom: '5px'}}>
                                      {orderNumber} - {orderDetails.partner || t('calendar.unknownCustomer')}
                                    </div>
                                    
                                    <div style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '5px'
                                    }}>
                                      <span style={{
                                        backgroundColor: '#e9ecef',
                                        padding: '2px 6px',
                                        borderRadius: '3px',
                                        fontSize: '0.8em'
                                      }}>
                                        <strong>{t('calendar.quantity')}: </strong> {orderDetails.cantidad || '0'}
                                      </span>
                                      
                                      {orderDetails.compromiso && (
                                        <span style={{
                                          backgroundColor: '#e9ecef',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          fontSize: '0.8em'
                                        }}>
                                          <strong>{t('calendar.commitment')}: </strong> {moment.utc(orderDetails.compromiso).format('YYYY-MM-DD')}
                                        </span>
                                      )}
                                      
                                      {orderDetails.prioridad && (
                                        <span style={{
                                          backgroundColor: '#e9ecef',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          fontSize: '0.8em'
                                        }}>
                                          <strong>{t('calendar.priority')}: </strong> {orderDetails.prioridad}
                                        </span>
                                      )}
                                      
                                      {orderDetails.manufactura && (
                                        <span style={{
                                          backgroundColor: '#e9ecef',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          fontSize: '0.8em'
                                        }}>
                                          <strong>{t('calendar.manufacturing')}: </strong> {orderDetails.manufactura}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Products from sales order line */}
                                    {orderDetails.sale_line_products && orderDetails.sale_line_products.length > 0 && (
                                      <div style={{marginTop: '8px'}}>
                                        <div style={{
                                          fontWeight: 'bold',
                                          fontSize: '0.85em',
                                          marginBottom: '5px',
                                          color: '#0056b3'
                                        }}>
                                          {t('calendar.lineProducts')}
                                        </div>
                                        
                                        <div style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '5px'
                                        }}>
                                          {orderDetails.sale_line_products.map((product, idx) => (
                                            <div key={idx} style={{
                                              backgroundColor: '#e9ecef',
                                              padding: '5px 8px',
                                              borderRadius: '3px',
                                              fontSize: '0.8em'
                                            }}>
                                              <strong>{product.product_name}</strong> - {t('calendar.quantity')}: {product.product_qty}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{padding: '10px', color: '#6c757d', fontStyle: 'italic'}}>
                      {t('calendar.noManufacturingOrdersFound')}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="event-modal-footer" style={{
              padding: '10px 20px',
              borderTop: '1px solid #e2e6ea',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button 
                onClick={() => setShowProductDetailsModal(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                {t('calendar.close')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>
        {`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Fix double scroll issue */
        .tooltip-content {
          max-height: none !important;
          overflow: visible !important;
        }
        
        .mo-details {
          max-height: none !important;
          overflow: visible !important;
        }
        
        /* Ensure lists don't create their own scroll */
        ul.orders-list, 
        ul.products-list, 
        ul.mo-orders,
        ul.cut-list {
          max-height: none !important;
          overflow: visible !important;
        }
        
        /* Section Filter Styles */
        .section-filter {
          padding: 10px 15px;
          background-color: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 10px;
          border: 1px solid #dee2e6;
        }
        
        .section-filter-label {
          font-weight: 600;
          margin-bottom: 8px;
          display: block;
          color: #0056b3;
        }
        
        .section-filter-options {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          margin-right: 15px;
          cursor: pointer;
          font-size: 0.85rem;
        }
        
        .checkbox-label input {
          margin-right: 5px;
        }
        
        .section-filter-container {
          flex: 1;
          margin: 0 10px;
        }
        
        /* Adjust the filter-search-container for new layout */
        .filter-search-container {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .filter-section, .search-section {
          flex: 1;
        }
        
        /* Make calendar event items clickable */
        .clickable-event {
          cursor: pointer;
        }
        .clickable-event:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        `}
      </style>
    </div>
  );
};

export default ProductionCalendar;
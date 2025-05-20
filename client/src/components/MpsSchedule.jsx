import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FaChevronDown, FaChevronRight, FaSave, FaSearch, FaTimes, FaFileExcel, FaCalendarAlt, FaFilter } from 'react-icons/fa';
import axios from 'axios';
import ResourceFilter from './ResourceFilter';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';

// Text filter component for searching
const TextFilter = ({ label, value, onChange, placeholder, onClear, t }) => {
  return (
    <div className="text-filter" style={{
      display: 'flex',
      flexDirection: 'column',
      margin: '0 0 10px 0',
      minWidth: '200px'
    }}>
      <label style={{
        fontSize: '0.85rem',
        fontWeight: 'bold',
        marginBottom: '5px'
      }}>
        {label}
      </label>
      <div style={{
        display: 'flex',
        position: 'relative',
        alignItems: 'center'
      }}>
        <span style={{
          position: 'absolute',
          left: '8px',
          color: '#888',
          pointerEvents: 'none'
        }}>
          <FaSearch size={12} />
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            padding: '6px 30px 6px 28px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '0.9rem',
            width: '100%'
          }}
        />
        {value && (
          <button
            onClick={onClear}
            style={{
              position: 'absolute',
              right: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#888',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0'
            }}
          >
            <FaTimes size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

// Date Range Filter component for filtering by date
const DateRangeFilter = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange, 
  onApplyFilter, 
  isLoading,
  showNoCommitmentOrders,
  onNoCommitmentToggle,
  t
}) => {
  return (
    <div className="date-range-filter" style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '15px',
      backgroundColor: '#f0f7ff',
      borderRadius: '8px',
      border: '1px solid #d0e3ff',
      marginBottom: '20px'
    }}>
      <h3 style={{
        fontSize: '1rem',
        marginTop: 0,
        marginBottom: '15px',
        display: 'flex',
        alignItems: 'center',
        color: '#0056b3'
      }}>
        <FaCalendarAlt style={{ marginRight: '8px' }} />
        {t('mps.filters.dateRange')}
      </h3>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>
            {t('mps.filters.startDate')}
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>
            {t('mps.filters.endDate')}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          />
        </div>
        
        <button
          onClick={onApplyFilter}
          disabled={isLoading || !startDate || !endDate}
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#0056b3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 15px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            cursor: isLoading || !startDate || !endDate ? 'not-allowed' : 'pointer',
            opacity: isLoading || !startDate || !endDate ? 0.7 : 1
          }}
        >
          <FaFilter style={{ marginRight: '8px' }} />
          {isLoading ? t('mps.loading') : t('mps.filters.apply')}
        </button>
      </div>
      
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        marginTop: '15px',
        backgroundColor: showNoCommitmentOrders ? '#e6f0ff' : '#fff4e5',
        padding: '10px',
        borderRadius: '4px',
        border: showNoCommitmentOrders ? '1px solid #b8daff' : '1px solid #ffd8a8'
      }}>
        <input
          type="checkbox"
          id="noCommitmentToggle"
          checked={showNoCommitmentOrders}
          onChange={onNoCommitmentToggle}
          style={{ marginRight: '10px' }}
        />
        <label htmlFor="noCommitmentToggle" style={{ 
          fontSize: '0.85rem', 
          fontWeight: 'bold', 
          cursor: 'pointer',
          color: showNoCommitmentOrders ? '#0056b3' : '#d97706'
        }}>
          {t('mps.filters.showNoCommitment')} {showNoCommitmentOrders ? t('mps.filters.on') : t('mps.filters.off')}
        </label>
      </div>
      
      <p style={{ 
        fontSize: '0.8rem', 
        color: '#666', 
        marginTop: '10px',
        fontStyle: 'italic'
      }}>
        {t('mps.filters.dateRangeInfo')}
        <span style={{ 
          display: 'block', 
          marginTop: '5px', 
          fontWeight: 'bold',
          color: showNoCommitmentOrders ? '#0056b3' : '#d97706' 
        }}>
          {showNoCommitmentOrders 
            ? t('mps.filters.noCommitmentIncluded') 
            : t('mps.filters.noCommitmentExcluded')}
        </span>
      </p>
    </div>
  );
};

const MpsSchedule = ({ dbConnected }) => {
  const { t } = useTranslation();
  
  // State for the production data
  const [productionData, setProductionData] = useState(null);
  const [days, setDays] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedSubRows, setExpandedSubRows] = useState({});
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [textFilters, setTextFilters] = useState({
    product: '',
    salesOrder: '',
    manufacturingOrder: '',
    cutDetail: '',
    segment: ''
  });
  const [editingCell, setEditingCell] = useState(null);
  const [cellValues, setCellValues] = useState({});
  const [saveStatus, setSaveStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [error, setError] = useState(null);
  
  // Date range filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilterApplied, setDateFilterApplied] = useState(false);
  
  // State for handling orders without commitment date
  const [showNoCommitmentOrders, setShowNoCommitmentOrders] = useState(false);

  // Function to toggle the visibility of segment sections
  const toggleSegmentSection = useCallback((moId, moName) => {
    // Create a unique ID based on both the MO ID and name
    const segmentId = `segments-${moId}-${moName}`;
    const content = document.getElementById(segmentId);
    const icon = document.getElementById(`${segmentId}-icon`);
    
    if (content && icon) {
      const currentDisplay = window.getComputedStyle(content).display;
      content.style.display = currentDisplay === 'none' ? 'flex' : 'none';
      icon.textContent = currentDisplay === 'none' ? '▼' : '►';
    }
  }, []);

  // Function to fetch data based on date range
  const fetchProductionData = async () => {
    if (!dbConnected) {
      setError(t('mps.error.database'));
      return;
    }
    
    if (!startDate || !endDate) {
      setError(t('mps.error.dateRange'));
      return;
    }
    
    try {
      setDataLoading(true);
      setError(null);
      
      const { data } = await axios.get('/api/production/schedule', {
        params: { startDate, endDate, showNoCommitmentOrders }
      });
      
      setProductionData(data);
      setDateFilterApplied(true);
    } catch (err) {
      console.error('Error fetching production data:', err);
      let errorMessage = t('mps.error.fetchData');
      
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = t('mps.error.notFound');
        } else if (err.response.status === 400) {
          errorMessage = err.response.data.message || t('mps.error.invalidRange');
        } else if (err.response.status >= 500) {
          errorMessage = t('mps.error.server');
        }
      }
      
      setError(errorMessage);
    } finally {
      setDataLoading(false);
    }
  };

  // Generate days for the next 90 days starting from the start date if available, otherwise today
  useEffect(() => {
    if (!startDate && !endDate) {
      // Set default dates (current month)
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 3, 0); // 3 months from current month
      
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    }
    
    // Calculate days range based on date range
    const generateDays = () => {
      const result = [];
      let startPoint = startDate ? new Date(startDate) : new Date();
      const endPoint = endDate ? new Date(endDate) : new Date();
      
      // Add 90 days from start if no end date specified
      const maxDays = 90;
      let dayCounter = 0;
      
      // Calculate difference in days
      const diffTime = endPoint - startPoint;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysToShow = Math.min(diffDays + 1, maxDays);
      
      while (dayCounter < daysToShow) {
        const date = new Date(startPoint);
        date.setDate(startPoint.getDate() + dayCounter);
        
        result.push({
          date,
          dayOfMonth: date.getDate(),
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          dayOfWeek: date.getDay(),
          formattedDate: `${date.getDate()}/${date.getMonth() + 1}`
        });
        
        dayCounter++;
      }
      
      return result;
    };
    
    setDays(generateDays());
    
    // If productionData is already available, we can set up locations
    if (productionData && typeof productionData === 'object') {
      const locations = Object.keys(productionData);
      setAvailableLocations(locations);
      setSelectedLocations(locations); // Initially select all locations
    }
  }, [startDate, endDate, productionData]);

  // Load saved MPS data
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        // First load - might fail if file doesn't exist yet, which is fine
        const response = await axios.get('/api/production/mps-data');
        if (response.data && Object.keys(response.data).length > 0) {
          setCellValues(response.data);
        }
      } catch {
        console.log('No saved MPS data found - starting with empty data');
        // It's okay if this fails - we'll start with empty data
      }
    };
    
    loadSavedData();
  }, []);
  
  // Effect to listen for product details modal events
  useEffect(() => {
    const handleProductDetailsEvent = (e) => {
      const { warehouseName, productName } = e.detail;
      
      if (productionData && warehouseName && productName && productionData[warehouseName]) {
        const productDetails = productionData[warehouseName][productName];
        
        if (productDetails) {
          console.log("Found product details for modal:", productDetails);
          
          // Debug segments data
          if (productDetails.MOs && productDetails.MOs.length > 0) {
            productDetails.MOs.forEach((mo, index) => {
              console.log(`MO #${index + 1} (${mo.name}) segments:`, mo.segments || 'No segments');
              
              // Special debug for MO1967504
              if (mo.name === "MO1967504") {
                console.log("!!! Found MO1967504 - Segment data: ", mo.segments);
              }
            });
          }
          
          setSelectedProductDetails({
            warehouseName,
            productName,
            ...productDetails
          });
          setShowProductDetailsModal(true);
        } else {
          console.warn(`Product ${productName} not found in warehouse ${warehouseName}`);
        }
      } else {
        console.warn("Missing product or warehouse information for modal");
      }
    };
    
    // Add event listener
    document.addEventListener('showMpsProductDetailsModal', handleProductDetailsEvent);
    
    // Clean up
    return () => {
      document.removeEventListener('showMpsProductDetailsModal', handleProductDetailsEvent);
    };
  }, [productionData]);
  
  // Save MPS data to server
  const saveMpsData = async () => {
    try {
      setLoading(true);
      setSaveStatus(t('mps.saving'));
      
      await axios.post('/api/production/mps-data', {
        mpsData: cellValues
      });
      
      setSaveStatus(t('mps.saved'));
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving MPS data:', error);
      setSaveStatus(t('mps.error.save'));
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Handle location filter change
  const handleLocationFilterChange = (selected) => {
    setSelectedLocations(selected);
  };
  
  // Export to Excel function
  const exportToExcel = () => {
    // Initialize an array to store flattened data for Excel
    const excelData = [];
    
    // Helper function to format dates
    const formatDate = (dateStr) => {
      const [day, month] = dateStr.split('/');
      const year = new Date().getFullYear();
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    };
    
    // Log the data structure for debugging
    console.log('Exporting data to Excel:', data);
    
    // Get original production data directly from productionData
    const getProductionInfo = (productName) => {
      // Default values
      const info = {
        moNumber: '',       // Production name/number (MO)
        orderNumber: '',    // Sales order number (SO) 
        poNumber: '',       // PO reference
        customerName: ''    // Customer name
      };
      
      if (!productionData) return info;
      
      // First, let's try to get product info by exact match
      // Search through all warehouses and products to find matching product
      let foundProduct = false;
      
      // Extract product code from the format [CODE] NAME
      const productMatch = productName.match(/\[(.*?)\]\s*(.*)/);
      const productCode = productMatch ? productMatch[1] : '';
      
      // Get all possible product names for matching
      const productNames = [];
      if (productName) productNames.push(productName);
      if (productCode) productNames.push(productCode);
      
      // Clean versions for additional matching
      const cleanProductName = productName.replace(/\s+/g, '').toLowerCase();
      if (cleanProductName) productNames.push(cleanProductName);
      
      // Try all possible name combinations
      Object.values(productionData).forEach(products => {
        Object.entries(products).forEach(([key, details]) => {
          // Skip if we already found a match
          if (foundProduct) return;
          
          // Clean version of key for matching
          const cleanKey = key.replace(/\s+/g, '').toLowerCase();
          
          // Check if this is our product (using multiple matching methods)
          const isMatch = 
            key === productName || 
            (productCode && key.includes(`[${productCode}]`)) ||
            (cleanProductName && cleanKey.includes(cleanProductName)) ||
            (productNames.some(name => key.includes(name)));
            
          if (isMatch) {
            foundProduct = true;
            
            // If we have MOs, get the order info
            if (details.MOs && details.MOs.length > 0) {
              // Try to find an MO with order info first
              let hasOrderInfo = false;
              
              // First pass: Look for MOs with pedidos
              for (const mo of details.MOs) {
                info.moNumber = mo.name || ''; // Always set the MO number from the first one
                
                if (mo.pedidos && Object.keys(mo.pedidos).length > 0) {
                  const firstOrderKey = Object.keys(mo.pedidos)[0];
                  const orderDetails = mo.pedidos[firstOrderKey];
                  
                  // Get the order number, client order reference, and partner name
                  info.orderNumber = firstOrderKey || '';
                  info.poNumber = orderDetails.client_order_ref || '';
                  info.customerName = orderDetails.partner || '';
                  hasOrderInfo = true;
                  break;
                }
              }
              
              // If no order info was found but we have MOs, at least set the MO number
              if (!hasOrderInfo) {
                info.moNumber = details.MOs[0].name || '';
              }
              
              // Log the found product and details
              console.log(`Found product for "${productName}":`, {
                productKey: key,
                moNumber: info.moNumber,
                orderNumber: info.orderNumber,
                customerName: info.customerName
              });
            }
          }
        });
      });
      
      // If we still don't have an order number, let's try one more approach, but ONLY for SO prefixes:
      // Look for "SO-" prefixes in the product name or identifier (sales order, not manufacturing order)
      if (!info.orderNumber && productName) {
        // Check if the product name contains SO- or S/O or S.O. prefixes
        const soMatches = productName.match(/(?:SO[-/]|S[/]O[-:]|S[.]O[.][-:])\s*([A-Z0-9]+)/i);
        if (soMatches && soMatches[1]) {
          info.orderNumber = soMatches[1];
        }
        
        // Check if there's no MO number but there's a MO- prefix in the name
        if (!info.moNumber) {
          const moMatches = productName.match(/(?:MO[-/]|M[/]O[-:]|M[.]O[.][-:])\s*([A-Z0-9]+)/i);
          if (moMatches && moMatches[1]) {
            info.moNumber = moMatches[1];
          }
        }
      }
      
      // Never use MO number as fallback for order number
      
      return info;
    };
    
    // Process all rows in the data (data already contains filtered information)
    data.forEach((warehouse) => {
      // For each warehouse
      warehouse.children.forEach((product) => {
        // Get production info for this product
        const productInfo = getProductionInfo(product.name);
        
        // Log for debugging
        console.log(`Production info for ${product.name}:`, productInfo);
        
        // Log warning if values are missing
        if (!productInfo.moNumber || !productInfo.orderNumber) {
          console.warn(`⚠️ Missing order information for product "${product.name}":`, {
            moNumber: productInfo.moNumber || 'MISSING',
            orderNumber: productInfo.orderNumber || 'MISSING',
            customerName: productInfo.customerName || 'MISSING'
          });
        }
        
        // Use N/A for order number if not available - do not fallback to MO number
        const orderNumber = productInfo.orderNumber || 'N/A';
        
        // For each product
        const productRow = {
          'Warehouse': warehouse.name,
          'Item Type': 'Product',
          'Item': product.name,
          'MO Number': productInfo.moNumber || 'N/A',
          'Order Number': orderNumber,
          'Customer': productInfo.customerName || 'N/A',
          'Forecasted Demand': product.forecastedDemand,
          'Current Stock': product.currentStock
        };
        
        // Add day columns for production quantities
        days.forEach(day => {
          const cellKey = `${product.id}-${day.formattedDate}`;
          const qty = cellValues[cellKey] || '';
          productRow[`${formatDate(day.formattedDate)}`] = qty;
        });
        
        // Add projected stock for each day
        const projectedStockRow = {
          'Warehouse': warehouse.name,
          'Item Type': 'Projected Stock',
          'Item': `${product.name} - Projected Stock`,
          'MO Number': productInfo.moNumber || 'N/A',
          'Order Number': orderNumber,
          'Customer': productInfo.customerName || 'N/A',
          'Forecasted Demand': '',
          'Current Stock': product.currentStock
        };
        
        let cumulativeStock = product.currentStock;
        days.forEach(day => {
          const cellKey = `${product.id}-${day.formattedDate}`;
          const productionQty = parseInt(cellValues[cellKey] || 0, 10);
          cumulativeStock += productionQty;
          projectedStockRow[`${formatDate(day.formattedDate)}`] = cumulativeStock;
        });
        
        // Add the product and projected stock rows
        excelData.push(productRow);
        excelData.push(projectedStockRow);
        
        // Process all cut details for this product
        if (product.children && product.children.length > 0) {
          let currentComponent = null;
          
          product.children.forEach(detail => {
            // Skip component headers
            if (detail.isComponentHeader) {
              currentComponent = detail.name;
              return;
            }
            
            // Inherit order information from parent product
            const detailRow = {
              'Warehouse': warehouse.name,
              'Item Type': 'Cut Detail',
              'Item': detail.name,
              'Component': detail.componentName || currentComponent,
              'MO Number': productInfo.moNumber || 'N/A',
              'Order Number': orderNumber,
              'Customer': productInfo.customerName || 'N/A',
              'Forecasted Demand': detail.forecastedDemand || '',
              'Width': detail.width || '',
              'Length': detail.length || '',
              'Thickness': detail.thickness || '',
              'Side': detail.side || '',
              'Color': detail.color || '',
              'Caliber': detail.caliber || 'N/A',
              'Quantity': detail.quantity || ''
            };
            
            // Add day columns for cut detail production
            days.forEach(day => {
              const cellKey = `${detail.id}-${day.formattedDate}`;
              const qty = cellValues[cellKey] || '';
              detailRow[`${formatDate(day.formattedDate)}`] = qty;
            });
            
            // Add projected production for cut details
            const detailProjectedRow = {
              'Warehouse': warehouse.name,
              'Item Type': 'Cut Detail Projection',
              'Item': `${detail.name} - Projected Production`,
              'Component': detail.componentName || currentComponent,
              'MO Number': productInfo.moNumber || 'N/A',
              'Order Number': orderNumber,
              'Customer': productInfo.customerName || 'N/A',
              'Width': '',
              'Length': '',
              'Thickness': '',
              'Side': '',
              'Color': '',
              'Caliber': '',
              'Quantity': detail.quantity || '',
              'Forecasted Demand': '',
            };
            
            // Calculate parent's projected stock for each day (parent product)
            // The cut detail's projected production is derived from the parent's production
            let detailCumulativeProduction = 0;
            
            days.forEach(day => {
              // Calculate parent product's production for this day
              const parentId = detail.parentId;
              const parentCellKey = `${parentId}-${day.formattedDate}`;
              const parentProductionQty = parseInt(cellValues[parentCellKey] || 0, 10);
              
              // If the parent has production on this day, calculate the cut detail production
              const detailProductionForParent = detail.quantity > 0 && parentProductionQty > 0 ? 
                Math.floor(parentProductionQty * detail.quantity) : 0;
              
              // Add to cumulative production
              detailCumulativeProduction += detailProductionForParent;
              
              // Only show value if there's actual production
              detailProjectedRow[`${formatDate(day.formattedDate)}`] = detailCumulativeProduction > 0 ? 
                detailCumulativeProduction : '';
            });
            
            // Add the detail and its projection row
            excelData.push(detailRow);
            excelData.push(detailProjectedRow);
          });
        }
      });
    });
    
    // Log a sample of data being exported for debugging
    console.log('Sample of Excel data (first 3 rows):', excelData.slice(0, 3));
    
    // Reorder the columns with the updated fields
    const reorderedData = excelData.map(row => {
      // Create a new object with the desired column order
      const newRow = {
        'Warehouse': row['Warehouse'],
        'Item Type': row['Item Type']
      };
      
      // Add Component column if it exists (for cut details)
      if ('Component' in row) {
        newRow['Component'] = row['Component'];
      } else {
        // If it's not a cut detail row, add an empty component column
        newRow['Component'] = '';
      }
      
      // Add the Item column
      newRow['Item'] = row['Item'];
      
      // Add order information columns right after Item
      const orderInfoColumns = ['MO Number', 'Order Number', 'Customer'];
      orderInfoColumns.forEach(col => {
        newRow[col] = row[col] || '';
      });
      
      // Add dimension and property columns after order info in a specific order
      const propertyColumns = ['Width', 'Length', 'Thickness', 'Side', 'Color', 'Caliber', 'Quantity'];
      propertyColumns.forEach(prop => {
        if (prop in row) {
          newRow[prop] = row[prop];
        } else {
          // Add empty placeholder if this row doesn't have this property
          newRow[prop] = '';
        }
      });
      
      // Add all remaining columns, skipping those we've already handled
      Object.keys(row).forEach(key => {
        if (key !== 'Warehouse' && 
            key !== 'Item Type' && 
            key !== 'Component' && 
            key !== 'Item' && 
            key !== 'MO Number' &&
            key !== 'Order Number' &&
            key !== 'Customer' &&
            !propertyColumns.includes(key)) {
          newRow[key] = row[key];
        }
      });
      
      return newRow;
    });
    
    // Log final column headers
    console.log('Final Excel column headers:', Object.keys(reorderedData[0] || {}));
    
    // Create a worksheet from the reordered data
    const worksheet = XLSX.utils.json_to_sheet(reorderedData);
    
    // Create column widths for better formatting
    const colWidths = [];
    Object.keys(reorderedData[0] || {}).forEach(key => {
      // Make sure order columns are wide enough
      if (key === 'Order Number' || key === 'PO Number' || key === 'Customer') {
        colWidths.push({ wch: Math.max(key.length, 18) });
      } else {
        colWidths.push({ wch: Math.max(key.length, 12) });
      }
    });
    worksheet['!cols'] = colWidths;
    
    // Create a workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Production Schedule');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save the file with appropriate name (include date)
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    saveAs(blob, `Production_Schedule_${dateStr}.xlsx`);
  };
  
  // Handle text filter changes
  const handleTextFilterChange = (filterName, value) => {
    setTextFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };
  
  // Clear a specific text filter
  const clearTextFilter = (filterName) => {
    setTextFilters(prev => ({
      ...prev,
      [filterName]: ''
    }));
  };
  
  // Clear all text filters
  const clearAllTextFilters = () => {
    setTextFilters({
      product: '',
      salesOrder: '',
      manufacturingOrder: '',
      cutDetail: '',
      segment: ''
    });
  };
  
  // Process production data to create row data - Optimization using useMemo
  const data = useMemo(() => {
    if (!productionData || typeof productionData !== 'object') {
      console.log('No valid production data available');
      return [];
    }
    
    const rowData = [];
    
    // Check if any text filters are active
    const hasActiveTextFilters = 
      textFilters.product || 
      textFilters.salesOrder || 
      textFilters.manufacturingOrder || 
      textFilters.cutDetail ||
      textFilters.segment;
      
    // Function to check if a sales order has a commitment date
    const hasCommitmentDate = (orderDetails) => {
      return orderDetails && orderDetails.compromiso && orderDetails.compromiso.trim() !== '';
    };
    
    // Function to check if we should include this order based on commitment date and toggle
    const shouldIncludeOrder = (orderDetails) => {
      // If showing all orders, include everything
      if (showNoCommitmentOrders) {
        return true;
      }
      
      // If not showing orders without commitment dates, only include those with dates
      return hasCommitmentDate(orderDetails);
    };
    
    // First level rows (warehouses) - filter by selected locations
    Object.entries(productionData)
      .filter(([warehouseName]) => selectedLocations.includes(warehouseName))
      .forEach(([warehouseName, products]) => {
        // If we have active text filters, we need to pre-check if this warehouse
        // has any products that match the filters before creating the warehouse row
        if (hasActiveTextFilters) {
          // Get products that match all active filters
          const matchingProducts = Object.entries(products).filter(([productName, productDetails]) => {
            // Product name filter
            if (textFilters.product && 
                !productName.toLowerCase().includes(textFilters.product.toLowerCase())) {
              return false;
            }
            
            // MO filter
            if (textFilters.manufacturingOrder) {
              const moFilter = textFilters.manufacturingOrder.toLowerCase();
              
              // Check MOs array
              if (productDetails.MOs && productDetails.MOs.length > 0) {
                const hasMoMatch = productDetails.MOs.some(mo => 
                  mo.name && mo.name.toLowerCase().includes(moFilter)
                );
                if (!hasMoMatch) return false;
              }
              // Check single MO
              else if (productDetails.MO && productDetails.MO.name) {
                if (!productDetails.MO.name.toLowerCase().includes(moFilter)) {
                  return false;
                }
              }
              // No MO found
              else {
                return false;
              }
            }
            
            // Sales Order filter
            if (textFilters.salesOrder) {
              const soFilter = textFilters.salesOrder.toLowerCase();
              let hasSoMatch = false;
              
              // Check MOs array for SOs
              if (productDetails.MOs && productDetails.MOs.length > 0) {
                hasSoMatch = productDetails.MOs.some(mo => 
                  mo.pedidos && Object.keys(mo.pedidos).some(key => 
                    key.toLowerCase().includes(soFilter)
                  )
                );
              }
              // Check single MO for SOs
              else if (productDetails.MO && productDetails.MO.pedidos) {
                hasSoMatch = Object.keys(productDetails.MO.pedidos).some(key => 
                  key.toLowerCase().includes(soFilter)
                );
              }
              
              if (!hasSoMatch) return false;
            }
            
            // Cut detail filter - if we're filtering by cut detail, check if any details match
            if (textFilters.cutDetail) {
              const cutDetailFilter = textFilters.cutDetail.toLowerCase();
              let hasMatchingCutDetails = false;
              
              // Check in bill_of_materials details
              if (productDetails.bill_of_materials) {
                for (const component of productDetails.bill_of_materials) {
                  if (component.details) {
                    for (const detail of component.details) {
                      if (detail.name && detail.name.toLowerCase().includes(cutDetailFilter)) {
                        hasMatchingCutDetails = true;
                        break;
                      }
                    }
                  }
                  if (hasMatchingCutDetails) break;
                }
              }
              
              // Check in direct details
              if (!hasMatchingCutDetails && productDetails.details) {
                hasMatchingCutDetails = productDetails.details.some(detail => 
                  detail.name && detail.name.toLowerCase().includes(cutDetailFilter)
                );
              }
              
              if (!hasMatchingCutDetails) return false;
            }
            
            // Segment filter - if we're filtering by segment, check if any segments match
            if (textFilters.segment) {
              const segmentFilter = textFilters.segment.toLowerCase();
              let hasMatchingSegment = false;
              
              // Check MOs array for segments
              if (productDetails.MOs && productDetails.MOs.length > 0) {
                for (const mo of productDetails.MOs) {
                  if (mo.segments && mo.segments.length > 0) {
                    // Check each segment for match against folio or name
                    for (const segment of mo.segments) {
                      // Match against segment folio (contains match)
                      if (segment.folio && segment.folio.toLowerCase().includes(segmentFilter)) {
                        hasMatchingSegment = true;
                        break;
                      }
                      
                      // Match against segment name (contains search)
                      if (segment.name && segment.name.toLowerCase().includes(segmentFilter)) {
                        hasMatchingSegment = true;
                        break;
                      }
                    }
                  }
                  if (hasMatchingSegment) break;
                }
              }
              
              // Also check single MO if it exists
              if (!hasMatchingSegment && productDetails.MO && productDetails.MO.segments) {
                const segments = Array.isArray(productDetails.MO.segments) 
                  ? productDetails.MO.segments 
                  : Object.values(productDetails.MO.segments);
                  
                hasMatchingSegment = segments.some(segment => 
                  (segment.folio && segment.folio.toLowerCase().includes(segmentFilter)) || 
                  (segment.name && segment.name.toLowerCase().includes(segmentFilter))
                );
              }
              
              if (!hasMatchingSegment) return false;
            }
            
            return true;
          });
          
          // If no products match the filters, skip this warehouse entirely
          if (matchingProducts.length === 0) {
            return;
          }
        }
        
        const warehouseRow = {
          id: `warehouse-${warehouseName}`,
          name: warehouseName,
          type: 'warehouse',
          children: []
        };
      
      // Second level rows (products) - filter by product name if filter is active
      Object.entries(products)
        .filter(([productName, productDetails]) => {
          const productFilter = textFilters.product.toLowerCase();
          
          // If product filter is active, check if product name includes the filter text
          if (productFilter && !productName.toLowerCase().includes(productFilter)) {
            return false;
          }
          
          // If we have MO filter, check if any MO matches
          const moFilter = textFilters.manufacturingOrder.toLowerCase();
          if (moFilter) {
            // Check MOs array if it exists
            if (productDetails.MOs && productDetails.MOs.length > 0) {
              const hasMoMatch = productDetails.MOs.some(mo => 
                (mo.name && mo.name.toLowerCase().includes(moFilter))
              );
              if (!hasMoMatch) return false;
            }
            // Check single MO if it exists
            else if (productDetails.MO && productDetails.MO.name) {
              if (!productDetails.MO.name.toLowerCase().includes(moFilter)) {
                return false;
              }
            }
            // No MO found that matches the filter
            else {
              return false;
            }
          }
          
          // If we have Sales Order filter, check if any SO matches
          const soFilter = textFilters.salesOrder.toLowerCase();
          if (soFilter) {
            let hasSoMatch = false;
            
            // Check MOs array for Sales Orders
            if (productDetails.MOs && productDetails.MOs.length > 0) {
              hasSoMatch = productDetails.MOs.some(mo => 
                mo.pedidos && Object.keys(mo.pedidos).some(key => 
                  key.toLowerCase().includes(soFilter)
                )
              );
            }
            // Check single MO for Sales Orders
            else if (productDetails.MO && productDetails.MO.pedidos) {
              hasSoMatch = Object.keys(productDetails.MO.pedidos).some(key => 
                key.toLowerCase().includes(soFilter)
              );
            }
            
            if (!hasSoMatch) return false;
          }
          
          // If we have Segment filter, check if any segments match
          const segmentFilter = textFilters.segment.toLowerCase();
          if (segmentFilter) {
            let hasMatchingSegment = false;
            
            // Check MOs array for segments
            if (productDetails.MOs && productDetails.MOs.length > 0) {
              for (const mo of productDetails.MOs) {
                if (mo.segments && mo.segments.length > 0) {
                  // Check each segment for match against folio or name
                  for (const segment of mo.segments) {
                    // Match against segment folio (contains match)
                    if (segment.folio && segment.folio.toLowerCase().includes(segmentFilter)) {
                      hasMatchingSegment = true;
                      break;
                    }
                    
                    // Match against segment name (contains search)
                    if (segment.name && segment.name.toLowerCase().includes(segmentFilter)) {
                      hasMatchingSegment = true;
                      break;
                    }
                  }
                }
                if (hasMatchingSegment) break;
              }
            }
            
            // Also check single MO if it exists
            if (!hasMatchingSegment && productDetails.MO && productDetails.MO.segments) {
              const segments = Array.isArray(productDetails.MO.segments) 
                ? productDetails.MO.segments 
                : Object.values(productDetails.MO.segments);
                
              hasMatchingSegment = segments.some(segment => 
                (segment.folio && segment.folio.toLowerCase().includes(segmentFilter)) || 
                (segment.name && segment.name.toLowerCase().includes(segmentFilter))
              );
            }
            
            if (!hasMatchingSegment) return false;
          }
          
          return true;
        })
        .forEach(([productName, productDetails]) => {
        // Calculate forecasted demand - if showNoCommitmentOrders is false, exclude orders without commitment dates
        let forecastedDemand = 0;
        
        if (productDetails.MOs && productDetails.MOs.length > 0) {
          // Process each MO
          productDetails.MOs.forEach(mo => {
            if (mo.pedidos) {
              // For each sales order
              Object.values(mo.pedidos).forEach(orderDetails => {
                // Use the new function to determine whether to include this order
                if (shouldIncludeOrder(orderDetails)) {
                  forecastedDemand += Number(orderDetails.cantidad) || 0;
                }
              });
            }
          });
        }
        // If there are no MOs or if forecastedDemand is still 0, use the total_qty
        if (forecastedDemand === 0) {
          forecastedDemand = productDetails.total_qty || 0;
        }
        
        const productRow = {
          id: `product-${warehouseName}-${productName}`,
          name: productName,
          type: 'product',
          parentId: warehouseRow.id,
          forecastedDemand: forecastedDemand,
          children: [],
          currentStock: productDetails.stock?.total || 0,
          stockLocations: productDetails.stock?.locations || []
        };
        
        // Third level rows (cut details if available)
        let detailsMap = new Map(); // Use a map to group details by component code
        
        // Remove excessive console logging for better performance
        // console.log("Product Details:", productName, productDetails);
        
        if (productDetails.tiene_detalle && productDetails.bill_of_materials) {
          productDetails.bill_of_materials.forEach((component, compIndex) => {
            if (component.tiene_detalle && component.details && component.details.length > 0) {
              // Extract component code from various possible locations
              // Try all possible field names that might contain the component code
              const componentCode = 
                component.codigo || 
                component.code || 
                component.item_code || 
                component.product_code || 
                (component.product && component.product.code) || 
                `Component-${compIndex}`;
              
              // console.log("Component:", compIndex, component, "Using code:", componentCode);
              
              // Initialize array for this component if needed
              if (!detailsMap.has(componentCode)) {
                detailsMap.set(componentCode, []);
              }
              
              component.details.forEach((detail, detailIndex) => {
                // Extract component name from various possible locations
                const componentName = 
                  component.nombre || 
                  component.name || 
                  component.description || 
                  component.item_name || 
                  (component.product && component.product.name) || 
                  componentCode || 
                  `Component ${compIndex + 1}`;
                
                // console.log("Detail:", detailIndex, detail);
                
                const detailRow = {
                  id: `detail-${warehouseName}-${productName}-${compIndex}-${detailIndex}`,
                  name: detail.name || `Detail ${detailIndex + 1}`,
                  type: 'detail',
                  parentId: productRow.id,
                  
                  // Detail properties
                  width: parseFloat(detail.width_cut) || 0,
                  length: parseFloat(detail.long_cut) || 0,
                  thickness: parseFloat(detail.thickness) || 0,
                  color: detail.color || null,
                  caliber: detail.caliber || 'N/A',
                  kilos: parseFloat(detail.kilos) || 0,
                  quantity: parseInt(detail.quantity, 10) || 0,
                  row: parseInt(detail.row, 10) || detailIndex + 1,
                  side: detail.side || null,
                  
                  // Add forecasted demand calculation
                  forecastedDemand: parseInt(detail.quantity, 10) * productRow.forecastedDemand || 0,
                  // Include original quantity for reference
                  originalQuantity: parseInt(detail.quantity, 10),
                  
                  // Component info
                  componentCode: componentCode,
                  componentName: componentName,
                  isComponentHeader: false
                };
                
                detailsMap.get(componentCode).push(detailRow);
              });
            }
          });
        }
        
        // If the product has direct details array rather than going through bill_of_materials
        if (productDetails.details && productDetails.details.length > 0) {
          // Check if we can group direct details by their component/product code
          const directDetailsWithCodeMap = new Map();
          
          // console.log("Direct details:", productDetails.details);
          
          // First pass - group by component/product code if available
          productDetails.details.forEach((detail, detailIndex) => {
            // Try to extract a component code from the detail itself
            const detailComponentCode = 
              detail.component_code || 
              detail.product_code || 
              detail.item_code || 
              detail.codigo || 
              (detail.component && detail.component.code) || 
              (detail.product && detail.product.code);
            
            if (detailComponentCode) {
              if (!directDetailsWithCodeMap.has(detailComponentCode)) {
                directDetailsWithCodeMap.set(detailComponentCode, []);
              }
              directDetailsWithCodeMap.get(detailComponentCode).push({detail, detailIndex});
            }
          });
          
          // Process details that have component codes
          directDetailsWithCodeMap.forEach((detailsGroup, componentCode) => {
            if (!detailsMap.has(componentCode)) {
              detailsMap.set(componentCode, []);
            }
            
            detailsGroup.forEach(({detail, detailIndex}) => {
              const componentName = 
                detail.component_name || 
                detail.product_name || 
                detail.item_name || 
                (detail.component && detail.component.name) ||
                (detail.product && detail.product.name) ||
                componentCode;
              
              const detailRow = {
                id: `direct-detail-${warehouseName}-${productName}-${componentCode}-${detailIndex}`,
                name: detail.name || `Detail ${detailIndex + 1}`,
                type: 'detail',
                parentId: productRow.id,
                
                // Detail properties
                width: parseFloat(detail.width_cut) || 0,
                length: parseFloat(detail.long_cut) || 0,
                thickness: parseFloat(detail.thickness) || 0,
                color: detail.color || null,
                caliber: detail.caliber || 'N/A',
                kilos: parseFloat(detail.kilos) || 0,
                quantity: parseInt(detail.quantity, 10) || 0,
                row: parseInt(detail.row, 10) || detailIndex + 1,
                
                // Add forecasted demand calculation
                forecastedDemand: parseInt(detail.quantity, 10) * productRow.forecastedDemand || 0,
                
                // Component info
                componentCode: componentCode,
                componentName: componentName,
                isComponentHeader: false
              };
              
              detailsMap.get(componentCode).push(detailRow);
            });
          });
          
          // Process any remaining direct details that don't have component codes
          const remainingDetails = productDetails.details.filter(detail => {
            const detailComponentCode = 
              detail.component_code || 
              detail.product_code || 
              detail.item_code || 
              detail.codigo || 
              (detail.component && detail.component.code) || 
              (detail.product && detail.product.code);
            
            return !detailComponentCode;
          });
          
          if (remainingDetails.length > 0) {
            const directComponentKey = "DirectDetails";
            
            // Initialize array for direct details if needed
            if (!detailsMap.has(directComponentKey)) {
              detailsMap.set(directComponentKey, []);
            }
            
            remainingDetails.forEach((detail, detailIndex) => {
              const detailRow = {
                id: `direct-detail-${warehouseName}-${productName}-${detailIndex}`,
                name: detail.name || `Detail ${detailIndex + 1}`,
                type: 'detail',
                parentId: productRow.id,
                
                // Detail properties
                width: parseFloat(detail.width_cut) || 0,
                length: parseFloat(detail.long_cut) || 0,
                thickness: parseFloat(detail.thickness) || 0,
                color: detail.color || null,
                caliber: detail.caliber || 'N/A',
                kilos: parseFloat(detail.kilos) || 0,
                quantity: parseInt(detail.quantity, 10) || 0,
                row: parseInt(detail.row, 10) || detailIndex + 1,
                side: detail.side || null,
                
                // Add forecasted demand calculation
                forecastedDemand: parseInt(detail.quantity, 10) * productRow.forecastedDemand || 0,
                
                // No specific component info for these
                componentCode: directComponentKey,
                componentName: "Direct Details",
                isComponentHeader: false
              };
              
              detailsMap.get(directComponentKey).push(detailRow);
            });
          }
        }
        
        // Create a flattened array of details, with component headers and sorted details
        let finalDetailsArray = [];
        
        // Process each component group
        detailsMap.forEach((details, componentCode) => {
          // Filter cut details if the filter is active
          const cutDetailFilter = textFilters.cutDetail.toLowerCase();
          if (cutDetailFilter) {
            // Create filtered copy without mutating original
            const filteredDetails = details.filter(detail => 
              detail.name && detail.name.toLowerCase().includes(cutDetailFilter)
            );
            
            // Only proceed if we have matching details after filtering
            if (filteredDetails.length === 0) {
              detailsMap.set(componentCode, []);
              return;
            }
            
            // Replace with filtered version
            detailsMap.set(componentCode, filteredDetails);
            details = filteredDetails;
          }
          
          // First sort the details within this component
          details.sort((a, b) => a.row - b.row);
          
          // Add a component header row if there's more than one component
          if (detailsMap.size > 1 && details.length > 0) {
            const headerRow = {
              id: `header-${warehouseName}-${productName}-${componentCode}`,
              name: details[0].componentName || componentCode,
              type: 'detail',
              parentId: productRow.id,
              isComponentHeader: true,
              componentCode: componentCode
            };
            
            finalDetailsArray.push(headerRow);
          }
          
          // Add the sorted detail rows for this component
          finalDetailsArray = finalDetailsArray.concat(details);
        });
        
        // Add the organized details to product's children
        productRow.children = finalDetailsArray;
        
        warehouseRow.children.push(productRow);
      });
      
      rowData.push(warehouseRow);
    });
    
    return rowData;
  }, [productionData, selectedLocations, textFilters, showNoCommitmentOrders]); // Recalculate when filters or data change
  
  // Toggle row expansion - memoized with useCallback
  const toggleRowExpansion = useCallback((rowId) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  }, []);
  
  // Toggle sub-row expansion - memoized with useCallback
  const toggleSubRowExpansion = useCallback((rowId) => {
    setExpandedSubRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  }, []);
  
  // Optimization: Add a debounce function to prevent too many state updates
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Handle cell click for editing
  const handleCellClick = (rowId, day) => {
    setEditingCell({ rowId, day });
  };
  
  // Handle cell value change with debounce
  const handleCellChange = debounce((e, rowId, day) => {
    const newValue = e.target.value;
    const cellKey = `${rowId}-${day.formattedDate}`;
    
    setCellValues(prev => ({
      ...prev,
      [cellKey]: newValue
    }));
  }, 100); // 100ms debounce
  
  // Handle cell blur to end editing
  const handleCellBlur = () => {
    setEditingCell(null);
  };
  
  // Handle cell key down (submit on Enter)
  const handleCellKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    }
  };
  
  // Get cell value - memoized to prevent rerenders
  const getCellValue = (rowId, day) => {
    const cellKey = `${rowId}-${day.formattedDate}`;
    return cellValues[cellKey] || '';
  };
  
  // Render a table cell for the grid - performance optimized
  // Using useCallback for renderCell to fix exhaustive-deps warning
  const renderCell = useCallback((row, day) => {
    const isEditing = editingCell && 
                     editingCell.rowId === row.id && 
                     editingCell.day.formattedDate === day.formattedDate;
    
    const cellKey = `${row.id}-${day.formattedDate}`;
    const value = getCellValue(row.id, day);
    
    // Determine if cell is editable - only allow product rows to be edited
    const isEditable = row.type === 'product';
    
    // Early return for non-editable cells to improve performance
    if (!isEditable && !value) {
      return (
        <td 
          key={cellKey} 
          className={`mps-cell ${day.dayOfWeek === 0 || day.dayOfWeek === 6 ? 'weekend' : ''}`}
        />
      );
    }
    
    return (
      <td 
        key={cellKey} 
        className={`mps-cell ${day.dayOfWeek === 0 || day.dayOfWeek === 6 ? 'weekend' : ''} ${isEditable ? 'editable' : ''}`}
        onClick={() => isEditable && handleCellClick(row.id, day)}
      >
        {isEditing ? (
          <input
            type="number"
            defaultValue={value} // Use defaultValue instead of value for faster input
            onChange={(e) => handleCellChange(e, row.id, day)} // Pass row.id and day to the debounced handler
            onBlur={handleCellBlur}
            onKeyDown={handleCellKeyDown}
            min="0"
            placeholder="0"
            autoFocus
            className="cell-edit-input"
          />
        ) : (
          value || ''
        )}
      </td>
    );
  }, [editingCell, getCellValue, handleCellClick, handleCellChange, handleCellBlur, handleCellKeyDown]);
  
  // Handle opening the product details modal - memoized with useCallback
  const handleShowProductDetails = useCallback((warehouseName, productName) => {
    // Trigger a custom event to show the product details modal
    const customEvent = new CustomEvent('showMpsProductDetailsModal', {
      detail: {
        warehouseName,
        productName
      }
    });
    document.dispatchEvent(customEvent);
  }, []);

  // Render the product row content - memoized with useCallback
  const renderProductRow = useCallback((row) => {
    // Extract warehouse name and product name from the row ID
    // row.id format is "product-{warehouseName}-{productName}"
    const idParts = row.id.split('-');
    const warehouseName = idParts[1];
    const productName = idParts.slice(2).join('-'); // In case product name contains hyphens
    
    return (
      <>
        <tr className="mps-product-row">
          <td className="mps-cell-toggle" onClick={() => toggleSubRowExpansion(row.id)}>
            {row.children.length > 0 ? 
              (expandedSubRows[row.id] ? <FaChevronDown /> : <FaChevronRight />) : 
              <span className="toggle-spacer"></span>
            }
          </td>
          <td className="mps-cell-name">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                {row.name}
              </div>
              <button 
                className="view-details-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleShowProductDetails(warehouseName, productName);
                }}
                style={{
                  padding: '2px 6px',
                  fontSize: '0.7em',
                  backgroundColor: '#0056b3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  marginLeft: '10px'
                }}
              >
                {t('mps.viewDetails')}
              </button>
            </div>
          </td>
          <td className="mps-cell-demand">{row.forecastedDemand}</td>
          {days.map(day => renderCell(row, day))}
        </tr>
        
        {/* Current Stock Row */}
        <tr className="mps-stock-row">
          <td></td>
          <td className="mps-cell-name stock-label">{t('mps.currentStock')}:</td>
          <td className="mps-cell-stock">{row.currentStock}</td>
          <td className="mps-cell-stock-detail" colSpan={days.length}>
            {row.stockLocations.map((loc, idx) => (
              <span key={idx} className="stock-location">
                {loc.location}: {loc.quantity}
              </span>
            ))}
          </td>
        </tr>
        
        {/* Projected Stock Row (Stock + Production Quantity with Cumulative Calculation) */}
        <tr className="mps-projected-stock-row">
          <td></td>
          <td className="mps-cell-name stock-label">{t('mps.projectedStock')} (Stock + Production):</td>
          <td className="mps-cell-stock">{row.currentStock}</td>
          {days.map((day, dayIndex) => {
            // Calculate cumulative projected stock including previous days
            let cumulativeStock = row.currentStock;
            
            // Add production from all previous days and current day
            for (let i = 0; i <= dayIndex; i++) {
              const prevDay = days[i];
              const prevCellKey = `${row.id}-${prevDay.formattedDate}`;
              const prevProductionQty = parseInt(cellValues[prevCellKey] || 0, 10);
              
              // If the parent has production on this day, calculate the cut detail production
              cumulativeStock += prevProductionQty;
            }
            
            // Get the current day's production quantity
            const cellKey = `${row.id}-${day.formattedDate}`;
            const currentDayProductionQty = parseInt(cellValues[cellKey] || 0, 10);
            
            // Skip rendering complex content for cells with no production on this specific day
            if (currentDayProductionQty === 0) {
              return (
                <td 
                  key={`proj-${cellKey}`} 
                  className={`mps-cell ${day.dayOfWeek === 0 || day.dayOfWeek === 6 ? 'weekend' : ''}`}
                  title={t('mps.cumulativeStock', { date: day.formattedDate })}
                >
                  {cumulativeStock}
                </td>
              );
            }
            
            // Special rendering for days with production to clearly show the math
            return (
              <td 
                key={`proj-${cellKey}`} 
                className={`mps-cell ${day.dayOfWeek === 0 || day.dayOfWeek === 6 ? 'weekend' : ''}`}
                title={t('mps.cumulativeStock', { date: day.formattedDate })}
              >
                {cumulativeStock} <span style={{color: '#4caf50', fontSize: '0.85em', fontWeight: 'bold'}}>(+{currentDayProductionQty})</span>
              </td>
            );
          })}
        </tr>
      </>
    );
  }, [days, expandedSubRows, cellValues, toggleSubRowExpansion, handleShowProductDetails, renderCell, t]);

  // Render a detail row - memoized with useCallback
  const renderDetailRow = useCallback((row, index, isFirstInComponent = false) => {
    // Add cellValues to dependencies to properly react to changes
    // For component header rows, render a special header
    if (row.isComponentHeader) {
      return (
        <tr className="mps-component-header">
          <td className="component-header-toggle"></td>
          <td className="mps-cell-name component-name" colSpan={days.length + 2}>
            {row.name}
          </td>
        </tr>
      );
    }
    
    // For regular detail rows
    return (
      <>
        <tr className={`mps-detail-row ${isFirstInComponent ? 'first-in-component' : ''} ${index % 2 === 0 ? 'even' : 'odd'}`}>
          <td>
            {row.row && <span className="detail-row-number">{row.row}</span>}
          </td>
          <td className="mps-cell-name detail-name">
            {row.componentCode && !row.isComponentHeader && row.componentCode !== "DirectDetails" && (
              <span className="detail-property detail-component">
                {row.componentCode}
              </span>
            )}
            <strong className="detail-name-text">{row.name}</strong>
            <div className="detail-properties" style={{width: '100%'}}>
              {row.caliber && row.caliber !== 'sc' && row.caliber !== 'N/A' && 
                <span className="detail-property">{t('mps.caliber')}: {row.caliber}</span>
              }
              {row.width > 0.01 && <span className="detail-property">{t('mps.width')}: {row.width}</span>}
              {row.length > 0.01 && <span className="detail-property">{t('mps.length')}: {row.length}</span>}
              {row.thickness > 0 && <span className="detail-property">{t('mps.thickness')}: {row.thickness}</span>}
              {row.color && <span className="detail-property detail-color">{t('mps.color')}: {row.color}</span>}
              {row.quantity > 0 && <span className="detail-property">{t('mps.quantity')}: {row.quantity}</span>}
              {row.kilos > 0 && <span className="detail-property detail-kilos">{t('mps.kilos')}: {row.kilos}</span>}
              {row.side && <span className="detail-property detail-side">{t('mps.side')}: {row.side}</span>}
            </div>
          </td>
          <td className="mps-cell-demand">
            {row.forecastedDemand}
            {row.quantity > 0 && (
              <span className="detail-calculation" style={{fontSize: '0.8em', color: '#666', display: 'block'}}>
                ({row.quantity} × {Math.round(row.forecastedDemand / row.quantity)})
              </span>
            )}
          </td>
          {days.map(day => renderCell(row, day))}
        </tr>
        
        {/* Projected Stock Row for Cut Detail */}
        <tr className="mps-projected-stock-row detail-projected-stock" style={{height: '20px'}}>
          <td></td>
          <td className="mps-cell-name stock-label" style={{fontSize: '9px', paddingLeft: '15px', fontStyle: 'italic'}}>
            {row.name} - {t('mps.projectedProduction')}:
          </td>
          <td></td>
          {days.map((day, dayIndex) => {
            // Extract the parent product ID from the row
            const parentId = row.parentId;
            // Calculate key for parent product's cell on this day
            const parentCellKey = `${parentId}-${day.formattedDate}`;
            
            // Get parent's current stock (find from data)
            const _parentProduct = data.flatMap(warehouse => warehouse.children)
              .find(product => product.id === parentId);
            
            // For cut details, we only care about production, not base stock
            // Since cut details don't have separate inventory
            
            // Start with zero for cut details - they don't have separate inventory
            let parentProjectedProduction = 0;
            
            // Add only parent's production from all previous days and this day
            for (let i = 0; i <= dayIndex; i++) {
              const prevDay = days[i];
              const parentPrevCellKey = `${parentId}-${prevDay.formattedDate}`;
              const parentPrevProductionQty = parseInt(cellValues[parentPrevCellKey] || 0, 10);
              parentProjectedProduction += parentPrevProductionQty;
            }
            
            // Calculate this detail's projected production by multiplying by its quantity
            const detailProjectedStock = row.quantity > 0 ? 
              Math.floor(parentProjectedProduction * row.quantity) : 0;
            
            // Get the parent's production quantity for this day to show the increment
            const parentProductionQty = parseInt(cellValues[parentCellKey] || 0, 10);
            const detailProductionQty = row.quantity > 0 ? 
              Math.floor(parentProductionQty * row.quantity) : 0;
            
            // Get the current day's detail production value
            const detailCurrentValue = detailProjectedStock - (detailProductionQty || 0);
            
            // Skip special rendering for cells with no production on this specific day
            if (parentProductionQty === 0) {
              return (
                <td 
                  key={`detail-proj-${row.id}-${day.formattedDate}`} 
                  className={`mps-cell detail-projected-cell ${day.dayOfWeek === 0 || day.dayOfWeek === 6 ? 'weekend' : ''}`}
                  style={{fontSize: '9px', height: '20px', padding: '2px'}}
                >
                  {detailProjectedStock !== 0 ? detailProjectedStock : ''}
                </td>
              );
            }
            
            // Special rendering for days with production to clearly show the math
            return (
              <td 
                key={`detail-proj-${row.id}-${day.formattedDate}`} 
                className={`mps-cell detail-projected-cell ${day.dayOfWeek === 0 || day.dayOfWeek === 6 ? 'weekend' : ''}`}
                style={{fontSize: '9px', height: '20px', padding: '2px'}}
              >
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                  <div>
                    <span style={{color: '#666'}}>{detailCurrentValue}</span>{' '}
                    <span style={{color: '#4caf50', fontWeight: 'bold'}}>+{detailProductionQty}</span>{' '}
                    <span style={{color: '#0056b3', fontWeight: 'bold'}}>={detailProjectedStock}</span>
                  </div>
                </div>
              </td>
            );
          })}
        </tr>
      </>
    );
  }, [days, renderCell, cellValues, data, t]);

  // Render loading state
  if (dataLoading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>{t('mps.loading')}</p>
      </div>
    );
  }

  return (
    <div className="mps-container">
      <div className="mps-header">
        <h2>{t('mps.title')}</h2>
        {productionData && (
          <div className="mps-actions">
            <button 
              className="export-button" 
              onClick={exportToExcel}
              style={{
                marginRight: '10px',
                backgroundColor: '#28a745', 
                color: 'white',
                padding: '7px 12px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <FaFileExcel /> {t('mps.export')}
            </button>
            <button 
              className="save-button" 
              onClick={saveMpsData} 
              disabled={loading}
              style={{
                backgroundColor: '#3498db', 
                color: 'white',
                padding: '7px 12px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <FaSave /> {t('mps.save')}
            </button>
            {saveStatus && <span className="save-status">{saveStatus}</span>}
          </div>
        )}
      </div>
      
      {/* Date Range Filter */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApplyFilter={fetchProductionData}
        isLoading={dataLoading}
        showNoCommitmentOrders={showNoCommitmentOrders}
        onNoCommitmentToggle={() => setShowNoCommitmentOrders(!showNoCommitmentOrders)}
        t={t}
      />
      
      {/* Error message display */}
      {error && (
        <div style={{ 
          padding: '15px', 
          marginBottom: '20px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          borderRadius: '4px',
          border: '1px solid #ef9a9a'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{error}</p>
        </div>
      )}
      
      {!productionData && !dataLoading && (
        <div style={{ 
          padding: '30px', 
          textAlign: 'center', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <h3 style={{ color: '#666', marginBottom: '15px' }}>{t('mps.noDataLoaded')}</h3>
          <p style={{ color: '#888' }}>
            {t('mps.selectDateRange')}
          </p>
        </div>
      )}
      
      {productionData && (
        <>
          {/* Filters panel */}
          <div className="mps-filters-panel" style={{ 
            margin: '10px 0',
            padding: '15px',
            backgroundColor: '#f8f9fa', 
            border: '1px solid #e2e6ea',
            borderRadius: '4px'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '10px' }}>
              <ResourceFilter
                title={t('mps.locations')}
                items={availableLocations}
                onFilterChange={handleLocationFilterChange}
                initiallyOpen={false}
              />
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '15px',
              alignItems: 'flex-end'
            }}>
              <TextFilter 
                label={t('mps.table.product')}
                value={textFilters.product}
                onChange={(value) => handleTextFilterChange('product', value)}
                placeholder={t('mps.table.searchProduct')}
                onClear={() => clearTextFilter('product')}
                t={t}
              />
              
              <TextFilter 
                label={t('mps.table.salesOrder')}
                value={textFilters.salesOrder}
                onChange={(value) => handleTextFilterChange('salesOrder', value)}
                placeholder={t('mps.table.searchOrder')}
                onClear={() => clearTextFilter('salesOrder')}
                t={t}
              />
              
              <TextFilter 
                label={t('mps.table.manufacturingOrder')} 
                value={textFilters.manufacturingOrder}
                onChange={(value) => handleTextFilterChange('manufacturingOrder', value)}
                placeholder={t('mps.table.searchMO')}
                onClear={() => clearTextFilter('manufacturingOrder')}
                t={t}
              />
              
              <TextFilter 
                label={t('mps.table.cutDetail')}
                value={textFilters.cutDetail}
                onChange={(value) => handleTextFilterChange('cutDetail', value)}
                placeholder={t('mps.table.searchCutDetail')}
                onClear={() => clearTextFilter('cutDetail')}
                t={t}
              />
              
              <TextFilter 
                label={t('mps.table.segment')}
                value={textFilters.segment}
                onChange={(value) => handleTextFilterChange('segment', value)}
                placeholder={t('mps.table.searchSegment')}
                onClear={() => clearTextFilter('segment')}
                t={t}
              />
              
              {(textFilters.product || textFilters.salesOrder || 
                textFilters.manufacturingOrder || textFilters.cutDetail || textFilters.segment) && (
                <button
                  onClick={clearAllTextFilters}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: '#f0f0f0',
                    cursor: 'pointer',
                    marginBottom: '5px'
                  }}
                >
                  {t('mps.clearFilters')}
                </button>
              )}
            </div>
          </div>
          
          {/* Production Schedule Table */}
          <div className="mps-table-container">
            <table className="mps-table">
              <thead>
                <tr>
                  <th className="mps-header-toggle"></th>
                  <th className="mps-header-name">{t('mps.item')}</th>
                  <th className="mps-header-demand">{t('mps.forecastedDemand')}</th>
                  {days.map(day => (
                    <th 
                      key={day.formattedDate} 
                      className={`mps-header-day ${day.dayOfWeek === 0 || day.dayOfWeek === 6 ? 'weekend' : ''}`}
                    >
                      {day.formattedDate}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(warehouse => (
                  <React.Fragment key={warehouse.id}>
                    {/* Warehouse row */}
                    <tr className="mps-warehouse-row">
                      <td className="mps-cell-toggle" onClick={() => toggleRowExpansion(warehouse.id)}>
                        {expandedRows[warehouse.id] ? <FaChevronDown /> : <FaChevronRight />}
                      </td>
                      <td className="mps-cell-name" colSpan={days.length + 2}>{warehouse.name}</td>
                    </tr>
                    
                    {/* Product rows */}
                    {expandedRows[warehouse.id] && warehouse.children.map(product => (
                      <React.Fragment key={product.id}>
                        {renderProductRow(product)}
                        
                        {/* Detail rows */}
                        {expandedSubRows[product.id] && (() => {
                          let currentComponent = null;
                          let isFirstInComponent = false;
                          
                          return product.children.map((detail, index) => {
                            // Check if this is a new component group
                            if (detail.componentCode !== currentComponent) {
                              currentComponent = detail.componentCode;
                              isFirstInComponent = !detail.isComponentHeader; // Only mark as first if it's not a header
                            } else {
                              isFirstInComponent = false;
                            }
                            
                            return (
                              <React.Fragment key={detail.id}>
                                {renderDetailRow(detail, index, isFirstInComponent)}
                              </React.Fragment>
                            );
                          });
                        })()}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      
      {/* Product Details Modal */}
      {showProductDetailsModal && selectedProductDetails && (
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
              cursor: 'pointer'
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.25rem', 
                color: '#0056b3',
                fontWeight: 600
              }}>
                {t('mps.productDetails')} {selectedProductDetails.productName}
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
              {/* Controls for expand/collapse */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: '15px',
                backgroundColor: '#f8f9fa',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e2e6ea'
              }}>
                <button 
                  style={{ 
                    backgroundColor: '#e7f1ff', 
                    color: '#0056b3',
                    border: '1px solid #b8daff', 
                    borderRadius: '3px', 
                    padding: '5px 10px', 
                    fontSize: '0.8em', 
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    margin: '0 5px',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    // Expand all sections in the modal
                    document.querySelectorAll('.modal-section-content').forEach(el => {
                      el.style.display = 'block';
                    });
                    document.querySelectorAll('.modal-section-icon').forEach(el => {
                      el.textContent = '▼';
                    });
                  }}
                >
                  {t('mps.expandAll')}
                </button>
                <button 
                  style={{ 
                    backgroundColor: '#f8f9fa', 
                    color: '#6c757d',
                    border: '1px solid #dae0e5', 
                    borderRadius: '3px', 
                    padding: '5px 10px', 
                    fontSize: '0.8em', 
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    margin: '0 5px',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    // Collapse all sections in the modal
                    document.querySelectorAll('.modal-section-content').forEach(el => {
                      el.style.display = 'none';
                    });
                    document.querySelectorAll('.modal-section-icon').forEach(el => {
                      el.textContent = '►';
                    });
                  }}
                >
                  {t('mps.collapseAll')}
                </button>
              </div>
              
              {/* Manufacturing Orders Section */}
              <div className="product-details-section" style={{
                marginBottom: '20px',
                border: '1px solid #d0e3ff',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div 
                  className="section-header" 
                  style={{
                    backgroundColor: '#e6f0ff',
                    padding: '12px 15px',
                    fontWeight: 'bold',
                    color: '#0056b3',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const content = document.getElementById('mo-section-content');
                    const icon = document.getElementById('mo-section-icon');
                    if (content && icon) {
                      const currentDisplay = window.getComputedStyle(content).display;
                      content.style.display = currentDisplay === 'none' ? 'block' : 'none';
                      icon.textContent = currentDisplay === 'none' ? '▼' : '►';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: '#0056b3',
                      color: 'white',
                      fontSize: '0.7em',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      marginRight: '8px'
                    }}>{t('mps.mo')}</span>
                    {t('mps.manufacturingOrders')}
                  </div>
                  <span 
                    id="mo-section-icon" 
                    className="modal-section-icon" 
                    style={{ 
                      fontWeight: 'bold', 
                      fontSize: '0.8em', 
                      color: '#0056b3' 
                    }}
                  >
                    ▼
                  </span>
                </div>
                
                <div 
                  id="mo-section-content" 
                  className="modal-section-content" 
                  style={{ padding: '15px' }}
                >
                  {/* Segments Section directly in the main MO section */}
                  {console.log("%c PRODUCT DETAILS MODAL OPENING", "background: #007bff; color: white; font-size: 14px; padding: 5px 10px; border-radius: 4px; margin: 10px 0;")}
                  {console.table(selectedProductDetails.MOs ? 
                    selectedProductDetails.MOs.map(mo => ({
                      "MO Name": mo.name, 
                      "Has Segments": mo.segments ? "YES" : "NO",
                      "Segments Type": mo.segments ? typeof mo.segments : "N/A",
                      "Is Array": mo.segments ? Array.isArray(mo.segments) : "N/A",
                      "Length": mo.segments ? (Array.isArray(mo.segments) ? mo.segments.length : "Not an array") : "N/A"
                    })) : 
                    "No MOs found"
                  )}
                  
                  {/* Segments sections removed from here - they are now shown within each MO section */}
                  
                  {(selectedProductDetails.MOs && selectedProductDetails.MOs.length > 0) || selectedProductDetails.MO ? (
                    <div>
                      {/* Handle multiple MOs case */}
                      {selectedProductDetails.MOs && selectedProductDetails.MOs.length > 0 && 
                        selectedProductDetails.MOs.map((mo, index) => {
                          // Fix segments if needed (convert from object to array)
                          if (mo.segments && !Array.isArray(mo.segments)) {
                            if (typeof mo.segments === 'object') {
                              mo.segments = Object.values(mo.segments);
                            } else {
                              try {
                                mo.segments = JSON.parse(mo.segments);
                                if (!Array.isArray(mo.segments)) {
                                  mo.segments = Object.values(mo.segments);
                                }
                              } catch (e) {
                                console.error(`Error parsing segments for ${mo.name}:`, e);
                                mo.segments = [];
                              }
                            }
                          }
                          
                          const moSectionId = `mo-${index}-details`;
                          return (
                            <div key={mo.name || index} style={{
                              border: '1px solid #e9ecef',
                              borderRadius: '4px',
                              marginBottom: '10px',
                              overflow: 'hidden'
                            }}>
                              <div 
                                style={{
                                  backgroundColor: '#f8f9fa',
                                  padding: '10px',
                                  fontWeight: 'bold',
                                  color: '#0056b3',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #e9ecef'
                                }}
                                onClick={() => {
                                  const content = document.getElementById(moSectionId);
                                  const icon = document.getElementById(`${moSectionId}-icon`);
                                  if (content && icon) {
                                    const currentDisplay = window.getComputedStyle(content).display;
                                    content.style.display = currentDisplay === 'none' ? 'block' : 'none';
                                    icon.textContent = currentDisplay === 'none' ? '▼' : '►';
                                  }
                                }}
                              >
                                <div>
                                  {mo.name || `Manufacturing Order ${index + 1}`}
                                </div>
                                <span 
                                  id={`${moSectionId}-icon`} 
                                  className="modal-section-icon" 
                                  style={{ 
                                    fontWeight: 'bold', 
                                    fontSize: '0.8em', 
                                    color: '#0056b3' 
                                  }}
                                >
                                  ▼
                                </span>
                              </div>
                              
                              <div id={moSectionId} className="modal-section-content" style={{ padding: '10px' }}>
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
                                    <strong>{t('mps.status')}: </strong> {mo.state || 'Unknown'}
                                  </span>
                                  
                                  <span style={{
                                    backgroundColor: '#e9ecef',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.85em'
                                  }}>
                                    <strong>{t('mps.quantity')}: </strong> {mo.product_qty || '0'} {selectedProductDetails.uom || 'Units'}
                                  </span>
                                </div>
                                
                                {/* Segments Section */}
                                {mo.segments && mo.segments.length > 0 && (
                                  <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                                    <div 
                                      style={{
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                        padding: '5px',
                                        backgroundColor: '#e6f0ff',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => toggleSegmentSection(mo.id, mo.name)}
                                    >
                                      <div style={{
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
                                        }}>{t('mps.segments')}</span>
                                        {t('mps.segments')}
                                      </div>
                                      <span 
                                        id={`segments-${mo.id}-${mo.name}-icon`}
                                        className="modal-section-icon" 
                                        style={{ 
                                          fontWeight: 'bold', 
                                          fontSize: '0.8em', 
                                          color: '#0056b3' 
                                        }}
                                      >
                                        ▼
                                      </span>
                                    </div>
                                    
                                    <div 
                                      id={`segments-${mo.id}-${mo.name}`}
                                      className="modal-section-content" 
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                      }}
                                    >
                                      {/* Display the second segment if available, otherwise the first */}
                                      {(() => {
                                        // Choose the second segment if available, otherwise the first
                                        const segment = mo.segments.length > 1 ? mo.segments[1] : mo.segments[0];
                                        return (
                                          <div style={{
                                            backgroundColor: '#e9ecef',
                                            padding: '5px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.85em',
                                            borderLeft: '3px solid #007bff'
                                          }}>
                                            <div style={{ fontWeight: '500', color: '#0056b3' }}>
                                              {segment.name || 'Unnamed Segment'}
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                                              {segment.state && (
                                                <span style={{ backgroundColor: '#f8fbff', padding: '2px 6px', borderRadius: '3px', fontSize: '0.8em' }}>
                                                  <strong>{t('mps.status')}: </strong> {segment.state}
                                                </span>
                                              )}
                                              
                                              {segment.folio && (
                                                <span style={{ backgroundColor: '#f8fbff', padding: '2px 6px', borderRadius: '3px', fontSize: '0.8em' }}>
                                                  <strong>{t('mps.folio')}: </strong> {segment.folio}
                                                </span>
                                              )}
                                              
                                              {segment.date && (
                                                <span style={{ backgroundColor: '#f8fbff', padding: '2px 6px', borderRadius: '3px', fontSize: '0.8em' }}>
                                                  <strong>{t('mps.date')}: </strong> {new Date(segment.date).toLocaleDateString()}
                                                </span>
                                              )}
                                              
                                              {segment.qty_segmented !== undefined && (
                                                <span style={{ backgroundColor: '#f8fbff', padding: '2px 6px', borderRadius: '3px', fontSize: '0.8em' }}>
                                                  <strong>{t('mps.quantity')}: </strong> {segment.qty_segmented}
                                                </span>
                                              )}
                                              
                                              {segment.express && (
                                                <span style={{ backgroundColor: '#ffedee', padding: '2px 6px', borderRadius: '3px', fontSize: '0.8em', color: '#dc3545' }}>
                                                  <strong>{t('mps.express')}</strong>
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Sales Orders */}
                                {mo.pedidos && Object.keys(mo.pedidos).length > 0 && (
                                  <div style={{ marginTop: '10px' }}>
                                    {/* Sales Orders Header */}
                                    <div 
                                      style={{
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                        padding: '5px',
                                        backgroundColor: '#e6f0ff',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => {
                                        const content = document.getElementById(`orders-${moSectionId}`);
                                        const icon = document.getElementById(`orders-${moSectionId}-icon`);
                                        if (content && icon) {
                                          const currentDisplay = window.getComputedStyle(content).display;
                                          content.style.display = currentDisplay === 'none' ? 'block' : 'none';
                                          icon.textContent = currentDisplay === 'none' ? '▼' : '►';
                                        }
                                      }}
                                    >
                                      <div style={{
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
                                        }}>{t('mps.so')}</span>
                                        {t('mps.relatedSalesOrders')}
                                      </div>
                                      <span 
                                        id={`orders-${moSectionId}-icon`} 
                                        className="modal-section-icon" 
                                        style={{ 
                                          fontWeight: 'bold', 
                                          fontSize: '0.8em', 
                                          color: '#0056b3' 
                                        }}
                                      >
                                        ▼
                                      </span>
                                    </div>
                                    
                                    {/* Sales Orders Content */}
                                    <div 
                                      id={`orders-${moSectionId}`} 
                                      className="modal-section-content" 
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                      }}
                                    >
                                      {Object.entries(mo.pedidos).map(([orderNumber, orderDetails]) => {
                                        const orderDetailId = `order-${orderNumber}-${moSectionId}`;
                                        return (
                                          <div key={orderNumber} style={{
                                            border: '1px solid #e9ecef',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            marginBottom: '5px'
                                          }}>
                                            {/* Order Header */}
                                            <div 
                                              style={{
                                                backgroundColor: '#f8fbff',
                                                padding: '8px',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #e9ecef'
                                              }}
                                              onClick={() => {
                                                const content = document.getElementById(orderDetailId);
                                                const icon = document.getElementById(`${orderDetailId}-icon`);
                                                if (content && icon) {
                                                  const currentDisplay = window.getComputedStyle(content).display;
                                                  content.style.display = currentDisplay === 'none' ? 'block' : 'none';
                                                  icon.textContent = currentDisplay === 'none' ? '▼' : '►';
                                                }
                                              }}
                                            >
                                              <div>
                                                {orderNumber} - {orderDetails.partner || 'Unknown Customer'}
                                              </div>
                                              <span 
                                                id={`${orderDetailId}-icon`} 
                                                className="modal-section-icon" 
                                                style={{ 
                                                  fontWeight: 'bold', 
                                                  fontSize: '0.8em', 
                                                  color: '#0056b3' 
                                                }}
                                              >
                                                ▼
                                              </span>
                                            </div>
                                            
                                            {/* Order Details */}
                                            <div id={orderDetailId} className="modal-section-content" style={{ padding: '8px' }}>
                                              <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '5px',
                                                marginBottom: '8px'
                                              }}>
                                                <span style={{
                                                  backgroundColor: '#e9ecef',
                                                  padding: '2px 6px',
                                                  borderRadius: '3px',
                                                  fontSize: '0.8em'
                                                }}>
                                                  <strong>{t('mps.quantity')}: </strong> {orderDetails.cantidad || '0'}
                                                </span>
                                                
                                                {orderDetails.compromiso && (
                                                  <span style={{
                                                    backgroundColor: '#e9ecef',
                                                    padding: '2px 6px',
                                                    borderRadius: '3px',
                                                    fontSize: '0.8em'
                                                  }}>
                                                    <strong>{t('mps.commitment')}: </strong> {new Date(orderDetails.compromiso).toLocaleDateString()}
                                                  </span>
                                                )}
                                                
                                                {orderDetails.prioridad && (
                                                  <span style={{
                                                    backgroundColor: '#e9ecef',
                                                    padding: '2px 6px',
                                                    borderRadius: '3px',
                                                    fontSize: '0.8em'
                                                  }}>
                                                    <strong>{t('mps.priority')}: </strong> {orderDetails.prioridad}
                                                  </span>
                                                )}
                                              </div>
                                              
                                              {/* Products from sales order line */}
                                              {orderDetails.sale_line_products && orderDetails.sale_line_products.length > 0 && (
                                                <div style={{ marginTop: '8px' }}>
                                                  <div style={{
                                                    fontWeight: 'bold',
                                                    fontSize: '0.85em',
                                                    marginBottom: '5px',
                                                    color: '#0056b3'
                                                  }}>
                                                    {t('mps.lineProducts')}
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
                                                        <strong>{product.product_name}</strong> - {t('mps.quantity')}: {product.product_qty}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      }
                      
                      {/* Handle single MO case (for backward compatibility) */}
                      {selectedProductDetails.MO && (
                        <div style={{
                          border: '1px solid #e9ecef',
                          borderRadius: '4px',
                          marginBottom: '10px',
                          overflow: 'hidden'
                        }}>
                          <div 
                            style={{
                              backgroundColor: '#f8f9fa',
                              padding: '10px',
                              fontWeight: 'bold',
                              color: '#0056b3',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              borderBottom: '1px solid #e9ecef'
                            }}
                            onClick={() => {
                              const content = document.getElementById('single-mo-details');
                              const icon = document.getElementById('single-mo-details-icon');
                              if (content && icon) {
                                const currentDisplay = window.getComputedStyle(content).display;
                                content.style.display = currentDisplay === 'none' ? 'block' : 'none';
                                icon.textContent = currentDisplay === 'none' ? '▼' : '►';
                              }
                            }}
                          >
                            <div>
                              {selectedProductDetails.MO.name || 'Manufacturing Order'}
                            </div>
                            <span 
                              id="single-mo-details-icon" 
                              className="modal-section-icon" 
                              style={{ 
                                fontWeight: 'bold', 
                                fontSize: '0.8em', 
                                color: '#0056b3' 
                              }}
                            >
                              ▼
                            </span>
                          </div>
                          
                          <div id="single-mo-details" className="modal-section-content" style={{ padding: '10px' }}>
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
                                <strong>{t('mps.status')}: </strong> {selectedProductDetails.MO.state || 'Unknown'}
                              </span>
                              
                              <span style={{
                                backgroundColor: '#e9ecef',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85em'
                              }}>
                                <strong>{t('mps.quantity')}: </strong> {selectedProductDetails.MO.product_qty || '0'} {selectedProductDetails.uom || 'Units'}
                              </span>
                            </div>
                            
                            {/* Sales Orders for single MO */}
                            {selectedProductDetails.MO.pedidos && 
                            Object.keys(selectedProductDetails.MO.pedidos).length > 0 && (
                              <div style={{ marginTop: '10px' }}>
                                {/* Sales Orders Header */}
                                <div 
                                  style={{
                                    fontWeight: 'bold',
                                    marginBottom: '8px',
                                    padding: '5px',
                                    backgroundColor: '#e6f0ff',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    const content = document.getElementById('single-mo-orders');
                                    const icon = document.getElementById('single-mo-orders-icon');
                                    if (content && icon) {
                                      const currentDisplay = window.getComputedStyle(content).display;
                                      content.style.display = currentDisplay === 'none' ? 'block' : 'none';
                                      icon.textContent = currentDisplay === 'none' ? '▼' : '►';
                                    }
                                  }}
                                >
                                  <div style={{
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
                                    }}>{t('mps.so')}</span>
                                    {t('mps.relatedSalesOrders')}
                                  </div>
                                  <span 
                                    id="single-mo-orders-icon" 
                                    className="modal-section-icon" 
                                    style={{ 
                                      fontWeight: 'bold', 
                                      fontSize: '0.8em', 
                                      color: '#0056b3' 
                                    }}
                                  >
                                    ▼
                                  </span>
                                </div>
                                
                                {/* Sales Orders Content */}
                                <div 
                                  id="single-mo-orders" 
                                  className="modal-section-content" 
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                  }}
                                >
                                  {Object.entries(selectedProductDetails.MO.pedidos).map(([orderNumber, orderDetails]) => {
                                    const orderDetailId = `order-${orderNumber}-single-mo`;
                                    return (
                                      <div key={orderNumber} style={{
                                        border: '1px solid #e9ecef',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                        marginBottom: '5px'
                                      }}>
                                        {/* Order Header */}
                                        <div 
                                          style={{
                                            backgroundColor: '#f8fbff',
                                            padding: '8px',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid #e9ecef'
                                          }}
                                          onClick={() => {
                                            const content = document.getElementById(orderDetailId);
                                            const icon = document.getElementById(`${orderDetailId}-icon`);
                                            if (content && icon) {
                                              const currentDisplay = window.getComputedStyle(content).display;
                                              content.style.display = currentDisplay === 'none' ? 'block' : 'none';
                                              icon.textContent = currentDisplay === 'none' ? '▼' : '►';
                                            }
                                          }}
                                        >
                                          <div>
                                            {orderNumber} - {orderDetails.partner || 'Unknown Customer'}
                                          </div>
                                          <span 
                                            id={`${orderDetailId}-icon`} 
                                            className="modal-section-icon" 
                                            style={{ 
                                              fontWeight: 'bold', 
                                              fontSize: '0.8em', 
                                              color: '#0056b3' 
                                            }}
                                          >
                                            ▼
                                          </span>
                                        </div>
                                        
                                        {/* Order Details */}
                                        <div id={orderDetailId} className="modal-section-content" style={{ padding: '8px' }}>
                                          <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '5px',
                                            marginBottom: '8px'
                                          }}>
                                            <span style={{
                                              backgroundColor: '#e9ecef',
                                              padding: '2px 6px',
                                              borderRadius: '3px',
                                              fontSize: '0.8em'
                                            }}>
                                              <strong>{t('mps.quantity')}: </strong> {orderDetails.cantidad || '0'}
                                            </span>
                                            
                                            {orderDetails.compromiso ? (
                                              <span style={{
                                                backgroundColor: '#e9ecef',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                fontSize: '0.8em'
                                              }}>
                                                <strong>{t('mps.commitment')}: </strong> {new Date(orderDetails.compromiso).toLocaleDateString()}
                                              </span>
                                            ) : (
                                              <span style={{
                                                backgroundColor: '#ffebee',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                fontSize: '0.8em',
                                                color: '#c62828'
                                              }}>
                                                <strong>{t('mps.noCommitment')}</strong>
                                              </span>
                                            )}
                                            
                                            {orderDetails.prioridad && (
                                              <span style={{
                                                backgroundColor: '#e9ecef',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                fontSize: '0.8em'
                                              }}>
                                                <strong>{t('mps.priority')}: </strong> {orderDetails.prioridad}
                                              </span>
                                            )}
                                          </div>
                                          
                                          {/* Products from sales order line */}
                                          {orderDetails.sale_line_products && orderDetails.sale_line_products.length > 0 && (
                                            <div style={{ marginTop: '8px' }}>
                                              <div style={{
                                                fontWeight: 'bold',
                                                fontSize: '0.85em',
                                                marginBottom: '5px',
                                                color: '#0056b3'
                                              }}>
                                                {t('mps.lineProducts')}
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
                                                    <strong>{product.product_name}</strong> - {t('mps.quantity')}: {product.product_qty}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{padding: '10px', color: '#6c757d', fontStyle: 'italic'}}>
                      {t('mps.noManufacturingOrders')}
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
                {t('mps.close')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal animation styles */}
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
        `}
      </style>
    </div>
  );
};

export default MpsSchedule;
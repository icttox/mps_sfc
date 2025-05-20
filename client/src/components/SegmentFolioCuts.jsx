import React, { useState, useEffect, useCallback } from 'react';
import { FaSearch, FaTimes, FaFileExcel, FaSpinner, FaFilter, FaMapMarkerAlt, FaTable, FaInfoCircle, FaFilePdf, FaPrint } from 'react-icons/fa';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useTranslation } from 'react-i18next';

// Text filter component for searching
const TextFilter = ({ label, value, onChange, placeholder, onClear }) => {
  const { t } = useTranslation();
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
          placeholder={placeholder || t('sfc.search.placeholder')}
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

const SegmentFolioCuts = () => {
  const { t } = useTranslation();
  // State for search parameters and results
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);
  
  // State for filtering cut details
  const [segmentDetails, setSegmentDetails] = useState([]);
  const [filteredDetails, setFilteredDetails] = useState([]);
  const [filters, setFilters] = useState({
    folio: '',
    production: '',
    order: '',
    product_code: ''
  });
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Agregar estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(500);

  // Estado para ubicaciones
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Handle search for segment folios
  const handleSearch = useCallback(async (searchTerm) => {
    setIsSearching(true);
    try {
      const response = await axios.get(`/api/segment/search-folios?folio=${encodeURIComponent(searchTerm)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching segment folios:', error);
      alert('Error searching for segment folios. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2) {
        handleSearch(searchTerm);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, handleSearch]);
  
  // Clear search results if search term is cleared
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
    }
  }, [searchTerm]);
  
  // We don't load all data on initial load anymore
  // The user will need to select a location and click the filter button
  
  // Fetch segment details when a segment is selected
  const fetchSegmentDetails = async (segmentId = null) => {
    setIsLoading(true);
    try {
      let url = '/api/segment/sfc';
      const params = new URLSearchParams();
      
      if (segmentId) {
        params.append('ids', segmentId);
      }
      if (selectedLocation) {
        params.append('location', selectedLocation);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url);
      setSegmentDetails(response.data);
      setFilteredDetails(response.data);
      if (segmentId === null) {
        setSelectedSegment({ folio: 'Recent Segments', name: 'All active segments', state: 'active' });
      }
    } catch (error) {
      console.error('Error fetching segment details:', error);
      alert('Error fetching segment details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle location change
  const handleLocationChange = (location) => {
    setSelectedLocation(location);
  };

  // Función para aplicar filtro por ubicación
  const handleLocationFilter = async () => {
    if (!selectedLocation) {
      alert('Please select a location first');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Filtering by location:', selectedLocation);
      const response = await axios.get('/api/segment/sfc', {
        params: {
          location: selectedLocation
        }
      });
      console.log('Response data:', response.data);
      setSegmentDetails(response.data);
      setFilteredDetails(response.data);
      setCurrentPage(1); // Reset to first page
      
      // Always set selectedSegment to display the table even if empty
      setSelectedSegment({ 
        folio: `Location: ${selectedLocation}`, 
        name: `Segments in ${selectedLocation}`, 
        state: 'active' 
      });
    } catch (error) {
      console.error('Error details:', error.response?.data || error.message);
      
      // For 404 responses (no data), set empty arrays but still show UI
      if (error.response?.status === 404) {
        setSegmentDetails([]);
        setFilteredDetails([]);
        // Still set selectedSegment to display empty table
        setSelectedSegment({ 
          folio: `Location: ${selectedLocation}`, 
          name: `No segments found in ${selectedLocation}`, 
          state: 'active' 
        });
      } else {
        alert('Error getting segments. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle segment selection
  const handleSegmentSelect = (segment) => {
    setSelectedSegment(segment);
    fetchSegmentDetails(segment.id);
    setSearchTerm(''); // Clear search term after selection
    setSearchResults([]); // Clear search results after selection
    
    // Reset filters
    setFilters({
      folio: '',
      production: '',
      order: '',
      product_code: ''
    });
  };
  
  // Apply filters to segment details
  useEffect(() => {
    if (!segmentDetails.length) return;
    
    const filtered = segmentDetails.filter(detail => {
      const folioMatch = !filters.folio || (detail.folio && detail.folio.toLowerCase().includes(filters.folio.toLowerCase()));
      const productionMatch = !filters.production || (detail.production && detail.production.toLowerCase().includes(filters.production.toLowerCase()));
      const orderMatch = !filters.order || (detail.order && detail.order.toLowerCase().includes(filters.order.toLowerCase()));
      const productCodeMatch = !filters.product_code || (detail.product_code && detail.product_code.toLowerCase().includes(filters.product_code.toLowerCase()));
      
      return folioMatch && productionMatch && orderMatch && productCodeMatch;
    });
    
    setFilteredDetails(filtered);
  }, [segmentDetails, filters]);
  
  // Cargar ubicaciones al inicio
  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const response = await axios.get('/api/segment/locations');
        setLocations(response.data);
      } catch (error) {
        console.error('Error fetching locations:', error);
        alert('Error loading locations. Please try again.');
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  // Calcular índices de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDetails.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDetails.length / itemsPerPage);

  // Función para cambiar de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  // Mostrar información de paginación
  const getPaginationInfo = () => {
    const total = filteredDetails.length;
    const start = indexOfFirstItem + 1;
    const end = Math.min(indexOfLastItem, total);
    return t('sfc.table.showing', { start, end, total });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      folio: '',
      production: '',
      order: '',
      product_code: ''
    });
    // Don't clear location or refetch data, just clear the detailed filters
    // This will keep the current location-filtered data but remove any additional filters
  };
  
  // Export to Excel
  const exportToExcel = () => {
    if (filteredDetails.length === 0) return;
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(filteredDetails.map(detail => ({
      Folio: detail.folio,
      Ubicación: detail.location,
      Segmento: detail.segment_name,
      Estado: detail.state,
      Producción: detail.production,
      Orden: detail.order,
      Cantidad: detail.product_qty,
      'Código Producto': detail.product_code,
      Producto: detail.product,
      Color: detail.color,
      Espesor: detail.thickness,
      Lado: detail.side,
      Ancho: detail.width_cut,
      Largo: detail.long_cut
    })));
    
    // Auto-size columns
    const maxWidths = [15, 20, 20, 15, 20, 20, 10, 15, 30, 20, 10, 10, 10, 10];
    const cols = maxWidths.map(w => ({ wch: w }));
    worksheet['!cols'] = cols;
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Segment Details');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save file
    const fileName = `segment_folio_cuts_${selectedSegment?.folio || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(data, fileName);
  };
  
  const generatePdf = (item) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const headerTotalWidth = 40 + 160 + 70;
    const headerTableX = (pageWidth - headerTotalWidth) / 2;
    const headerTableY = 15;
    const headerRowHeight = 10;

    const col1Width = 40;  
    const col2Width = 160; 
    const col3Width = 70;  

    doc.setFontSize(22); 
    doc.setFont('helvetica', 'bold');

    const gebesaX = headerTableX + (col1Width/2);
    const gebesaY = headerTableY + headerRowHeight + 2;
    doc.text('Gebesa', gebesaX, gebesaY, { align: 'center' });

    doc.setFontSize(11); 
    const titleX = headerTableX + col1Width + (col2Width/2);
    doc.text('Etiqueta Control del Producto de Melamina', titleX, headerTableY + 5, { align: 'center' });
    
    const code1X = headerTableX + col1Width + (col2Width/4);
    const code2X = headerTableX + col1Width + (col2Width * 3/4);
    doc.text('Código: F-PRO-14', code1X, headerTableY + headerRowHeight + 5, { align: 'center' });
    doc.text('Deriva de: P-PRO-01', code2X, headerTableY + headerRowHeight + 5, { align: 'center' });

    const revX = headerTableX + col1Width + col2Width + (col3Width/2);
    doc.text('Rev: 0', revX, headerTableY + 5, { align: 'center' });
    doc.text('Fecha de Revisión: 01/11/2024', revX, headerTableY + headerRowHeight + 5, { align: 'center' });

    doc.line(headerTableX, headerTableY, headerTableX + headerTotalWidth, headerTableY); 
    doc.line(headerTableX + col1Width, headerTableY + headerRowHeight, headerTableX + headerTotalWidth, headerTableY + headerRowHeight); 
    doc.line(headerTableX, headerTableY + (headerRowHeight * 2), headerTableX + headerTotalWidth, headerTableY + (headerRowHeight * 2)); 

    doc.line(headerTableX, headerTableY, headerTableX, headerTableY + (headerRowHeight * 2)); 
    doc.line(headerTableX + col1Width, headerTableY, headerTableX + col1Width, headerTableY + (headerRowHeight * 2)); 
    doc.line(headerTableX + col1Width + col2Width, headerTableY, headerTableX + col1Width + col2Width, headerTableY + (headerRowHeight * 2)); // Antes de REV
    doc.line(headerTableX + headerTotalWidth, headerTableY, headerTableX + headerTotalWidth, headerTableY + (headerRowHeight * 2)); // Derecha

    doc.line(headerTableX + col1Width + (col2Width/2), headerTableY + headerRowHeight, headerTableX + col1Width + (col2Width/2), headerTableY + (headerRowHeight * 2));

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    

    const infoWidth = 300;
    const startInfoX = (pageWidth - infoWidth) / 2 + 40;
    const middleX = startInfoX + 130;
    let y = 42;
    const lineSpacing = 8;
    
    doc.text('FECHA:', startInfoX, y);
    const today = new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.setFont('helvetica', 'normal');
    doc.text(today, startInfoX + 18, y);
    doc.setFont('helvetica', 'bold');
    
    doc.text('COLOR:', middleX, y);
    const colorValue = item.color || "";
    doc.setFont('helvetica', 'normal');
    doc.text(colorValue, middleX + 18, y);
    doc.setFont('helvetica', 'bold');
    
    y += lineSpacing;
    doc.text('LISTADO:', startInfoX, y);
    const listadoValue = item.segment_name || "";
    doc.setFont('helvetica', 'normal');
    doc.text(listadoValue, startInfoX + 22, y);
    doc.setFont('helvetica', 'bold');
    
    doc.text('GROSOR:', middleX, y);
    const thicknessValue = item.thickness ? item.thickness.toString() : "";
    doc.setFont('helvetica', 'normal');
    doc.text(thicknessValue, middleX + 22, y);
    doc.setFont('helvetica', 'bold');
    
    y += lineSpacing;
    doc.text('PEDIDO:', startInfoX, y);
    const orderValue = item.order || "";
    doc.setFont('helvetica', 'normal');
    doc.text(orderValue, startInfoX + 20, y);
    doc.setFont('helvetica', 'bold');
    
    doc.text('PIEZAS:', middleX, y);
    const piecesValue = item.product_qty ? item.product_qty.toString() : "";
    doc.setFont('helvetica', 'normal');
    doc.text(piecesValue, middleX + 18, y);
    doc.setFont('helvetica', 'bold');

    y += lineSpacing;
    doc.text('SEGMENTO:', startInfoX, y);
    const whiteValue = item.folio || "";
    doc.setFont('helvetica', 'normal');
    doc.text(whiteValue, startInfoX + 28, y);
    doc.setFont('helvetica', 'bold');

    doc.text('CARAS:', middleX, y);
    const carasValue = item.side ? item.side.toString() : "";
    doc.setFont('helvetica', 'normal');
    doc.text(carasValue, middleX + 18, y);
    doc.setFont('helvetica', 'bold');
    
    y += lineSpacing;
    doc.text('DESCRIPCIÓN:', startInfoX, y);
    const productCode = item.product_code || "";
    const productName = item.product || "";
    const descriptionValue = `[${productCode}] ${productName}`;
    doc.setFont('helvetica', 'normal');
    doc.text(descriptionValue, startInfoX + 33, y);
    doc.setFont('helvetica', 'bold');

    const tableWidth = 45 * 6; 
    const startX = (pageWidth - tableWidth) / 2; 
    const startY = y + 15;
    const colWidth = 45;
    const rowHeight = 20;
    
    for (let i = 0; i <= 6; i++) {
      const x = startX + (colWidth * i);
      doc.line(x, startY, x, startY + (rowHeight * 4));
    }
    
    for (let i = 0; i <= 4; i++) {
      const y = startY + (rowHeight * i);
      doc.line(startX, y, startX + (colWidth * 6), y);
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const headers = [
      { text: 'ÁREA', x: startX + (colWidth/2) },
      { text: 'Laminado', x: startX + (colWidth * 1.5) },
      { text: 'Corte', x: startX + (colWidth * 2.5) },
      { text: 'Chapeado', x: startX + (colWidth * 3.5) },
      { text: 'T.M.', x: startX + (colWidth * 4.5) },
      { text: 'Materialista', x: startX + (colWidth * 5.5) }
    ];
    
    headers.forEach(header => {
      doc.text(header.text, header.x, startY + 15, { align: 'center' });
    });
    
    doc.text('FIRMA', startX + (colWidth/2), startY + rowHeight + 15, { align: 'center' });
    
    const thirdRowItems = [
      { text: 'ÁREA', x: startX + (colWidth/2) },
      { text: 'Limpieza', x: startX + (colWidth * 1.5) },
      { text: 'Taladros', x: startX + (colWidth * 2.5) },
      { text: 'Armado', x: startX + (colWidth * 3.5) },
      { text: 'Empaque', x: startX + (colWidth * 4.5) },
      { text: 'Carpintería', x: startX + (colWidth * 5.5) }
    ];
    
    thirdRowItems.forEach(item => {
      doc.text(item.text, item.x, startY + (rowHeight * 2) + 15, { align: 'center' });
    });
    
    doc.text('FIRMA', startX + (colWidth/2), startY + (rowHeight * 3) + 15, { align: 'center' });
    
    doc.save(`Etiqueta_${item.folio || 'sin_folio'}.pdf`);
  };
  
  return (
    <div className="segment-folio-cuts" style={{
      padding: '20px',
      maxWidth: '1600px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '25px',
        borderBottom: '2px solid #3498db',
        paddingBottom: '15px'
      }}>
        <FaTable size={24} style={{ color: '#3498db', marginRight: '10px' }} />
        <h1 style={{ 
          fontSize: '1.8rem', 
          margin: 0,
          color: '#2c3e50',
          fontWeight: '600'
        }}>{t('sfc.title')}</h1>
      </div>
      
      {/* Search section */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: '20px',
        gap: '20px'
      }}>
        <div style={{ flex: 1 }}>
          
          {/* Search results */}
          {searchResults.length > 0 && (
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              maxHeight: '300px',
              overflowY: 'auto',
              marginTop: '10px',
              background: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {searchResults.map(segment => (
                <div 
                  key={segment.id}
                  onClick={() => handleSegmentSelect(segment)}
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div>
                    <strong>{segment.folio}</strong> - {segment.name}
                  </div>
                  <div style={{ 
                    color: segment.state === 'done' ? 'green' : 
                           segment.state === 'draft' ? 'gray' : 'blue',
                    fontSize: '0.9rem' 
                  }}>
                    {segment.state.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Selector de ubicación */}
      <div style={{
        marginBottom: '20px',
        padding: '20px',
        backgroundColor: '#f1f8fe',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid #d1e6fa'
      }}>
        <div style={{
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <FaMapMarkerAlt size={18} style={{ color: '#3498db', marginRight: '8px' }} />
          <h3 style={{ 
            margin: 0, 
            color: '#2c3e50', 
            fontSize: '1.1rem',
            fontWeight: '600'
          }}>{t('sfc.location.title')}</h3>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '15px',
          alignItems: 'flex-end'
        }}>
          <div style={{ flex: 1, maxWidth: '300px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              color: '#34495e'
            }}>
              {t('sfc.location.select')}
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedLocation}
                onChange={(e) => handleLocationChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 35px',
                  borderRadius: '6px',
                  border: '1px solid #c1d9ee',
                  backgroundColor: 'white',
                  fontSize: '0.95rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  appearance: 'none'
                }}
                disabled={isLoadingLocations}
              >
                <option value="">{t('sfc.location.select')}</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <FaMapMarkerAlt style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#7f8c8d',
                pointerEvents: 'none'
              }} />
            </div>
          </div>
          <button
            onClick={handleLocationFilter}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
              boxShadow: '0 2px 5px rgba(52, 152, 219, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#2980b9';
              e.currentTarget.style.boxShadow = '0 3px 7px rgba(52, 152, 219, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#3498db';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(52, 152, 219, 0.3)';
            }}
          >
            <FaFilter size={14} />
            {t('sfc.location.filter')}
          </button>
        </div>
        
        <div style={{ 
          marginTop: '10px', 
          fontSize: '0.85rem', 
          color: '#7f8c8d', 
          display: 'flex',
          alignItems: 'center'
        }}>
          <FaInfoCircle size={12} style={{ marginRight: '5px' }} />
          {t('sfc.location.info')}
        </div>
      </div>

      {/* Filters section */}
      {selectedSegment && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: '#f7fafc',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed',
          alignItems: 'flex-end'
        }}>
          <div style={{ 
            marginBottom: '15px', 
            display: 'flex', 
            alignItems: 'center',
            width: '100%'
          }}>
            <FaFilter size={16} style={{ color: '#3498db', marginRight: '8px' }} />
            <h3 style={{ 
              margin: 0, 
              color: '#2c3e50', 
              fontSize: '1.1rem',
              fontWeight: '600'
            }}>{t('sfc.filters.title')}</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
            <label style={{
              fontSize: '0.85rem',
              fontWeight: 'bold',
              marginBottom: '5px',
              color: '#34495e'
            }}>
              {t('sfc.filters.folio')}
            </label>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#95a5a6',
                pointerEvents: 'none'
              }} size={12} />
              <input
                type="text"
                value={filters.folio}
                onChange={(e) => setFilters({...filters, folio: e.target.value})}
                placeholder={t('sfc.filters.folio.placeholder')}
                style={{
                  padding: '8px 12px 8px 30px',
                  border: '1px solid #cbd5e0',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  width: '100%',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
            <label style={{
              fontSize: '0.85rem',
              fontWeight: 'bold',
              marginBottom: '5px',
              color: '#34495e'
            }}>
              {t('sfc.filters.production')}
            </label>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#95a5a6',
                pointerEvents: 'none'
              }} size={12} />
              <input
                type="text"
                value={filters.production}
                onChange={(e) => setFilters({...filters, production: e.target.value})}
                placeholder={t('sfc.filters.production.placeholder')}
                style={{
                  padding: '8px 12px 8px 30px',
                  border: '1px solid #cbd5e0',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  width: '100%',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
            <label style={{
              fontSize: '0.85rem',
              fontWeight: 'bold',
              marginBottom: '5px',
              color: '#34495e'
            }}>
              {t('sfc.filters.order')}
            </label>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#95a5a6',
                pointerEvents: 'none'
              }} size={12} />
              <input
                type="text"
                value={filters.order}
                onChange={(e) => setFilters({...filters, order: e.target.value})}
                placeholder={t('sfc.filters.order.placeholder')}
                style={{
                  padding: '8px 12px 8px 30px',
                  border: '1px solid #cbd5e0',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  width: '100%',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
            <label style={{
              fontSize: '0.85rem',
              fontWeight: 'bold',
              marginBottom: '5px',
              color: '#34495e'
            }}>
              {t('sfc.filters.product_code')}
            </label>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#95a5a6',
                pointerEvents: 'none'
              }} size={12} />
              <input
                type="text"
                value={filters.product_code}
                onChange={(e) => setFilters({...filters, product_code: e.target.value})}
                placeholder={t('sfc.filters.product_code.placeholder')}
                style={{
                  padding: '8px 12px 8px 30px',
                  border: '1px solid #cbd5e0',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  width: '100%',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
            </div>
          </div>
          
          <button
            onClick={clearFilters}
            style={{
              padding: '10px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: '500',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#5a6268';
              e.currentTarget.style.boxShadow = '0 3px 7px rgba(0,0,0,0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#6c757d';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
            }}
          >
            <FaTimes size={12} />
            {t('sfc.filters.clear')}
          </button>
          
          {filteredDetails.length > 0 && (
            <button
              onClick={exportToExcel}
              style={{
                padding: '10px 16px',
                backgroundColor: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: '500',
              boxShadow: '0 2px 5px rgba(39, 174, 96, 0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#219653';
              e.currentTarget.style.boxShadow = '0 3px 7px rgba(39, 174, 96, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#27ae60';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(39, 174, 96, 0.2)';
            }}
          >
            <FaFileExcel size={14} /> {t('sfc.export.excel')}
          </button>
          )}
          
          <div style={{ 
            marginLeft: 'auto', 
            color: '#7f8c8d',
            backgroundColor: '#f1f1f1',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '0.9rem'
          }}>
            <strong>
              {getPaginationInfo()}
            </strong>
          </div>
        </div>
      )}
      
      {/* Results table */}
      {isLoading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px',
          backgroundColor: '#f8fbff',
          borderRadius: '10px',
          color: '#7f8c8d',
          border: '1px dashed #b1d1f6',
          margin: '20px 0',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <FaSpinner size={40} style={{ color: '#3498db', animation: 'spin 1s linear infinite', marginBottom: '15px' }} />
          <p style={{ color: '#2c3e50', fontSize: '1.1rem', fontWeight: '500' }}>{t('sfc.loading')}</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : selectedSegment && filteredDetails.length > 0 ? (
        <div style={{
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: '70vh',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          borderRadius: '10px',
          marginTop: '20px',
          border: '1px solid #e8eef3'
        }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '0.95rem',
            border: 'none'
          }}>
            <thead>
              <tr style={{ 
                backgroundColor: '#3498db', 
                borderBottom: 'none'
              }}>
                <th style={{ padding: '12px 15px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.folio')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.location')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.segment')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.state')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.production')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.order')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.product_qty')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.product')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.color')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.thickness')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.side')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.width_cut')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}>{t('sfc.table.long_cut')}</th>
                <th style={{ padding: '12px 15px', textAlign: 'center', position: 'sticky', top: 0, backgroundColor: '#3498db', color: 'white', fontWeight: '600' }}></th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((detail, index) => (
                <tr 
                  key={index}
                  style={{ 
                    borderBottom: '1px solid #e8eef3',
                    backgroundColor: index % 2 === 0 ? '#fff' : '#f8fbff',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => {e.currentTarget.style.backgroundColor = '#f0f7ff'}}
                  onMouseOut={(e) => {e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f8fbff'}}
                >
                  <td style={{ padding: '12px 15px', fontWeight: '500' }}>{detail.folio || '-'}</td>
                  <td style={{ padding: '12px 15px' }}>{detail.location || '-'}</td>
                  <td style={{ padding: '12px 15px' }}>{detail.segment_name || '-'}</td>
                  <td style={{ padding: '12px 15px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      backgroundColor: detail.state === 'done' ? '#e6f7ee' : detail.state === 'draft' ? '#f2f4f6' : '#e7f3ff',
                      color: detail.state === 'done' ? '#27ae60' : detail.state === 'draft' ? '#7f8c8d' : '#3498db',
                      fontWeight: '500'
                    }}>
                      {detail.state || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 15px' }}>{detail.production || '-'}</td>
                  <td style={{ padding: '12px 15px' }}>{detail.order || '-'}</td>
                  <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: '500' }}>{detail.product_qty || '-'}</td>
                  <td style={{ padding: '12px 15px' }}>
                    {detail.product_code ? (
                      <span>
                        <span style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>[{detail.product_code}]</span>{' '}
                        {detail.product}
                      </span>
                    ) : (
                      detail.product || '-'
                    )}
                  </td>
                  <td style={{ padding: '12px 15px' }}>{detail.color || '-'}</td>
                  <td style={{ padding: '12px 15px' }}>{detail.thickness || '-'}</td>
                  <td style={{ padding: '12px 15px' }}>{detail.side || '-'}</td>
                  <td style={{ padding: '12px 15px', textAlign: 'right' }}>{detail.width_cut || '-'}</td>
                  <td style={{ padding: '12px 15px', textAlign: 'right' }}>{detail.long_cut || '-'}</td>
                  <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                    <button
                      onClick={() => generatePdf(detail)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      margin: '0 auto'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#c0392b';
                      e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.15)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#e74c3c';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <FaFilePdf size={14} /> {t('PDF')}
                  </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedSegment ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          color: '#7f8c8d',
          border: '1px dashed #cbd5e0',
          margin: '20px 0',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <FaInfoCircle size={30} style={{ color: '#95a5a6', marginBottom: '15px' }} />
          <p style={{ fontSize: '1.1rem', marginBottom: '5px' }}>{t('sfc.no_results')}</p>
          <p style={{ fontSize: '0.9rem' }}>{t('sfc.no_results_info')}</p>
        </div>
      ) : (
        <div style={{
          padding: '50px',
          textAlign: 'center',
          backgroundColor: '#f0f9ff',
          borderRadius: '10px',
          color: '#3498db',
          border: '1px dashed #90cdf4',
          margin: '30px 0',
          boxShadow: 'inset 0 2px 8px rgba(66, 153, 225, 0.1)'
        }}>
          <FaMapMarkerAlt size={40} style={{ color: '#3498db', marginBottom: '15px', opacity: 0.8 }} />
          <p style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '10px' }}>{t('sfc.select_location')}</p>
          <p style={{ fontSize: '0.95rem', color: '#4a5568' }}>{t('sfc.select_location_info')}</p>
        </div>
      )}
      
      {/* Controles de paginación */}
      {filteredDetails.length > itemsPerPage && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          margin: '25px 0 10px',
          alignItems: 'center',
          padding: '15px',
          backgroundColor: '#f7fafc',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
        }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              padding: '10px 20px',
              backgroundColor: currentPage === 1 ? '#edf2f7' : '#3498db',
              color: currentPage === 1 ? '#a0aec0' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: currentPage === 1 ? 'default' : 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: currentPage === 1 ? 'none' : '0 2px 5px rgba(52, 152, 219, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (currentPage !== 1) {
                e.currentTarget.style.backgroundColor = '#2980b9';
                e.currentTarget.style.boxShadow = '0 3px 7px rgba(52, 152, 219, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (currentPage !== 1) {
                e.currentTarget.style.backgroundColor = '#3498db';
                e.currentTarget.style.boxShadow = '0 2px 5px rgba(52, 152, 219, 0.3)';
              }
            }}
          >
            ← {t('sfc.pagination.prev')}
          </button>
          
          <span style={{ 
            margin: '0 10px', 
            backgroundColor: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: '500',
            color: '#2d3748',
            border: '1px solid #e2e8f0'
          }}>
            {t('sfc.pagination.info', { currentPage, totalPages })}
          </span>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              padding: '10px 20px',
              backgroundColor: currentPage === totalPages ? '#edf2f7' : '#3498db',
              color: currentPage === totalPages ? '#a0aec0' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: currentPage === totalPages ? 'default' : 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: currentPage === totalPages ? 'none' : '0 2px 5px rgba(52, 152, 219, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (currentPage !== totalPages) {
                e.currentTarget.style.backgroundColor = '#2980b9';
                e.currentTarget.style.boxShadow = '0 3px 7px rgba(52, 152, 219, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (currentPage !== totalPages) {
                e.currentTarget.style.backgroundColor = '#3498db';
                e.currentTarget.style.boxShadow = '0 2px 5px rgba(52, 152, 219, 0.3)';
              }
            }}
          >
            {t('sfc.pagination.next')} →
          </button>
        </div>
      )}
    </div>
  );
};

export default SegmentFolioCuts;
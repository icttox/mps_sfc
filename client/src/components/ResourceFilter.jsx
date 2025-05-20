import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Generic filter component that can be used for both resources and locations
const ResourceFilter = ({ 
  title, 
  items, 
  itemKey = 'id',
  itemLabel = 'title',
  onFilterChange,
  initiallyOpen = false
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const { t } = useTranslation();

  // Initialize with all items selected
  useEffect(() => {
    if (items && Array.isArray(items) && items.length > 0) {
      setSelectedItems(items.map(item => typeof item === 'object' ? item[itemKey] : item));
    } else {
      // Initialize with empty array if items is not available or empty
      setSelectedItems([]);
    }
  }, [items, itemKey]);

  const handleItemToggle = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        // Remove if already selected
        return prev.filter(id => id !== itemId);
      } else {
        // Add if not selected
        return [...prev, itemId];
      }
    });
  };

  const handleSelectAll = () => {
    if (items && Array.isArray(items) && items.length > 0) {
      setSelectedItems(items.map(item => typeof item === 'object' ? item[itemKey] : item));
    }
  };

  const handleClearAll = () => {
    setSelectedItems([]);
  };

  // Notify parent component when selection changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(selectedItems);
    }
  }, [selectedItems, onFilterChange]);

  return (
    <div className="resource-filter">
      <div className="filter-header" onClick={() => setIsOpen(!isOpen)}>
        <h3>
          {title || t('filter')}
          <span className="toggle-icon">{isOpen ? '▼' : '▶'}</span>
        </h3>
        <div className="filter-summary">
          {selectedItems && items ? (
            selectedItems.length === items.length 
              ? t('calendar.filter.allWorkstations')
              : `${selectedItems.length} ${t('calendar.filter.selected')}`
          ) : t('loading')}
        </div>
      </div>
      
      {isOpen && (
        <div className="filter-content">
          <div className="filter-actions">
            <button 
              className="filter-action-btn select-all" 
              onClick={handleSelectAll}
              disabled={!items || !Array.isArray(items) || items.length === 0 || (selectedItems && selectedItems.length === items.length)}
            >
              {t('calendar.filter.selectAll')}
            </button>
            <button 
              className="filter-action-btn clear-all" 
              onClick={handleClearAll}
              disabled={!selectedItems || selectedItems.length === 0}
            >
              {t('calendar.filter.clearAll')}
            </button>
          </div>
          <div className="resource-list">
            {items && Array.isArray(items) && items.length > 0 ? (
              items.map((item, index) => {
                const itemId = typeof item === 'object' ? item[itemKey] : item;
                const label = typeof item === 'object' ? item[itemLabel] : item;
                
                return (
                  <div className="resource-item" key={itemId || index}>
                    <label className="resource-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(itemId)}
                        onChange={() => handleItemToggle(itemId)}
                      />
                      <span className="checkbox-label">{label}</span>
                    </label>
                  </div>
                );
              })
            ) : (
              <div className="resource-item">{t('calendar.filter.noItems')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceFilter;
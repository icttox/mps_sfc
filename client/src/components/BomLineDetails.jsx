import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BomLineDetails = ({ lineId }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      // Skip API call if no lineId provided
      if (!lineId) {
        setLoading(false);
        return;
      }
      
      try {
        const { data } = await axios.get(`/api/production/bom-line-details/${lineId}`);
        setDetails(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching BOM line details:', err);
        setError('Failed to load details');
        setLoading(false);
      }
    };

    fetchDetails();
  }, [lineId]);

  if (!lineId) return null;
  if (loading) return <div className="details-loading">Loading details...</div>;
  if (error) return <div className="details-error">{error}</div>;
  if (!details || details.length === 0) return <div className="no-details">No details available</div>;

  return (
    <div className="bom-line-details">
      <h4>Component Details</h4>
      <table className="details-table">
        <thead>
          <tr>
            <th>Row</th>
            <th>Width</th>
            <th>Length</th>
            <th>Thickness</th>
            <th>Name</th>
            <th>Color</th>
            <th>Caliber</th>
            <th>Quantity</th>
            <th>M²</th>
            <th>Kilos</th>
            <th>Side</th>
          </tr>
        </thead>
        <tbody>
          {details.map((detail, index) => (
            <tr key={index}>
              <td>{detail.row}</td>
              <td>{detail.width_cut}</td>
              <td>{detail.long_cut}</td>
              <td>{detail.thickness}</td>
              <td>{detail.name}</td>
              <td>{detail.color}</td>
              <td>{detail.caliber}</td>
              <td>{detail.quantity}</td>
              <td>{detail.meters2}</td>
              <td>{detail.kilos}</td>
              <td>{detail.side || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BomLineDetails;
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaTable, FaArrowRight, FaClipboardList } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const HomePage = () => {
  const { t } = useTranslation();
  return (
    <div className="home-page" style={{
      padding: '40px 20px',
      maxWidth: '1200px',
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <div className="welcome-section" style={{
        marginBottom: '50px'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '20px',
          color: '#2c3e50'
        }}>
          {t('homePage.welcome')}
        </h1>
        <p style={{
          fontSize: '1.2rem',
          maxWidth: '800px',
          margin: '0 auto 30px',
          color: '#555',
          lineHeight: '1.6'
        }}>
          {t('homePage.description')}
        </p>
      </div>
      
      <div className="view-options" style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '30px'
      }}>
        <div className="view-card" style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #e2e6ea',
          borderRadius: '8px',
          padding: '30px',
          width: '350px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          transition: 'transform 0.3s, box-shadow 0.3s',
          cursor: 'pointer'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
        }}
        >
          <div style={{ fontSize: '3rem', color: '#3498db', marginBottom: '20px' }}>
            <FaCalendarAlt />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '15px', color: '#2c3e50' }}>
            {t('header.calendar')}
          </h2>
          <p style={{ color: '#555', marginBottom: '25px', lineHeight: '1.5' }}>
            {t('homePage.calendarDescription')}
          </p>
          <Link to="/calendar" style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#3498db',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: '500',
            gap: '8px'
          }}>
            {t('homePage.openCalendarView')} <FaArrowRight />
          </Link>
        </div>
        
        <div className="view-card" style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #e2e6ea',
          borderRadius: '8px',
          padding: '30px',
          width: '350px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          transition: 'transform 0.3s, box-shadow 0.3s',
          cursor: 'pointer'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
        }}
        >
          <div style={{ fontSize: '3rem', color: '#28a745', marginBottom: '20px' }}>
            <FaTable />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '15px', color: '#2c3e50' }}>
            {t('header.mps')}
          </h2>
          <p style={{ color: '#555', marginBottom: '25px', lineHeight: '1.5' }}>
            {t('homePage.mpsDescription')}
          </p>
          <Link to="/mps" style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#28a745',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: '500',
            gap: '8px'
          }}>
            {t('homePage.openMpsView')} <FaArrowRight />
          </Link>
        </div>
        
        <div className="view-card" style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #e2e6ea',
          borderRadius: '8px',
          padding: '30px',
          width: '350px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          transition: 'transform 0.3s, box-shadow 0.3s',
          cursor: 'pointer'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
        }}
        >
          <div style={{ fontSize: '3rem', color: '#e74c3c', marginBottom: '20px' }}>
            <FaClipboardList />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '15px', color: '#2c3e50' }}>
            {t('header.sfc')}
          </h2>
          <p style={{ color: '#555', marginBottom: '25px', lineHeight: '1.5' }}>
            {t('homePage.sfcDescription')}
          </p>
          <Link to="/sfc" style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#e74c3c',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: '500',
            gap: '8px'
          }}>
            {t('homePage.openSfcView')} <FaArrowRight />
          </Link>
        </div>
      </div>
      
      <div className="home-footer" style={{
        marginTop: '60px',
        paddingTop: '20px',
        borderTop: '1px solid #e2e6ea',
        color: '#777',
        fontSize: '0.9rem'
      }}>
        <p>{t('homePage.footer')} {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

export default HomePage;
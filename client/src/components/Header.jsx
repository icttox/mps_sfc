import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Header = () => {
  const { t } = useTranslation();

  return (
    <header className="header">
      <div className="logo">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1>{t('header.title')}</h1>
        </Link>
      </div>
      <nav className="nav">
        <ul>
          <li>
            <Link to="/">{t('header.home')}</Link>
          </li>
          <li>
            <Link to="/calendar">{t('header.calendar')}</Link>
          </li>
          <li>
            <Link to="/mps">{t('header.mps')}</Link>
          </li>
          <li>
            <Link to="/sfc">{t('header.sfc')}</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
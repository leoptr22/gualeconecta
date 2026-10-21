import { Button } from '@mui/material';
import Add from '@mui/icons-material/Add';
import type { AuthUser } from '../hooks/useAuth';

const publicSections = ['Descubrir', 'Agenda', 'Comercios', 'Consejos'];

export function AppHeader({ section, onSection, user, onLogin, onLogout, onPublish, signingOut=false }: {
  section: string;
  onSection: (section: string) => void;
  user: AuthUser | null;
  onLogin: () => void;
  onLogout: () => void;
  onPublish: () => void;
  signingOut?: boolean;
}) {
  const sections=user?.role==='admin'?[...publicSections,'Panel']:publicSections;
  return <header className="topbar">
    <div className="topbar-inner">
      <a className="brand" href="/" aria-label="Guale Conecta inicio">
        <img className="brand-logo" src="/brand/guale-conecta.png" alt="Guale Conecta — Gualeguaychú en un solo lugar" width="220" height="76" />
      </a>
      <nav className="primary-nav" aria-label="Secciones principales">
        {sections.map(label => <Button key={label} className={section === label ? 'header-nav active' : 'header-nav'} aria-current={section === label ? 'page' : undefined} onClick={() => onSection(label)}>{label}</Button>)}
      </nav>
      <div className="header-actions">
        {user ? <div className="account-menu"><span title={user.email}>{user.name.split(' ')[0]}</span><Button disabled={signingOut} onClick={onLogout}>{signingOut?'Saliendo…':'Salir'}</Button></div> : <Button className="login-trigger" onClick={onLogin}>Ingresar</Button>}
        <Button className="publish-trigger" variant="contained" startIcon={<Add />} onClick={onPublish}>Publicar gratis</Button>
      </div>
    </div>
  </header>;
}


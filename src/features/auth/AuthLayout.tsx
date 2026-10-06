import type { ReactNode } from 'react';
import logo from '../../assets/branding/sevenpos-logo-horizontal.png';
import businessArt from '../../assets/illustrations/auth/register-business.png';
import ownerArt from '../../assets/illustrations/auth/register-owner.png';
import securityArt from '../../assets/illustrations/auth/register-security.png';
import terminalArt from '../../assets/illustrations/onboarding-welcome.png';
import { AuthSurface } from './AuthSurface';
import './auth-premium.css';

const illustrations = { business: businessArt, owner: ownerArt, security: securityArt, terminal: terminalArt };
export function AuthLayout({ children, illustration = 'business', terminalIdentity }: { children: ReactNode; illustration?: keyof typeof illustrations; terminalIdentity?: string }) {
  return <AuthSurface><main className={`auth-layout${illustration === 'terminal' ? ' auth-layout--terminal' : ''}`}>
    <aside className={`auth-hero auth-hero--${illustration}`} aria-label="SevenPOS">
      <img className="auth-brand" src={logo} alt="SevenPOS" width="150" height="29" />
      <img className="auth-illustration" src={illustrations[illustration]} alt="" aria-hidden="true" />
      {terminalIdentity && <p className="auth-terminal-identity">{terminalIdentity} • Terminal Principal</p>}
    </aside>
    <section className="auth-form-panel"><div className="auth-form-shell">{children}</div></section>
  </main></AuthSurface>;
}

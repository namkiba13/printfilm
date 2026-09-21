import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { GITHUB_REPO_URL } from '../../lib/siteLinks'
import SiteNav, { type NavActive } from './SiteNav'
import { useMediaModelsCatalog } from '../../hooks/useMediaModelsCatalog'

type Props = {
  children: ReactNode
  active?: NavActive
  wide?: boolean
  flush?: boolean
  /** 隐藏页脚（全屏工作台） */
  hideFooter?: boolean
}

export default function AppShell({ children, active, wide, flush, hideFooter }: Props) {
  const { t } = useI18n()
  const media = useMediaModelsCatalog()

  return (
    <div className="pf-shell">
      <SiteNav active={active} />
      {media && (!media.image_models.length || !media.video_models.length) && (
        <p role="status" style={{ margin: '0 auto', padding: '12px 20px', maxWidth: 1200, fontSize: 14 }}>
          94API · Image and video models are not configured yet. You can create and edit scripts.
        </p>
      )}
      <main className={['pf-shell-main', wide ? 'wide' : '', flush ? 'flush' : ''].filter(Boolean).join(' ')}>
        {children}
      </main>
      {!hideFooter && !flush ? (
        <footer className="pf-shell-footer">
          <nav className="pf-shell-footer-links" aria-label={t('footer.links')}>
            <Link to="/terms">{t('footer.terms')}</Link>
            <Link to="/privacy">{t('footer.privacy')}</Link>
            <Link to="/contact">{t('footer.contact')}</Link>
            <Link to="/help">{t('footer.help')}</Link>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
              {t('footer.github')}
            </a>
          </nav>
          <p>© {new Date().getFullYear()} PRINTFILM. All rights reserved.</p>
        </footer>
      ) : null}
    </div>
  )
}

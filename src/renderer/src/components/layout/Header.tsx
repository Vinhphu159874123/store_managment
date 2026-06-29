import { useTranslation } from 'react-i18next'

export default function Header(): JSX.Element {
  const { i18n } = useTranslation()

  const toggleLang = (lang: string): void => {
    i18n.changeLanguage(lang)
    window.api.settings.set('language', lang)
  }

  return (
    <header className="header">
      <div className="header-left">
        {/* Placeholder for breadcrumb or page-specific content */}
      </div>

      <div className="header-right">
        <div className="lang-toggle">
          <button
            className={i18n.language === 'vi' ? 'active' : ''}
            onClick={() => toggleLang('vi')}
          >
            VI
          </button>
          <button
            className={i18n.language === 'en' ? 'active' : ''}
            onClick={() => toggleLang('en')}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  )
}

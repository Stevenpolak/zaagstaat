export function AppFooter() {
  return (
    <footer className="no-print py-3 text-center text-xs border-t" style={{ borderColor: 'var(--line-faint)', color: 'var(--ink-ghost)' }}>
      Zaagstaat v1.5.0 &mdash; gemaakt door{' '}
      <a
        href="https://studiokroos.nl"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 transition-colors"
        style={{ color: 'var(--ink-faint)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink-soft)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-faint)')}
      >
        Studio Kroos
      </a>
    </footer>
  )
}

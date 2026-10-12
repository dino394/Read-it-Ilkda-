interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

function Header({
  darkMode,
  onToggleDarkMode,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="logo">읽다</div>

      <button
        className="dark-mode-button"
        onClick={onToggleDarkMode}
        aria-label="다크모드 전환"
      >
        {darkMode ? "☀️" : "🌙"}
      </button>
    </header>
  );
}

export default Header;
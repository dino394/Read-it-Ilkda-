interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

function Header({
  darkMode,
  onToggleDarkMode,
  onLogout,
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
       <button
        onClick={onLogout}
      >
        로그아웃
      </button>
    </header>
  );
}

export default Header;
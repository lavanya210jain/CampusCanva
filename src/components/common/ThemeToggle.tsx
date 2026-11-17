import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={theme === "dark"}
      className="theme-toggle"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      <span className="sr-only">{label}</span>
    </button>
  );
}

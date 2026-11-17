import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
type Theme = "light" | "dark";
const key = "campuscanva_theme";
const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);
function storedPreference(): Theme | null {
  try {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme | null>(storedPreference);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const theme: Theme = preference || (systemDark ? "dark" : "light");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0e1912" : "#faf8f1");
    if (preference)
      try {
        localStorage.setItem(key, preference);
      } catch {
        /* Theme still works when storage is unavailable. */
      }
  }, [theme, preference]);
  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme: () => setPreference(theme === "dark" ? "light" : "dark"),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is required");
  return context;
}

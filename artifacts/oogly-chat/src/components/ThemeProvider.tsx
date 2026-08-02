import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const { user } = useAuth()

  useEffect(() => {
    const root = window.document.documentElement
    
    // Prefer user theme if set, otherwise default to dark
    const activeTheme = user?.theme || "dark"
    setTheme(activeTheme as "light" | "dark")

    root.classList.remove("light", "dark")
    root.classList.add(activeTheme)

    // Apply custom accent theme
    const accentTheme = user?.accentTheme || "racing"
    root.classList.remove("theme-racing", "theme-blue", "theme-green", "theme-purple", "theme-orange")
    root.classList.add(`theme-${accentTheme}`)

    // Apply font scale
    const fontScale = user?.fontScale || 1
    root.style.setProperty("--font-scale", fontScale.toString())

    // Apply font size
    const fontSize = user?.fontSize || 1
    root.style.setProperty("--font-size-base", `${fontSize}rem`)

    // Apply border width
    const borderWidth = user?.borderWidth || 1
    root.style.setProperty("--border-width", `${borderWidth}px`)

    // Apply spacing scale
    const spacingScale = user?.spacingScale || 1
    root.style.setProperty("--spacing-scale", spacingScale.toString())

    // Apply message background
    const messageBg = user?.messageBg || "card"
    root.style.setProperty("--message-bg", messageBg === "card" ? "var(--card)" : messageBg)

    // Apply own message background
    const messageOwnBg = user?.messageOwnBg || "primary"
    root.style.setProperty("--message-own-bg", messageOwnBg === "primary" ? "var(--primary)" : messageOwnBg)

    // Apply custom font family
    const fontFamily = user?.fontFamily || "sans"
    if (fontFamily === "sans") {
      root.style.setProperty("--app-font-sans", "'Inter', system-ui, sans-serif")
    } else if (fontFamily === "serif") {
      root.style.setProperty("--app-font-sans", "Georgia, serif")
    } else if (fontFamily === "mono") {
      root.style.setProperty("--app-font-sans", "'JetBrains Mono', ui-monospace, monospace")
    }

  }, [user?.theme, user?.accentTheme, user?.fontScale, user?.fontSize, user?.borderWidth, user?.spacingScale, user?.messageBg, user?.messageOwnBg, user?.fontFamily])

  return <>{children}</>
}

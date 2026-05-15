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
  }, [user?.theme])

  return <>{children}</>
}

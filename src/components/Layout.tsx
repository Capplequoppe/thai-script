import { NavLink, Outlet } from "react-router";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
	{ to: "/", label: "Home" },
	{ to: "/items", label: "Items" },
	{ to: "/progress", label: "Progress" },
	{ to: "/vocabulary", label: "Vocab" },
	{ to: "/grammar", label: "Grammar" },
	{ to: "/settings", label: "Settings" },
];

export function Layout() {
	return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <nav className="flex gap-4">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        {/* <div className="flex items-center gap-3">
          <ThemeToggle />
        </div> */}
      </header>
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}

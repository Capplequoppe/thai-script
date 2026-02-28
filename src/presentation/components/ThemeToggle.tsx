import { useEffect, useState } from "react";

export function ThemeToggle() {
	const [dark, setDark] = useState(() =>
		document.documentElement.classList.contains("dark"),
	);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", dark);
		try {
			localStorage.setItem("theme", dark ? "dark" : "light");
		} catch {}
	}, [dark]);

	return (
		<button
			type="button"
			onClick={() => setDark((d) => !d)}
			className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
			aria-label="Toggle theme"
		>
			{dark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
		</button>
	);
}

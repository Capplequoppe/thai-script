import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./presentation/App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

if ("serviceWorker" in navigator) {
	navigator.serviceWorker.register("/thai-script/sw.js", {
		scope: "/thai-script/",
	});
}

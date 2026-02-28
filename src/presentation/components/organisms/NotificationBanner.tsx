import { useCallback, useEffect, useState } from "react";
import { NotificationScheduler } from "../../../infrastructure/notifications/NotificationScheduler";

const DISMISSED_KEY = "thai-srs-notification-banner-dismissed";

const scheduler = new NotificationScheduler();

export function NotificationBanner() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (!scheduler.isSupported) return;
		if (scheduler.permission !== "default") return;
		if (localStorage.getItem(DISMISSED_KEY) === "true") return;
		setVisible(true);
	}, []);

	const handleEnable = useCallback(async () => {
		const result = await scheduler.requestPermission();
		if (result === "granted" || result === "denied") {
			setVisible(false);
		}
	}, []);

	const handleDismiss = useCallback(() => {
		localStorage.setItem(DISMISSED_KEY, "true");
		setVisible(false);
	}, []);

	if (!visible) return null;

	return (
		<div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-start gap-3">
			<div className="flex-1">
				<p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
					Enable notifications?
				</p>
				<p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
					Get reminded when cards are due for review.
				</p>
			</div>
			<div className="flex gap-2 shrink-0">
				<button
					type="button"
					onClick={handleEnable}
					className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
				>
					Enable
				</button>
				<button
					type="button"
					onClick={handleDismiss}
					className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-lg transition-colors"
				>
					Not now
				</button>
			</div>
		</div>
	);
}

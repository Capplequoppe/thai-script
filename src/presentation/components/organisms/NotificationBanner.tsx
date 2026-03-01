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
		<div
			className="rounded-xl border p-4 flex items-start gap-3"
			style={{
				background: "var(--color-surface-2)",
				borderColor: "var(--color-border)",
			}}
		>
			<div className="flex-1">
				<p
					className="text-sm font-medium"
					style={{ color: "var(--color-text)" }}
				>
					Enable notifications?
				</p>
				<p
					className="text-xs mt-1"
					style={{ color: "var(--color-text-muted)" }}
				>
					Get reminded when cards are due for review.
				</p>
			</div>
			<div className="flex gap-2 shrink-0">
				<button
					type="button"
					onClick={handleEnable}
					className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
					style={{ background: "var(--color-primary)", color: "white" }}
				>
					Enable
				</button>
				<button
					type="button"
					onClick={handleDismiss}
					className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
					style={{ color: "var(--color-primary)" }}
				>
					Not now
				</button>
			</div>
		</div>
	);
}

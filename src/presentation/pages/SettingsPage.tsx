import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/presentation/components/ui/button";
import { useApp } from "../hooks/useApp";

export function SettingsPage() {
	const { data, refresh } = useApp();
	const navigate = useNavigate();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [importStatus, setImportStatus] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	function handleExport() {
		const json = data.exportData();
		const date = new Date().toISOString().slice(0, 10);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `thai-script-progress-${date}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleImport() {
		const file = fileInputRef.current?.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const json = e.target?.result as string;
				data.importData(json);
				refresh();
				setImportStatus({
					type: "success",
					message: "Progress imported and merged successfully.",
				});
				if (fileInputRef.current) fileInputRef.current.value = "";
			} catch {
				setImportStatus({
					type: "error",
					message: "Invalid file. Please select a valid progress file.",
				});
			}
		};
		reader.readAsText(file);
	}

	return (
		<div className="space-y-8 py-4">
			<h1 className="text-2xl font-bold">Settings</h1>

			{/* Export */}
			<section className="space-y-2">
				<h2
					className="text-sm font-semibold"
					style={{ color: "var(--color-text-muted)" }}
				>
					Export Progress
				</h2>
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					Download your learning progress as a JSON file.
				</p>
				<Button type="button" onClick={handleExport}>
					Download Progress
				</Button>
			</section>

			{/* Import */}
			<section className="space-y-2">
				<h2
					className="text-sm font-semibold"
					style={{ color: "var(--color-text-muted)" }}
				>
					Import Progress
				</h2>
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					Import a progress file. Your existing progress will be merged with the
					imported data.
				</p>
				<div className="flex gap-2 items-center">
					<input
						ref={fileInputRef}
						type="file"
						accept=".json"
						className="text-sm file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium"
						style={{ color: "var(--color-text-muted)" }}
					/>
					<Button type="button" variant="secondary" onClick={handleImport}>
						Import
					</Button>
				</div>
				{importStatus && (
					<p
						className="text-sm"
						style={{
							color:
								importStatus.type === "success"
									? "var(--color-master)"
									: "var(--color-danger)",
						}}
					>
						{importStatus.message}
					</p>
				)}
			</section>

			{/* Danger Zone */}
			<section
				className="space-y-2 pt-4 border-t"
				style={{ borderColor: "var(--color-border)" }}
			>
				<h2
					className="text-sm font-semibold"
					style={{ color: "var(--color-danger)" }}
				>
					Danger Zone
				</h2>
				<Button
					type="button"
					variant="destructive"
					size="sm"
					onClick={() => {
						if (confirm("This will erase all progress. Are you sure?")) {
							data.reset();
							refresh();
							navigate("/");
						}
					}}
				>
					Reset All Progress
				</Button>
			</section>
		</div>
	);
}

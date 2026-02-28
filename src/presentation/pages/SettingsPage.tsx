import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../hooks/useApp";

export function SettingsPage() {
	const { exportData, importData, resetAll } = useApp();
	const navigate = useNavigate();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [importStatus, setImportStatus] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	function handleExport() {
		const json = exportData();
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
				importData(json);
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
				<h2 className="text-sm font-semibold text-gray-500">Export Progress</h2>
				<p className="text-sm text-gray-500 dark:text-gray-400">
					Download your learning progress as a JSON file.
				</p>
				<button
					type="button"
					onClick={handleExport}
					className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
				>
					Download Progress
				</button>
			</section>

			{/* Import */}
			<section className="space-y-2">
				<h2 className="text-sm font-semibold text-gray-500">Import Progress</h2>
				<p className="text-sm text-gray-500 dark:text-gray-400">
					Import a progress file. Your existing progress will be merged with the
					imported data.
				</p>
				<div className="flex gap-2 items-center">
					<input
						ref={fileInputRef}
						type="file"
						accept=".json"
						className="text-sm text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-300 dark:hover:file:bg-gray-700"
					/>
					<button
						type="button"
						onClick={handleImport}
						className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
					>
						Import
					</button>
				</div>
				{importStatus && (
					<p
						className={`text-sm ${importStatus.type === "success" ? "text-green-600" : "text-red-600"}`}
					>
						{importStatus.message}
					</p>
				)}
			</section>

			{/* Danger Zone */}
			<section className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-800">
				<h2 className="text-sm font-semibold text-red-500">Danger Zone</h2>
				<button
					type="button"
					onClick={() => {
						if (confirm("This will erase all progress. Are you sure?")) {
							resetAll();
							navigate("/");
						}
					}}
					className="text-sm text-red-500 hover:text-red-600"
				>
					Reset All Progress
				</button>
			</section>
		</div>
	);
}

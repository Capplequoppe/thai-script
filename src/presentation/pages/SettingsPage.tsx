import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/presentation/components/ui/button";
import { ConfirmDialog } from "../components/molecules/ConfirmDialog";
import { useApp } from "../hooks/useApp";

const MIN_APPRENTICE_LIMIT = 1;
const MAX_APPRENTICE_LIMIT = 500;

function parseLimit(value: string): number | null {
	if (!/^\d+$/.test(value.trim())) return null;
	const n = Number(value);
	if (n < MIN_APPRENTICE_LIMIT || n > MAX_APPRENTICE_LIMIT) return null;
	return n;
}

export function SettingsPage() {
	const { data, refresh } = useApp();
	const navigate = useNavigate();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [importStatus, setImportStatus] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);
	const [resetOpen, setResetOpen] = useState(false);

	const initialLimits = data.getApprenticeLimits();
	const [generalLimit, setGeneralLimit] = useState(
		String(initialLimits.general),
	);
	const [scriptLimit, setScriptLimit] = useState(String(initialLimits.script));
	const [sentenceLimit, setSentenceLimit] = useState(
		String(initialLimits.sentence),
	);
	const [limitsStatus, setLimitsStatus] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	function handleSaveLimits() {
		const general = parseLimit(generalLimit);
		const script = parseLimit(scriptLimit);
		const sentence = parseLimit(sentenceLimit);

		if (general === null || script === null || sentence === null) {
			setLimitsStatus({
				type: "error",
				message: `Each limit must be a whole number between ${MIN_APPRENTICE_LIMIT} and ${MAX_APPRENTICE_LIMIT}.`,
			});
			return;
		}

		data.setApprenticeLimits({ general, script, sentence });
		refresh();
		setLimitsStatus({ type: "success", message: "Learning pace saved." });
	}

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

			{/* Learning Pace */}
			<section className="space-y-2">
				<h2
					className="text-sm font-semibold"
					style={{ color: "var(--color-text-muted)" }}
				>
					Learning Pace
				</h2>
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					Adjust how many items you can have in progress at once for each
					content type.
				</p>
				<div className="grid grid-cols-1 gap-3 max-w-xs">
					<label
						htmlFor="apprentice-limit-general"
						className="text-sm flex flex-col gap-1"
					>
						Vocabulary &amp; Grammar
						<input
							id="apprentice-limit-general"
							type="number"
							min={MIN_APPRENTICE_LIMIT}
							max={MAX_APPRENTICE_LIMIT}
							value={generalLimit}
							onChange={(e) => setGeneralLimit(e.target.value)}
							className="rounded-md border px-3 py-2 text-sm"
							style={{ borderColor: "var(--color-border)" }}
						/>
					</label>
					<label
						htmlFor="apprentice-limit-script"
						className="text-sm flex flex-col gap-1"
					>
						Script
						<input
							id="apprentice-limit-script"
							type="number"
							min={MIN_APPRENTICE_LIMIT}
							max={MAX_APPRENTICE_LIMIT}
							value={scriptLimit}
							onChange={(e) => setScriptLimit(e.target.value)}
							className="rounded-md border px-3 py-2 text-sm"
							style={{ borderColor: "var(--color-border)" }}
						/>
					</label>
					<label
						htmlFor="apprentice-limit-sentence"
						className="text-sm flex flex-col gap-1"
					>
						Sentences
						<input
							id="apprentice-limit-sentence"
							type="number"
							min={MIN_APPRENTICE_LIMIT}
							max={MAX_APPRENTICE_LIMIT}
							value={sentenceLimit}
							onChange={(e) => setSentenceLimit(e.target.value)}
							className="rounded-md border px-3 py-2 text-sm"
							style={{ borderColor: "var(--color-border)" }}
						/>
					</label>
				</div>
				<Button type="button" onClick={handleSaveLimits}>
					Save Learning Pace
				</Button>
				{limitsStatus && (
					<p
						className="text-sm"
						style={{
							color:
								limitsStatus.type === "success"
									? "var(--color-master)"
									: "var(--color-danger)",
						}}
					>
						{limitsStatus.message}
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
					onClick={() => setResetOpen(true)}
				>
					Reset All Progress
				</Button>
			</section>
			<ConfirmDialog
				open={resetOpen}
				onOpenChange={setResetOpen}
				title="Reset All Progress"
				description="This will erase all progress. This action cannot be undone."
				confirmLabel="Reset"
				isDestructive
				onConfirm={() => {
					data.reset();
					refresh();
					navigate("/");
				}}
			/>
		</div>
	);
}

import { useState } from "react";
import { Button } from "../ui/button";

interface Props {
	thai: string;
	isPullable: boolean;
	missingPrerequisites: { characters: string[]; toneRules: string[] };
	/** Attempt the pull-in; returns whether it actually succeeded (false = apprentice cap reached). */
	onPullIn: (thai: string) => boolean;
}

export function PullInVocabButton({
	thai,
	isPullable,
	missingPrerequisites,
	onPullIn,
}: Props) {
	const [capBlocked, setCapBlocked] = useState(false);

	if (!isPullable) {
		const parts = [
			...missingPrerequisites.characters.map((c) => `character ${c}`),
			...missingPrerequisites.toneRules.map((r) => `tone rule ${r}`),
		];
		return (
			<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
				Still needs: {parts.join(", ")}
			</p>
		);
	}

	return (
		<div className="space-y-1">
			<Button
				onClick={() => {
					const ok = onPullIn(thai);
					setCapBlocked(!ok);
				}}
			>
				Pull into SRS
			</Button>
			{capBlocked && (
				<p className="text-sm" style={{ color: "var(--color-danger)" }}>
					Too many words in progress — clear some reviews first.
				</p>
			)}
		</div>
	);
}

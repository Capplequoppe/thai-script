import { useMemo } from "react";
import type { ToneGameItem } from "../../../domain/game/types";
import type { RecallRating } from "../../../domain/shared/types";
import { toneItemForCard } from "../../../domain/vocabulary/services/toneCardExplanations";
import type { VocabularyCard } from "../../../domain/vocabulary/types";
import { ToneIdentificationChallenge } from "./ToneIdentificationChallenge";

/**
 * The game's tone analyzer, as a scheduled vocabulary card.
 *
 * It renders the same organism the game does rather than a copy: the pitch
 * contour, the reference clip and the recording flow are the feature, and two
 * implementations of it would drift. What changes is only where the rating
 * comes from — here it is the card's own SRS rating.
 *
 * Self-rated on purpose, and that is why this is its own property rather than
 * a mode of `toneIdentification`. A pitch-contour score is a hint about how
 * close an attempt sounded, not a verdict; letting it schedule a card would
 * hand the SRS an opinion it has no way to check. The learner grades
 * themselves, exactly as in the game, and the card advances on that.
 *
 * Content comes from the corpus by card id, never from the card's own fields
 * — see `toneItemForCard`.
 */
interface TonePronunciationCardProps {
	card: VocabularyCard;
	onRate: (rating: RecallRating) => void;
}

export function TonePronunciationCard({
	card,
	onRate,
}: TonePronunciationCardProps) {
	const item: ToneGameItem | null = useMemo(
		() => toneItemForCard(card.id),
		[card.id],
	);

	if (!item) {
		return (
			<p
				className="text-center py-8"
				style={{ color: "var(--color-text-muted)" }}
			>
				This word's recording is no longer available.
			</p>
		);
	}

	return <ToneIdentificationChallenge item={item} onRate={onRate} />;
}

import { useNavigate } from "react-router";
import { deckPathForLesson } from "@/domain/script/data/lessonContent";
import { Button } from "@/presentation/components/ui/button";
import {
	markOrientationSeen,
	ORIENTATION_LESSON_ID,
} from "../../infrastructure/settings/OrientationSettings";
import { DeckSlide } from "../components/organisms/DeckSlide";

/**
 * The orientation deck: how this course works, before any of it starts.
 *
 * Deliberately not a lesson and not on `/lesson/:n`. It teaches no symbol,
 * schedules no review card and holds no position in `lessonSequence` — and
 * positions are the key the persisted stores are written against, so adding
 * one here would shift every stored position and re-point the progress of
 * anyone already part-way through. `startLesson` also requires every earlier
 * position complete, which would make this a wall in front of a returning
 * learner rather than a page they can revisit.
 *
 * So it gets its own route, and the only state it owns is "has this been
 * seen", which exists to stop it presenting itself on every visit. It is
 * always reachable from the Learn hub afterwards: the habits it argues for
 * are exactly the ones a learner stops keeping in week three, which is when
 * re-reading it is worth most.
 */
export function OrientationPage() {
	const navigate = useNavigate();
	const deck = deckPathForLesson(ORIENTATION_LESSON_ID);

	function finish() {
		markOrientationSeen();
		navigate("/");
	}

	if (!deck.ok) {
		return (
			<div className="p-4 space-y-4">
				<p role="alert">This introduction could not be loaded.</p>
				<Button onClick={() => navigate("/")}>Back</Button>
			</div>
		);
	}

	return (
		<div className="p-4 space-y-6">
			<DeckSlide deckPath={deck.path} onComplete={finish} />
			{/* Leaving early still counts as seen. Somebody who already knows how
			    spaced repetition works should not be asked again every launch,
			    and the Learn hub keeps a permanent way back in. */}
			<button
				type="button"
				onClick={finish}
				className="w-full text-sm underline"
				style={{ color: "var(--color-text-muted)" }}
			>
				Skip — I know how this works
			</button>
		</div>
	);
}

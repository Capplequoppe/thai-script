import type { Story } from "../../../domain/script/data/slideTags";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { DeckSlide } from "./DeckSlide";

/**
 * One thing's story, played back out of the lesson that taught it.
 *
 * Not a second copy of the teaching. It is the lesson's own slides, its own
 * pictures and its own narration, filtered to the ones tagged with this
 * subject — so a letter is explained here in the words a learner already
 * heard, rather than in a summary written beside them that would drift the
 * first time either was edited.
 *
 * The whole lesson is deliberately not offered. A learner standing in the
 * market wanting to know why the chicken means mid class is asking a
 * ten-second question, and a twenty-minute lesson is the wrong size of answer;
 * the way back into the lesson proper is the button the letter dialog already
 * has.
 */
export function StoryViewer({
	story,
	title,
	subtitle,
	onClose,
}: {
	/** What to play, or null when nothing is open. */
	story: Story | null;
	title: string;
	subtitle?: string;
	onClose: () => void;
}) {
	return (
		<Dialog open={story !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{/* Radix warns without one, and a screen reader that has been
					    handed only a glyph has been told almost nothing. */}
					<DialogDescription>
						{subtitle ?? "The story, from the lesson that tells it"}
					</DialogDescription>
				</DialogHeader>

				{story && (
					<DeckSlide
						deckPath={story.deckPath}
						teaching={story.tag}
						// Reaching the end of a story closes it. There is no next
						// lesson to unlock and no progress to record: this is a
						// learner looking something up, and finishing a lookup means
						// putting it down.
						onComplete={onClose}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

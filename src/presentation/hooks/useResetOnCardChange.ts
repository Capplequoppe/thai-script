import { useState } from "react";

/**
 * Calls `reset` during render whenever `cardId` changes — before the browser
 * paints the new card.
 *
 * The obvious spelling of this, `useEffect(reset, [card.id])`, resets *after*
 * paint. React only guarantees the effect runs before the next paint when the
 * update is synchronous, and on iOS Safari it frequently is not: the browser
 * paints one frame of the new card while the previous card's `revealed` /
 * `selected` state is still set, so the answer flashes on screen before the
 * prompt settles — which defeats the point of a flashcard.
 *
 * Adjusting state during render makes React discard the in-progress render and
 * immediately re-render with the reset state, so the offending frame never
 * reaches the screen. This is React's documented pattern for deriving state
 * from a changed prop:
 * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 *
 * `reset` must only call state setters — it runs during render, so DOM work
 * (clearing a canvas, playing audio) still belongs in an effect.
 */
export function useResetOnCardChange(cardId: string, reset: () => void): void {
	const [seenCardId, setSeenCardId] = useState(cardId);

	if (seenCardId !== cardId) {
		setSeenCardId(cardId);
		reset();
	}
}

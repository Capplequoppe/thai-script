import { useCallback, useState } from "react";
import { Accuracy } from "../../domain/srs/value-objects/Accuracy";

export function useSessionFlow(totalCards: number) {
	const [cardIdx, setCardIdx] = useState(0);
	const [correct, setCorrect] = useState(0);
	const [incorrect, setIncorrect] = useState(0);

	const isComplete = cardIdx >= totalCards && totalCards > 0;
	const accuracy = Accuracy.fromCounts(correct, correct + incorrect);

	const advance = useCallback((isCorrect: boolean) => {
		if (isCorrect) setCorrect((c) => c + 1);
		else setIncorrect((c) => c + 1);
		setCardIdx((i) => i + 1);
	}, []);

	const reset = useCallback(() => {
		setCardIdx(0);
		setCorrect(0);
		setIncorrect(0);
	}, []);

	return { cardIdx, correct, incorrect, isComplete, accuracy, advance, reset };
}

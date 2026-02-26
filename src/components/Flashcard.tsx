import { useState, useEffect, useCallback } from "react";

import { RatingButtons } from "./RatingButtons";
import { PropertyCard, RecallRating } from "../types";

interface Props {
  card: PropertyCard;
  onRate: (rating: RecallRating) => void;
}

export function Flashcard({ card, onRate }: Props) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [card.id]);

  const handleReveal = useCallback(() => setRevealed(true), []);

  useEffect(() => {
    if (revealed) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        handleReveal();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [revealed, handleReveal]);

  return (
    <div className="space-y-6">
      {card.symbolCharacter && (
        <div className="text-center">
          <span className="thai text-8xl">{card.symbolCharacter}</span>
          {card.audioUrl && (
            <button
              onClick={() => new Audio(card.audioUrl!).play()}
              className="ml-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors align-middle"
              aria-label="Play pronunciation"
            >
              🔊
            </button>
          )}
        </div>
      )}

      <p className="text-center text-lg text-gray-600 dark:text-gray-300">{card.question}</p>

      {!revealed ? (
        <button
          onClick={handleReveal}
          className="w-full py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-lg font-semibold transition-colors"
        >
          Show Answer <span className="text-xs text-gray-400 ml-1">(Space)</span>
        </button>
      ) : (
        <div className="space-y-6">
          <div className="text-center py-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{card.correctAnswer}</p>
          </div>
          <RatingButtons onRate={onRate} />
        </div>
      )}
    </div>
  );
}

import { useEffect } from "react";
import { RecallRating } from "../types";


interface Props {
  onRate: (rating: RecallRating) => void;
}

const ratings: { value: RecallRating; label: string; color: string }[] = [
  { value: 1, label: "Again", color: "bg-red-500 hover:bg-red-600" },
  { value: 2, label: "Wrong", color: "bg-orange-500 hover:bg-orange-600" },
  { value: 3, label: "Hard", color: "bg-yellow-500 hover:bg-yellow-600" },
  { value: 4, label: "Good", color: "bg-green-500 hover:bg-green-600" },
  { value: 5, label: "Easy", color: "bg-emerald-500 hover:bg-emerald-600" },
];

export function RatingButtons({ onRate }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const n = parseInt(e.key);
      if (n >= 1 && n <= 5) onRate(n as RecallRating);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onRate]);

  return (
    <div className="grid grid-cols-5 gap-2">
      {ratings.map(({ value, label, color }) => (
        <button
          key={value}
          onClick={() => onRate(value)}
          className={`${color} text-white rounded-xl py-3 text-sm font-semibold transition-colors`}
        >
          <div className="text-lg">{value}</div>
          <div className="text-xs opacity-80">{label}</div>
        </button>
      ))}
    </div>
  );
}

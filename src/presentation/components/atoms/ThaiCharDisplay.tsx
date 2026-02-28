import { PlayAudioButton } from "./PlayAudioButton";

interface Props {
	character: string;
	/** Tailwind size class, e.g. "text-8xl" or "text-[10rem]" */
	className?: string;
	audioUrl?: string;
	hideAudio?: boolean;
}

export function ThaiCharDisplay({
	character,
	className,
	audioUrl,
	hideAudio,
}: Props) {
	return (
		<div className="flex items-center justify-center">
			<span
				className={`thai leading-none font-normal ${className ?? "text-8xl"}`}
			>
				{character}
			</span>
			{audioUrl && !hideAudio && (
				<PlayAudioButton audioUrl={audioUrl} className="ml-3 w-10 h-10" />
			)}
		</div>
	);
}

import type { CardPool } from "../../shared/CardPool";
import { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";

export class SentenceReviewCard extends ReviewableCard {
	constructor(
		id: string,
		question: string,
		correctAnswer: string,
		choices: readonly string[],
		schedule: SrsSchedule,
		readonly sentenceId: string,
		readonly property: string,
		audioUrl?: string,
	) {
		super(id, question, correctAnswer, choices, schedule, audioUrl);
	}

	get pool(): CardPool {
		return "sentence";
	}

	toDTO() {
		return {
			id: this.id,
			question: this.question,
			correctAnswer: this.correctAnswer,
			choices: this.choices,
			srs: this.schedule.toDTO(),
			audioUrl: this.audioUrl,
			sentenceId: this.sentenceId,
			property: this.property,
		};
	}

	static fromDTO(dto: {
		id: string;
		question: string;
		correctAnswer: string;
		choices: readonly string[];
		srs: ReturnType<SrsSchedule["toDTO"]>;
		sentenceId: string;
		property: string;
		audioUrl?: string;
	}): SentenceReviewCard {
		return new SentenceReviewCard(
			dto.id,
			dto.question,
			dto.correctAnswer,
			dto.choices,
			SrsSchedule.fromDTO(dto.srs),
			dto.sentenceId,
			dto.property,
			dto.audioUrl,
		);
	}
}

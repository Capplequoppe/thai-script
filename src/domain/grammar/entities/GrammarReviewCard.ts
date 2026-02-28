import { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";

export class GrammarReviewCard extends ReviewableCard {
	constructor(
		id: string,
		question: string,
		correctAnswer: string,
		choices: string[],
		schedule: SrsSchedule,
		readonly grammarId: string,
		readonly property: string,
		audioUrl?: string,
	) {
		super(id, question, correctAnswer, choices, schedule, audioUrl);
	}

	get pool(): string {
		return "grammar";
	}

	toDTO() {
		return {
			id: this.id,
			question: this.question,
			correctAnswer: this.correctAnswer,
			choices: this.choices,
			srs: this.schedule.toDTO(),
			audioUrl: this.audioUrl,
			grammarId: this.grammarId,
			property: this.property,
		};
	}

	static fromDTO(
		dto: ReturnType<GrammarReviewCard["toDTO"]>,
	): GrammarReviewCard {
		return new GrammarReviewCard(
			dto.id,
			dto.question,
			dto.correctAnswer,
			dto.choices,
			SrsSchedule.fromDTO(dto.srs),
			dto.grammarId,
			dto.property,
			dto.audioUrl,
		);
	}
}

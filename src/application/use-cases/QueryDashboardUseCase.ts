import type { CardRepository } from "../../domain/ports/CardRepository";
import type { CardPool } from "../../domain/shared/CardPool";
import { CardPools } from "../../domain/shared/CardPool";
import type {
	ApprenticeService,
	ApprenticeStats,
} from "../../domain/shared/services/ApprenticeService";
import type { LeechService } from "../../domain/shared/services/LeechService";
import type { StageCounts } from "../../domain/shared/types";
import type { ReviewableCard } from "../../domain/srs/entities/ReviewableCard";

export class QueryDashboardUseCase {
	constructor(
		private readonly cardRepo: CardRepository,
		private readonly apprenticeService: ApprenticeService,
		private readonly leechService: LeechService,
	) {}

	getStageCounts(pool?: CardPool): StageCounts {
		const pools = pool ? [pool] : CardPools.all();
		const counts: StageCounts = {
			apprentice: 0,
			guru: 0,
			master: 0,
			enlightened: 0,
			burned: 0,
		};

		for (const p of pools) {
			for (const card of this.cardRepo.findAll(p)) {
				const stage = card.stage;
				switch (stage.name) {
					case "Apprentice":
						counts.apprentice++;
						break;
					case "Guru":
						counts.guru++;
						break;
					case "Master":
						counts.master++;
						break;
					case "Enlightened":
						counts.enlightened++;
						break;
					case "Burned":
						counts.burned++;
						break;
				}
			}
		}

		return counts;
	}

	getLeechCards(pool?: CardPool): ReviewableCard[] {
		return this.leechService.getLeechCards(pool);
	}

	getLeechCount(pool?: CardPool): number {
		return this.leechService.getLeechCount(pool);
	}

	getApprenticeStats(): ApprenticeStats {
		return this.apprenticeService.getApprenticeStats();
	}

	canStartLesson(): boolean {
		return this.apprenticeService.canStartLesson();
	}
}

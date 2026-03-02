# Sentence Unlock Progression

Sentences unlock individually when all their component words have been learned as vocabulary cards. This creates a natural drip of content as vocabulary grows.

## Vocabulary Unlock Tiers

Words become available as script lessons are completed and vocabulary cards are generated. The difficulty ratings in `sentences.json` roughly correspond to these tiers:

| Difficulty | Words available | Sentence themes |
|---|---|---|
| 1 | มา, มี, ดี, กิน, กัน | Simple verbs, basic actions |
| 2 | ครับ, ค่ะ, มาก, พูด, ฟัง, รัก, เรา, ลูก, และ, พี่, น้อง | Polite speech, family, emotions |
| 3 | จะ, ไป, อะไร, ชอบ, อยาก, เอา, บอก, สวัสดี, ขอโทษ, ผม, ฉัน, สิ | Greetings, pronouns, desires, questions |
| 4 | ไหม, คุณ, ขอบคุณ, ทำ, หรือ, อาหาร, ไม่ | Full questions, politeness, negation, food |
| 5 | ได้, ต้อง, อยู่, บ้าน, น้ำ, ข้าว, อร่อย, สบายดี, รู้, ดื่ม, หิว | Location, daily life, descriptions, ability |

## Authoring Guidelines

When adding new sentences:

1. Check which words are available at each tier above
2. Only use words that exist in `vocabulary.json`
3. Set `difficulty` to match the highest tier of any component word
4. Write 3 plausible English distractors that test comprehension (not random)
5. Audio-dependent card types (listeningComprehension, sentenceBuilding, selfValidation) only activate when `thai_audio_file` is provided
6. For sentenceBuilding, choose ~5-10 character distractors from the Thai script that learners would know at that level

## Current Sentence Count

- Difficulty 1: 4 sentences
- Difficulty 2: 8 sentences
- Difficulty 3: 12 sentences
- Difficulty 4: 10 sentences
- Difficulty 5: 19 sentences
- **Total: 53 sentences**

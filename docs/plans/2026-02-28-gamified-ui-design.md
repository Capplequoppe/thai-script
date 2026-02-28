# Gamified Thai Royal UI Redesign — Design Document

**Date:** 2026-02-28
**Approach:** B — Restructure + Retheme
**Status:** Approved

---

## Overview

Rework the Thai Script learning PWA into a gamified, Thai-royal-inspired interface. The goal is to make progress feel like an achievement, reinforce consistent daily study, and create an experience that feels dignified and serious rather than playful or marketing-focused. Business logic and domain layer are unchanged; all changes are in the presentation layer.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| SRS stage colors | Thai cultural palette | Replace WaniKani defaults with Thai-meaningful colors |
| Visual identity | Thai royal / scholarly | Cream, royal blue, gold — dignified and serious |
| Themes | Single theme | Themes add complexity without improving learning |
| Gamification depth | Visual + Progress + Achievements | Full depth: heatmap, stage promotions, achievement system |
| Navigation | Bottom tab bar (mobile-first) | Thumb-friendly; feels native on mobile |
| Streaks | Review heatmap (no streak counter) | Honest record without punishing breaks |
| Stage promotion moment | Post-session celebration screen | One celebration moment, no mid-session interruption |

---

## Section 1: Color System & Typography

### CSS Custom Properties (Light Mode)

```css
--color-bg:          #FAFAF5;   /* cream white */
--color-surface:     #FFFFFF;   /* card surfaces */
--color-surface-2:   #F0EDE4;   /* secondary surfaces, hover */
--color-border:      #D6CEB8;   /* subtle border */
--color-text:        #0D1B2A;   /* deep navy */
--color-text-muted:  #6B6B7A;

--color-primary:     #1A3A6B;   /* royal blue */
--color-primary-h:   #142E56;   /* hover */
--color-accent:      #C9A227;   /* royal gold */
--color-accent-h:    #B8911F;
--color-danger:      #C0392B;   /* crimson */

/* SRS Stage Colors */
--stage-apprentice:  #D4688A;   /* lotus pink */
--stage-guru:        #E8951A;   /* saffron */
--stage-master:      #257A5A;   /* jade green */
--stage-enlightened: #1A3A6B;   /* royal blue */
--stage-burned:      #C9A227;   /* temple gold */
```

### Dark Mode Tokens

```css
--color-bg:          #0D1320;
--color-surface:     #131E30;
--color-surface-2:   #1A2740;
--color-border:      #253550;
--color-text:        #EDE8DC;   /* warm cream */
--color-text-muted:  #8A94A6;
/* Stage colors unchanged — vibrant on both modes */
```

### Typography

- **Thai characters:** `Noto Serif Thai` (scholarly feel) with `font-size` 10% larger than current; subtle gold text-shadow on quiz cards
- **Headings:** `font-semibold`, `tracking-tight`
- **Stage labels:** Small-caps (`font-variant: small-caps`) — heraldic feel
- **Monospace:** Retain for grammar pattern display

---

## Section 2: Navigation & Layout Shell

### Bottom Tab Bar (mobile primary)

5 fixed tabs at screen bottom on mobile (`<768px`), top on desktop:

| Tab | Icon concept | Badge |
|---|---|---|
| Dashboard | Lotus flower | Due count (pink pill) |
| Review | Crossed kris daggers | — |
| Lessons | Palm leaf manuscript | — |
| Items | Jewel/gem | — |
| Progress | Temple spire (tiered pagoda) | — |

Icons are custom Thai-inspired SVGs (geometric, not decorative).

### Persistent Top HUD Strip (~40px)

Always visible. Contains:
- **Left:** Due card count — lotus-pink pill when >0, gray when 0
- **Center:** App name (small Thai calligraphy + "Thai Script")
- **Right:** 7-dot week heatmap row — today's dot glows gold if reviewed

### Card Styling

- `border-radius: 1rem` (`rounded-2xl`)
- `box-shadow: 0 2px 8px rgba(13,27,42,0.08)` on light mode
- Section headers: `border-left: 2px solid var(--color-accent); padding-left: 0.75rem`

---

## Section 3: Dashboard

Ordered top-to-bottom by priority:

1. **Primary Action Card** (full-width, dominant)
   - When reviews due: royal blue card, lotus-pink badge showing count, pulsing border if overdue >12h
   - When no reviews due: calm gray, shows "Next review in Xh Xm"
   - Single prominent CTA button

2. **Secondary Actions** (2-column row)
   - Next script lesson (if available)
   - Next vocab/grammar lesson (if available)

3. **Stage Progress Pills** (horizontal scrollable row)
   - 5 pills, one per SRS stage, colored with Thai palette
   - Each shows stage name + card count
   - Tapping navigates to Items filtered by stage

4. **Study Heatmap** (12-week × 7-day grid)
   - Data source: existing `sessionHistory`
   - Gold intensity scale: empty → light gold → gold → deep gold
   - Today's cell has gold ring; hover shows tooltip

5. **Achievement Shelf** (horizontal scroll)
   - 3–4 most recent unlocked badges
   - Locked badges as silhouettes
   - "See all →" links to full achievement page

6. **Upcoming Reviews Forecast** (5 time windows)
   - Now / 1hr / 24hr / 3d / 7d counts

---

## Section 4: Quiz & Review Screens

### Session Header (replaces simple progress bar)

```
[Tab icon] Review Session    7 / 20    Acc: 85%    [✕ End]
████████████░░░░░░░░░░░   35%  ← gold progress bar
```

- Card counter `7/20` gives clear finish line
- Live accuracy motivates maintaining 80%+
- ✕ end-session button (important for mobile)

### Multiple Choice

- Card display: cream surface with 1px gold border (manuscript feel)
- Choice buttons: `min-h-[5rem]`; numbered badge uses Thai numeral as design accent (๑๒๓๔) while keyboard shortcuts remain 1–4
- Correct reveal: gold background flash + checkmark
- Incorrect reveal: crimson tint + correct answer highlighted in gold
- Transition delay: 500ms (down from 800ms)

### Flashcard

- Stage-colored dot in card corner (current stage of that card)
- Back reveal: slide-up animation
- Rating buttons: Again=red, Wrong=orange, Hard=amber, Good=jade, Easy=gold

### Session Complete Screen

Sections (each conditional):
1. **Stats grid:** Cards / Correct / Accuracy (always shown)
2. **Stage Promotions:** Cards that leveled up, with new stage color badge (shown if any promotions occurred)
3. **Achievement Unlocked:** Badge name + icon (shown if achievement earned this session)
4. **Actions:** "Review More" | "Go to Dashboard"

---

## Section 5: Achievements, Heatmap & Lesson Path

### Achievement System (12 milestones, v1)

| ID | Name | Icon Motif | Trigger |
|---|---|---|---|
| `first_lesson` | First Steps | Lotus bud | Complete lesson 1 |
| `five_lessons` | Scholar's Path | Palm leaf scroll | Complete 5 lessons |
| `all_lessons` | Royal Student | Temple spire | Complete all 25 lessons |
| `first_review` | First Review | Crossed daggers | Complete first review session |
| `century` | Century | Lotus in circle | 100 total reviews |
| `warrior` | Warrior's Discipline | Garuda silhouette | 500 total reviews |
| `first_guru` | Apprentice Graduate | Blooming lotus | First card reaches Guru |
| `first_master` | Guru Achieved | Saffron flame | First card reaches Master |
| `first_burned` | Burning Bright | Gold flame | First card reaches Burned |
| `vocab_start` | Word Weaver | Thai knot | Start vocabulary learning |
| `grammar_start` | Grammar Master | Temple gate | Complete first grammar lesson |
| `perfect_session` | Golden Seal | Golden seal | 100% accuracy, min 10 cards |

**Storage:** Add `achievements: string[]` to `LearnerState` (list of unlocked achievement IDs).
**Computation:** Evaluated after each session by an `AchievementService` in the domain layer.

### Study Heatmap

- Computed from existing `sessionHistory` — no new data needed
- 12 weeks × 7 days grid; cells `8×8px`, `2px` gap
- Color scale (all gold tones): empty `#E8E0D0` → light `#E8B887` → medium `#C9A227` → heavy `#8B6914`
- Today's cell: gold ring if reviewed, plain ring if not yet
- Hover tooltip: "Wed Mar 5: 23 cards reviewed"

### Lesson Path (SVG)

Replaces the `grid-cols-5` numbered button grid on Progress page:

- Bottom-to-top ascending path (upward = progressing)
- Nodes: circles with lesson number, connected by thin path lines
- **Completed:** Jade green fill, gold checkmark
- **Available next:** Royal blue fill, subtle gold pulse animation
- **Locked:** Muted gray, lock icon
- Rendered as inline SVG for clean scaling on all screen sizes

---

## Domain Changes Required

| Change | File | Impact |
|---|---|---|
| Add `achievements: string[]` to `LearnerState` | `src/domain/shared/types.ts` | Migration: default to `[]` |
| Add `AchievementService` | `src/domain/shared/services/AchievementService.ts` | Pure computation, no storage |
| Update `LearnerStateRepository` | `src/domain/ports/LearnerStateRepository.ts` | Add `addAchievement()` |
| Update `StorageLearnerStateRepository` | `src/infrastructure/persistence/StorageLearnerStateRepository.ts` | Implement new method |

---

## Presentation Changes Required

| Area | Change |
|---|---|
| `src/index.css` | Add CSS custom property token system; replace hardcoded Tailwind colors |
| `Layout.tsx` | Bottom tab bar + HUD strip; remove top nav |
| `Dashboard.tsx` | Full redesign per Section 3 layout |
| `ProgressPage.tsx` | Lesson path SVG; add heatmap; achievement shelf |
| `ReviewPage.tsx` | Session header HUD; updated session complete screen |
| `LessonPage.tsx` | Updated session header; updated complete screen |
| `VocabularyPage.tsx` | Updated session header; updated complete screen |
| `GrammarPage.tsx` | Updated session header; updated complete screen |
| `MultipleChoice.tsx` | Gold border card; Thai numeral badges; faster transition |
| `Flashcard.tsx` | Stage dot; slide-up reveal; updated rating button colors |
| New: `HeatmapWidget.tsx` | Study heatmap component |
| New: `AchievementBadge.tsx` | Badge icon + locked state |
| New: `LessonPath.tsx` | SVG lesson path |
| New: `StagePromotionPanel.tsx` | Post-session stage promotion display |
| New: `BottomTabBar.tsx` | Mobile-first tab navigation |
| New: `HudStrip.tsx` | Persistent top HUD strip |

---

## Out of Scope

- User accounts / cloud sync
- Social features / leaderboards
- Audio redesign
- Custom achievement artwork (use geometric SVGs only)
- Animated transitions between pages (deferred to post-v1)
- Thai numeral keyboard shortcuts (visual only — shortcuts remain 1–4)

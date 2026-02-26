# Export/Import Progress Design

## Goal

Allow users to export their learning progress as a JSON file and import it back, merging with existing progress. Accessible from a new Settings page.

## Decisions

- **Export format:** JSON file download
- **Import behavior:** Merge with existing progress
- **Merge strategy:** For duplicate cards, keep the one with higher `srs.repetitions`
- **UI location:** New `/settings` page with gear icon in nav

## Architecture

### New Files

- `src/merge-service.ts` — Pure function for merging two `LearnerState` objects
- `src/pages/SettingsPage.tsx` — Settings page with export, import, and reset sections

### Modified Files

- `src/interfaces.ts` — Add `exportData(): string` and `importData(json: string): void` to `IStorage`
- `src/storage.ts` — Implement export/import on `InMemoryStorage` and `LocalStorageAdapter`
- `src/context/AppContext.tsx` — Expose `exportData` and `importData` on `AppContextValue`
- `src/App.tsx` — Add `/settings` route
- `src/components/Layout.tsx` — Add "Settings" nav link

## Merge Logic

`mergeLearnerStates(current: LearnerState, incoming: LearnerState): LearnerState`

- `completedLessons`: Union of both arrays (deduplicated)
- `currentLesson`: Preserve current (local) value
- `cards`: Union of both; for cards present in both, keep the one with higher `srs.repetitions`
- `sessionHistory`: Combine both, deduplicate by `sessionId`

## Data Flow

### Export

1. User clicks "Download Progress" on Settings page
2. `exportData()` called on context → calls `storage.load()` → serializes to JSON
3. Creates a Blob and triggers download as `thai-script-progress-YYYY-MM-DD.json`

### Import

1. User selects a `.json` file via file input
2. File content read as text
3. Validated against `LearnerState` shape
4. `importData(json)` called → parses JSON → `mergeLearnerStates(current, incoming)` → `storage.save(merged)`
5. UI refreshes via `refresh()`

## Validation

On import, verify the JSON has the required `LearnerState` fields:
- `completedLessons` is an array of numbers
- `cards` is a record of `PropertyCard` objects
- `sessionHistory` is an array of `SessionSummary` objects

Show error message if validation fails.

## Settings Page Layout

Three sections:
1. **Export** — "Download Progress" button with description
2. **Import** — File picker + import button + status/error feedback
3. **Danger Zone** — "Reset All Progress" button with confirmation

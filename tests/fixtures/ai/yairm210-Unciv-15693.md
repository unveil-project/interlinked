This change edits `core/src/com/unciv/logic/map/tile/Tile.kt` and `core/src/com/unciv/ui/screens/pickerscreens/ImprovementPickerScreen.kt`. The edited code sits in `Tile` and `ImprovementPickerScreen`. It addresses the behavior reported in issue #15109.

Tests for this live in `tests/src/com/unciv/logic/map/TileImprovementConstructionTests.kt`. The targeted tests for the changed files pass locally.

Fixes #15109

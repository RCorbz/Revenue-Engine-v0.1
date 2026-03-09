---
description: Steps to finalize a feature and distill knowledge for token optimization.
---

1. **Verify OBT Success**: Run associated Playwright/Unit tests to confirm OBT-ID passes 100%.
2. **Generate Knowledge Item (KI)**: Create a new KI in `.knowledge/feature_name.md` containing:
   - **Architectural Summary**: A 5-sentence high-level overview of how the feature works.
   - **Logic Implementation**: A list of key symbols (functions/classes) and their roles.
   - **Grounded Pitfalls**: Known edge cases or configuration quirks found during dev.
3. **Notify User**: Direct the user to the new KI for future architectural alignment.
4. **Context Reset**: Use the `/context-pruning` workflow to clear research logs.

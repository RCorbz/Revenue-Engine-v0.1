---
description: Fetch OBT requirements only when needed for specific logic/test implementation.
---

1. **Identify Target OBT**: Identify the OBT-ID needed for the specific module being implemented.
2. **Retrieve Requirements**: Use `bible-server` to fetch ONLY the requested OBT-ID row from `docs/project-bible.md`.
3. **Logic Implementation**: Map the success metric directly to the implementation unit or Playwright test code.
4. **Validation Test**: Run the specific test to confirm the OBT is met.
5. **Mark Done**: Update the `check.txt` or OBT table in `docs/project-bible.md` if necessary.

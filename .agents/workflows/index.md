---
description: Index Project (11.2 Munch Mode)
---

# Trigger: /index

## 🤖 STEPS
1. **Registry Sync:** Run `thv registry sync` to refresh the local vMCP map. (Note: use `-o` or `--optimize` for 11.2 Munch Mode synchronization if available).
2. **Session Load:** Signal `THV_SESSION_V2` by setting the environment variable for the persistent metadata cache.
3. **Munch Validation:** Verify that the "Project Bible" is successfully mapped as a `Lazy Load` resource in `.toolhive/context_map.xml`.
4. **Savings Report:** Execute `thv status mcp-optimizer` or `jcodemunch` statistics to estimate current map savings.

## 🎯 GOAL
Report "11.2 SESSION_ACTIVE" and provide a total token-savings estimate for the current map.
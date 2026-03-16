---
description: Index Project (12.1 Munch Mode)
---

# Trigger: /index

## 🤖 STEPS
// turbo
1. **Registry Sync:** Run `powershell -ExecutionPolicy Bypass -File .\scripts\boot.ps1` to refresh the local vMCP registry cache (replaces `registry sync` in 12.1).
2. **Session Load:** Signal `THV_SESSION_V2` by setting the environment variable for the persistent metadata cache.
3. **Munch Validation:** Verify that the "Project Bible" is successfully mapped as a `Lazy Load` resource in `.toolhive/context_map.xml`.
4. **Savings Report:** Consult `mcp-optimizer` token metrics for dynamic evaluations or use `jcodemunch` outlines to maintain token budget.

## 🎯 GOAL
Report "12.1 SESSION_ACTIVE" and provide a total token-savings estimate for the current map using mcp-optimizer metrics.
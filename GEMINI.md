# 🚀 Gemini Assistant Workspace & Tooling Integration

This project uses a hybrid approach to token optimization, combining **ToolHive** for high-level context management and **jcodemunch-mcp** for deep, granular code analysis.

## 🛠 Active Tools Synergy

| Tool | Role | Function |
| :--- | :--- | :--- |
| **ToolHive** | **Guardrail** | Enforces directory exclusions (`node_modules`, `build`, `.git`) and provides the `Lazy Load` registry for the Project Bible. |
| **jcodemunch-mcp** | **Optimizer** | Provides AST-based symbol search (e.g., `outline_file`, `search_symbols`) to avoid reading redundant file content. |
| **mcp-optimizer** | **Routing** | Evaluates tasks to find the most token-efficient tool path, balancing context and ensuring dynamic caching. |
| **bible-server** | **Grounded Info** | Grants read-only filesystem access to project-specific documentation beyond the scope of local files. |

## 📖 The "Munch" Strategy (Token Optimization)

To maintain a high-velocity development cycle without hitting context limits:

1.  **Exclusion First:** Large directories are marked as `Hard Excluded` in `.toolhive/context_map.xml`.
2.  **Lazy Load Docs:** Reference `docs/project-bible.md` via ToolHive only when broad strategic overview is needed.
3.  **The "Symbol-Only" Workflow (Active Development):**
    -   **Step 1 (Outline First):** For any file >50 lines, ALWAYS call `jcodemunch.outline_file` before reading content.
    -   **Step 2 (Targeted Retrieval):** Use `jcodemunch.get_symbol` or `jcodemunch.get_implementation` for the specific functions/classes being edited. Avoid `view_file` on large implementation files.
    -   **Step 3 (Context Pruning):** Once an edit is made and verified, use the `/context-pruning` workflow to clear the context for the next feature.
4.  **The "Zero-Waste" Protocols:**
    -   **Grounded OBT Injection**: Fetch OBT requirements only when needed via the `/obt-injection` workflow.
    -   **Feature-Completion Checkpoints**: Finalize features using the `/feature-completion` workflow to generate a Knowledge Item (KI) and "compress" the logic for future turns.
5.  **AST Retrieval:** When examining complex logic within `.svelte`, `.ts`, or `.js` files, prefer using `jcodemunch-mcp` tools over `view_file` to "munch" (reduce) token consumption by retrieving only the necessary symbols.
6.  **Dynamic Routing:** Use `mcp-optimizer` (`find_tool`) as a routing layer to evaluate tasks. This ensures you execute the most token-optimal toolpath before reading any contiguous file blocks.


---
*Configured in mcp_config.json as standard `python -m jcodemunch_mcp.server`.*

## 🚀 COMMIT PROTOCOL
To avoid "hanging" commits and clarify the IDE's requirement for a commit message:
1.  **Summarize Results**: At the end of every task, the Assistant MUST provide a concise 1-line summary of changes.
2.  **Prompt for Approval**: Use `notify_user` to present this summary and ask for an "Accept and Commit" approval.
3.  **Automated Commit**: Upon user approval, the Assistant should execute `git add .` and `git commit -m "[summary]"` via `run_command` instead of relying on the user to push the IDE button.
4.  **Push**: Immediately follow with `git push` (or dry-run if preferred) to finalize the change.

## 🚀 BOOT PROTOCOL
- **Immediate Action:** Upon project initialization or at the start of any new session, you MUST execute the `/index` workflow.
- **Goal:** Update the ToolHive `context_map.xml` and refresh symbol maps before any code analysis begins.
- **Activation:** This rule is **Always On**. Do not wait for user permission to start the indexing phase.
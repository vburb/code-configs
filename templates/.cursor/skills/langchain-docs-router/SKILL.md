---                       
name: langchain-docs-router
description: Routes documentation lookups for LangChain platform development. Use when user asks about LangChain, LangGraph, LangSmith, LCEL, Runnables, agents, memory, retrieval, checkpointers, tracing, or migration issues. Query docs-langchain first for LangChain-specific behavior, then use context7 for external integrations and fallback.
---

# LangChain Docs Router
## Goal
Provide accurate, version-aware answers for LangChain platform work by routing docs lookups to the right source:
- `docs-langchain` for LangChain/LangGraph/LangSmith specifics
- `context7` for non-LangChain libraries and integration dependencies
- both when a task crosses framework boundaries
## Routing Rules
1. Classify the request:
- **LangChain-core**: LCEL, Runnable chains, LangGraph state/edges, LangSmith traces, callbacks, checkpointers, tool calling, output parsers
- **Hybrid integration**: LangChain + OpenAI/Anthropic, vector DB, Redis, Postgres, FastAPI, Next.js, etc.
- **Non-LangChain**: mostly third-party API/framework question
- **Unclear**: missing runtime/version/context
2. Choose tools:
- **LangChain-core** -> query `docs-langchain` first
- **Hybrid integration** -> query `docs-langchain` first, then `context7` for dependency details
- **Non-LangChain** -> use `context7`
- **If docs-langchain result is weak/empty** -> fallback to `context7` with precise library/version query
3. Never treat one source as complete for hybrid topics. Combine them.
## Query Construction
Use focused queries with stack + version context when available.
Good query patterns:
- `"LangGraph conditional edges with StateGraph Python"`
- `"LangChain RunnableParallel error handling async"`
- `"LangSmith trace metadata custom tags"`
- `"LangChain + Redis vector store filtering"`
- `"LangGraph checkpoint persistence postgres"`
If user did not provide versions, infer likely versions but state assumptions explicitly.
## Answer Quality Requirements
- Prefer official docs behavior over memory.
- If behavior is version-sensitive, say so clearly.
- If sources conflict:
- prefer newer docs
- call out conflict and give safest implementation
- Include one practical code path, not many speculative options.
- Keep code examples minimal and runnable.
## Response Template
Use this structure:
1. **Recommendation**: direct answer in 1-3 bullets
2. **Implementation**: concise steps or snippet
3. **Version notes**: assumptions and compatibility caveats
4. **Sources used**: which MCP source informed which part
## Guardrails
- Do not claim docs say something unless it was looked up.
- Do not overfit old APIs when migration paths exist.
- Ask one clarifying question only when required to avoid a wrong answer.
- For production-impacting guidance (auth, persistence, retries, tracing), include explicit failure-mode notes.
## Fast Workflow
1. Identify query type (LangChain-core, hybrid, non-LangChain, unclear)
2. Run docs lookup(s) per routing rules
3. Synthesize into one recommended approach
4. Add version assumptions + source mapping
5. Provide minimal implementation snippet
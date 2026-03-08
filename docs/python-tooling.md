# Python Tooling

All tool configuration lives in `pyproject.toml`. The template is at `templates/pyproject/pyproject.toml` — copy it to your project root and customize the project metadata.

## Package Manager: uv

[uv](https://docs.astral.sh/uv/) replaces Poetry as the package manager. Quick reference:

```bash
uv init --name my-project   # scaffold a new project
uv sync                      # install all dependencies (including dev)
uv add requests              # add a runtime dependency
uv add ruff --dev            # add a dev dependency
uv run pytest                # run a command in the project environment
```

Cross project likely Dev dependencies are declared in `[dependency-groups]` in `pyproject.toml`:

```toml
[dependency-groups]
dev = [
    "ruff>=0.9",
    "pytest>=8",
    "pytest-cov>=6",
    "pytest-asyncio>=0.24",
    "pytest-xdist>=3.5",
    "mypy>=1.13",
    "pre-commit>=4",
]
```

## Linting & Formatting: Ruff

[Ruff](https://docs.astral.sh/ruff/) is used for both linting and formatting, replacing Black, isort, pylint, and flake8.

### Key Settings

| Setting | Value | Notes |
|---------|-------|-------|
| Line length | 180 | Set in `[tool.ruff]`; the editor may use a different display value |
| Target version | `py313` | Update to match your project |
| Quote style | Double | |
| Indent style | Spaces (4) | |

### Lint Rules

Rules are organized in three tiers in the template `pyproject.toml`:

**Tier 1 — Core:** pycodestyle (`E`, `W`), pyflakes (`F`), isort (`I`), pyupgrade (`UP`), bugbear (`B`), Ruff-specific (`RUF`)

**Tier 2 — Code Quality:** pep8-naming (`N`), simplify (`SIM`), comprehensions (`C4`), pie (`PIE`), perflint (`PERF`), refurb (`FURB`), print statements (`T20`), return style (`RET`), pytest style (`PT`), type-checking (`TC`)

**Tier 3 — DS-Specific:** bandit/security (`S`), builtins (`A`), import conventions (`ICN`), pandas-vet (`PD`), NumPy (`NPY`), datetimez (`DTZ`), f-strings (`FLY`), future annotations (`FA`), logging (`LOG`), tidy imports (`TID`)

### Suppressing Rules

- **Inline:** add `# noqa: RULE` to the line (e.g. `# noqa: S101`).
- **Per-file:** use `[tool.ruff.lint.per-file-ignores]` in `pyproject.toml`.
- **Project-wide:** add rule codes to the `ignore` list.

Ruff labels fixes as **safe** and **unsafe**. By default only safe fixes are applied. Pass `--unsafe-fixes` to apply unsafe ones explicitly.

### Running Ruff

```bash
uv run ruff check .              # lint
uv run ruff check . --fix        # lint + auto-fix safe issues
uv run ruff format .             # format
ruff check /path/to/file.py --show-settings   # see resolved config
```

## Type Checking: mypy

Ruff handles lint rules but does **not** do type checking. [mypy](https://mypy.readthedocs.io/) fills that role.

The template config is relaxed to start — `strict = false`, `disallow_untyped_defs = false` — so it won't block projects that don't yet have type annotations. Tighten these as your project matures.

```toml
[tool.mypy]
python_version = "3.12"
strict = false
warn_return_any = true
warn_unused_configs = true
warn_unreachable = true
disallow_untyped_defs = false
ignore_missing_imports = true
exclude = ["tests/", "notebooks/", "scripts/", "examples/", "static/"]
```

```bash
uv run mypy . --ignore-missing-imports
```

## Testing: pytest

pytest is configured in `[tool.pytest.ini_options]` with sensible defaults:

- **Test discovery:** `tests/` directory, files matching `test_*.py`.
- **Markers:** `slow` and `integration` are predefined — use `-m "not slow"` to skip slow tests locally.
- **Async:** `asyncio_mode = "auto"` — async test functions work without extra decorators.
- **Fail fast:** `-x` stops on first failure (remove from `addopts` if you prefer full runs).

```bash
uv run pytest                                  # run all tests
uv run pytest --cov=my_package --cov-report=term   # with coverage
uv run pytest -m "not slow"                    # skip slow tests
```

### Coverage

Coverage is configured under `[tool.coverage.*]`. The template sets `fail_under = 0` — raise this once you have a test suite established (recommended: 80+).

## Git Hooks

Template hooks in `templates/git_hooks/` enforce Ruff checks locally without requiring the `pre-commit` Python framework.

### Installation

```bash
bash templates/git_hooks/install-hooks.sh
```

Or manually:

```bash
cp templates/git_hooks/pre-commit  .git/hooks/pre-commit
cp templates/git_hooks/pre-push    .git/hooks/pre-push
chmod +x .git/hooks/pre-commit .git/hooks/pre-push
```

### What They Do

| Hook | Scope | Behavior |
|------|-------|----------|
| `pre-commit` | Staged `.py` files only | Fast — only checks files you're committing |
| `pre-push` | Entire repo | Full validation before code reaches the remote |

Both hooks run `ruff format --check` and `ruff check`. Neither auto-fixes — they print instructions so you stay in control.

Both are **non-blocking when ruff is missing** — they warn and exit cleanly, so they won't break collaborators who haven't installed ruff yet.

### Skipping Hooks

```bash
SKIP_RUFF=1 git commit -m "wip: quick save"   # skip pre-commit
SKIP_RUFF=1 git push                            # skip pre-push
```

### Customization

- **Change file patterns:** edit the `grep -E '\.py$'` pattern in `pre-commit`.
- **Add mypy:** insert a `mypy .` step after the ruff checks in `pre-push`.
- **Add pytest:** add a pytest block to `pre-push` for test-before-push.
- **Config file:** hooks read `pyproject.toml` or `ruff.toml` from the project root automatically.

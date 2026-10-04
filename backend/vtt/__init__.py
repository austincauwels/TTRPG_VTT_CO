"""The Candela Obscura VTT backend, split out of main.py.

main.py stays the entry point (uvicorn main:app). It loads this package, creates
the tables, runs init_db and re-exports the names the tests use. See
docs/refactor/STRUCTURE.md for what lives where.
"""

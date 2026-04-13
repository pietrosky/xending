# Product Overview

Xending Capital is a Mexican SOFOM ENR (non-regulated financial entity) building an automated enterprise credit scoring and lending platform.

## What it does

- Evaluates Mexican SMEs (PyMEs) for creditworthiness using 16 independent analysis engines, 8 decision engines, and 20 cross-analysis checks
- Automates the full credit lifecycle: origination → scoring → decision → contracts → portfolio management → monitoring → renewal
- Provides FX financing (USD→MXN with spread-based revenue) and direct lending (40% annual rate) products with 2-45 day bullet terms

## Key domain concepts

- Three-layer architecture: Data (Capa 1) → Analysis Engines (Capa 2) → Decision Engines (Capa 3)
- External data providers: Syntage (SAT fiscal data, Buró de Crédito, Registro Público, Hawk compliance checks) and Scory (PLD/KYC identity verification)
- Compliance-first: PLD (anti-money laundering) and KYC checks are mandatory gates before any analysis
- Deterministic business logic: all scoring, limits, and decisions are pure functions. AI is only used for interpretation, OCR, and communication — never for calculations or approvals
- Multi-tenant / whitelabel ready: designed to be sold as SaaS to other financial institutions

## Two main applications in this repo

1. `credit-scoring/` — React SPA for credit analysts and FX brokers (the main product)
2. `fx-pdf-generator/` — Node.js service for generating FX deal confirmation PDFs

## Language

Product documentation and domain terminology are primarily in Spanish. Code (variables, functions, comments) is in English. UI labels mix both.

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: cs_applications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_applications (id, rfc, company_name, requested_amount, term_months, currency, status, scoring_version, created_by, created_at, updated_at) FROM stdin;
fe880cd2-42ac-41ba-8cc4-b17f38eee623	DAZ050101AAA	Distribuidora Azteca S.A. de C.V.	5000000	24	MXN	pending_scoring	\N	\N	2026-04-16 19:29:47.162203+00	2026-04-16 19:29:47.162203+00
74102500-90a7-4592-b8c0-94b6b35a8899	TNO180315BBB	Tecnologia Nortena S. de R.L. de C.V.	250000	12	USD	pending_scoring	\N	\N	2026-04-16 19:29:47.171582+00	2026-04-16 19:29:47.171582+00
a98aca81-21dc-4a11-8c22-7a1460a2888c	DAZ050101AAA	Distribuidora Azteca S.A. de C.V.	5000000	24	MXN	pending_scoring	\N	\N	2026-04-16 19:44:56.899637+00	2026-04-16 19:44:56.899637+00
f1942d02-d319-4e19-a762-f97c645e38c2	TNO180315BBB	Tecnologia Nortena S. de R.L. de C.V.	250000	12	USD	pending_scoring	\N	\N	2026-04-16 19:44:56.90565+00	2026-04-16 19:44:56.90565+00
\.


--
-- Data for Name: cs_ai_analysis; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_ai_analysis (id, application_id, risk_narrative, top_risks, top_strengths, confidence_score, hidden_risks, trend_narrative, created_at) FROM stdin;
\.


--
-- Data for Name: cs_ai_recommendations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_ai_recommendations (id, application_id, recommendation_type, recommendation_text, priority, engine_source, created_at) FROM stdin;
\.


--
-- Data for Name: cs_ai_scenarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_ai_scenarios (id, application_id, scenario_type, scenario_description, impact_assessment, probability, created_at) FROM stdin;
\.


--
-- Data for Name: cs_api_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_api_cache (id, provider, endpoint, rfc, response_data, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: cs_api_calls; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_api_calls (id, application_id, provider, endpoint, status_code, latency_ms, error_message, created_at) FROM stdin;
\.


--
-- Data for Name: cs_application_status_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_application_status_log (id, application_id, old_status, new_status, changed_by, reason, created_at) FROM stdin;
\.


--
-- Data for Name: cs_audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_audit_log (id, application_id, action, details, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: cs_benchmarks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_benchmarks (id, sector, size_category, region, metric_name, metric_label, benchmark_value, percentile_25, percentile_50, percentile_75, unit, source, effective_date, active, created_at, sample_size) FROM stdin;
44db4d3a-88b3-4904-ac2e-497de5fd5fbd	general	small	\N	dscr	Debt Service Coverage Ratio	1.3	1.1	1.3	1.8	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
5ff12ccc-95e9-447f-bb44-ace1fb1d3aa0	general	medium	\N	dscr	Debt Service Coverage Ratio	1.3	1.1	1.3	1.8	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
d87992aa-d422-4e6c-8a58-4a43bc49b0a3	general	large	\N	dscr	Debt Service Coverage Ratio	1.3	1.2	1.5	2.0	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
c913e723-9a7b-4cdf-8d59-3f6a2a59f97f	general	micro	\N	dscr	Debt Service Coverage Ratio	1.2	1.0	1.2	1.5	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
1a966e98-16c4-498f-b776-d347f65f1d76	general	small	\N	current_ratio	Current Ratio	1.2	1.0	1.2	1.6	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
20691571-28f8-4ac7-9a5a-edd31a8fd7d3	general	medium	\N	current_ratio	Current Ratio	1.2	1.0	1.2	1.6	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
742ee080-4dab-4c1a-8067-7deafb50dcf2	general	large	\N	current_ratio	Current Ratio	1.3	1.1	1.3	1.8	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
45b0e240-fd31-4fa5-8f08-2a4bd0cfa758	general	micro	\N	current_ratio	Current Ratio	1.1	0.9	1.1	1.4	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
b0133d82-dff7-4be4-bff4-e5f4f6c76d67	general	small	\N	quick_ratio	Quick Ratio	0.8	0.6	0.8	1.1	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
4e84fc7f-4d03-4857-bd0d-ca3d3d2b394a	general	medium	\N	quick_ratio	Quick Ratio	0.8	0.6	0.8	1.1	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
932d2cc4-a103-4129-9b87-245d184fe207	general	small	\N	leverage	Leverage (Debt/Assets)	0.65	0.45	0.55	0.65	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
3a15b200-a596-4a45-8810-7e15a87b6c1f	general	medium	\N	leverage	Leverage (Debt/Assets)	0.65	0.40	0.50	0.65	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
5eda6a08-d3b4-4ff6-a2f6-6703f6a7de01	general	large	\N	leverage	Leverage (Debt/Assets)	0.60	0.35	0.45	0.60	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
3730aa32-b5f6-4ff5-bf44-04c3003f02c4	general	micro	\N	leverage	Leverage (Debt/Assets)	0.70	0.50	0.60	0.70	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
0e5b5754-bb48-409b-a0c8-6b8f01e143c4	general	small	\N	debt_equity_ratio	Debt to Equity	2.0	1.0	1.5	2.0	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
a6c256f9-27ac-440f-97f9-3c71bd51d015	general	medium	\N	debt_equity_ratio	Debt to Equity	2.0	0.8	1.3	2.0	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
83e37cce-6108-43e8-a676-90e29530644f	general	small	\N	margin	Operating Margin	0.10	0.05	0.10	0.18	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
60681ee1-b70e-443b-b7d9-48dccdb1f4f5	general	medium	\N	margin	Operating Margin	0.10	0.06	0.10	0.18	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
2c2ee690-8324-47ad-9ad7-c996c1e95163	general	large	\N	margin	Operating Margin	0.12	0.07	0.12	0.20	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
8d0673e0-9414-4392-938e-614b5709cdd7	general	micro	\N	margin	Operating Margin	0.08	0.03	0.08	0.15	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
bd66558d-21ae-441c-b2a5-0b6990276cf9	general	small	\N	gross_margin	Gross Margin	0.25	0.18	0.25	0.35	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
088d6fcc-071f-4627-b7bb-826734523f39	general	medium	\N	gross_margin	Gross Margin	0.25	0.18	0.25	0.35	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
2d20e2b2-7045-40b8-8ad3-4563a8d27a04	general	small	\N	roa	Return on Assets	0.05	0.02	0.05	0.10	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
a3e25ba3-772e-479a-8200-7a230d0223a9	general	medium	\N	roa	Return on Assets	0.05	0.03	0.05	0.10	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
5249b0b5-520a-49b2-95e9-b72fdde11f24	general	small	\N	roe	Return on Equity	0.10	0.05	0.10	0.20	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
540605fb-0811-49ec-880b-9b407f8d6ab7	general	medium	\N	roe	Return on Equity	0.10	0.05	0.10	0.20	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
7e8c006f-2573-475a-a718-40b1978f1c79	general	small	\N	interest_coverage	Interest Coverage	2.0	1.5	2.0	3.5	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
8b0e5dd7-7db6-4d37-9f5e-2c561af6c6e9	general	medium	\N	interest_coverage	Interest Coverage	2.0	1.5	2.5	4.0	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
0f5970c8-c84b-42a5-bd36-e4c214a69d60	general	small	\N	dso	Days Sales Outstanding	60	35	50	60	days	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
ccb4a7a0-3c50-425c-83ad-31cdd45b045d	general	medium	\N	dso	Days Sales Outstanding	60	30	45	60	days	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
cf559bff-58b4-4729-a32e-5136497d8ac0	general	large	\N	dso	Days Sales Outstanding	55	25	40	55	days	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
1f93ef7b-0396-4139-ac47-33072895eb20	general	micro	\N	dso	Days Sales Outstanding	70	40	55	70	days	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
c5bf4069-41d2-4876-9b0b-3b82240c3d77	general	small	\N	dpo	Days Payable Outstanding	45	25	35	45	days	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
146e5785-3e15-49d1-bb1b-1563f92023ac	general	medium	\N	dpo	Days Payable Outstanding	45	25	35	45	days	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
bc508890-59bd-4737-bb62-9b0f2eb1c401	general	small	\N	inventory_days	Inventory Days	90	30	60	90	days	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
460d5cd9-ca4c-4a22-bdd9-7c77bb59a144	general	medium	\N	inventory_days	Inventory Days	90	25	55	90	days	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
f971d9bd-3536-442c-a7e9-fd9c40d64398	general	small	\N	revenue_growth	Revenue Growth YoY	0.05	0.00	0.05	0.15	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
4248e584-e4f3-4962-8654-57ddf01db507	general	medium	\N	revenue_growth	Revenue Growth YoY	0.05	0.00	0.05	0.15	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
700fe80a-ef7b-489d-8bc6-644e98939f17	general	small	\N	cash_conversion_cycle	Cash Conversion Cycle	90	30	60	90	days	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
a1bc8616-1da3-4b89-a642-327090b0ff99	general	medium	\N	cash_conversion_cycle	Cash Conversion Cycle	90	25	55	90	days	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
1d04165e-6f6d-4539-9196-9e36da8924c9	general	small	\N	employee_productivity	Revenue per Employee	400000	200000	400000	700000	MXN	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
1d98aafd-ecd3-426b-a91f-7255ef3f7832	general	medium	\N	employee_productivity	Revenue per Employee	400000	250000	450000	800000	MXN	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
d4b884e9-bec9-433a-8ada-01d7e29a4cc2	general	small	\N	working_capital_efficiency	Working Capital / Revenue	0.15	0.08	0.15	0.25	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
a4404357-ec3d-4a0f-962c-43188c60cb75	general	medium	\N	working_capital_efficiency	Working Capital / Revenue	0.15	0.08	0.15	0.25	%	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
0b661557-72a5-4584-8880-4b3e563ea32e	general	small	\N	asset_turnover	Asset Turnover	0.8	0.5	0.8	1.2	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
91ace0c0-d22b-4458-8a3d-84bde83cdfb7	general	medium	\N	asset_turnover	Asset Turnover	0.8	0.5	0.8	1.3	ratio	static	2026-01-01	t	2026-04-16 19:28:11.540592+00	0
7aa85e34-aa9b-4662-b939-5c65151b1efc	general	small	\N	dscr	Debt Service Coverage Ratio	1.3	1.1	1.3	1.8	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
2fb4652c-c3ba-4838-bfcf-8029d6c9a6c1	general	medium	\N	dscr	Debt Service Coverage Ratio	1.3	1.1	1.3	1.8	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
e229b693-cf2f-4b89-99f9-0105adf535ed	general	large	\N	dscr	Debt Service Coverage Ratio	1.3	1.2	1.5	2.0	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
5f0d465a-5e9a-417d-849c-bd3caaea3da5	general	micro	\N	dscr	Debt Service Coverage Ratio	1.2	1.0	1.2	1.5	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
42869d41-c2b3-4ab2-8714-c7e732ba8eaa	general	small	\N	current_ratio	Current Ratio	1.2	1.0	1.2	1.6	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
02919dbf-ef5e-470b-a4e8-d984c20e621f	general	medium	\N	current_ratio	Current Ratio	1.2	1.0	1.2	1.6	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
1b1a211a-0341-4aec-9bf3-4e45e26ab7e7	general	large	\N	current_ratio	Current Ratio	1.3	1.1	1.3	1.8	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
46b035fc-a967-4ca5-96f7-e116f5f05cf2	general	micro	\N	current_ratio	Current Ratio	1.1	0.9	1.1	1.4	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
836000a3-0787-42c7-91d3-7b008fbf4f63	general	small	\N	quick_ratio	Quick Ratio	0.8	0.6	0.8	1.1	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
87b243f3-22c0-4a75-b07b-d919a6b46ed6	general	medium	\N	quick_ratio	Quick Ratio	0.8	0.6	0.8	1.1	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
47b83130-3817-42f9-b99b-2b369439c0ca	general	small	\N	leverage	Leverage (Debt/Assets)	0.65	0.45	0.55	0.65	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
a90aaca2-7892-4e96-aa5c-89fd7f89ddc1	general	medium	\N	leverage	Leverage (Debt/Assets)	0.65	0.40	0.50	0.65	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
9e5272ac-90db-4ce3-a452-b9d0c66b2d82	general	large	\N	leverage	Leverage (Debt/Assets)	0.60	0.35	0.45	0.60	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
ca3900fe-168d-4dd7-9b79-9ddfeeed8f12	general	micro	\N	leverage	Leverage (Debt/Assets)	0.70	0.50	0.60	0.70	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
95b2eb00-cff7-44c5-be5a-307ad5ef2602	general	small	\N	debt_equity_ratio	Debt to Equity	2.0	1.0	1.5	2.0	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
5f3e8ef1-66a1-45d0-af21-81882e15d885	general	medium	\N	debt_equity_ratio	Debt to Equity	2.0	0.8	1.3	2.0	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
6c6e34f4-752c-4dc9-803c-a708350f3f90	general	small	\N	margin	Operating Margin	0.10	0.05	0.10	0.18	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
ed09cf16-7dc6-4e6d-a0d5-0d698591781e	general	medium	\N	margin	Operating Margin	0.10	0.06	0.10	0.18	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
b7ce8841-afaf-4762-a672-a18262fd5664	general	large	\N	margin	Operating Margin	0.12	0.07	0.12	0.20	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
35ae4d2d-84c6-4124-8d8b-a28e0e2f7bcb	general	micro	\N	margin	Operating Margin	0.08	0.03	0.08	0.15	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
3e44cca4-0463-4d42-bff3-743f224bac49	general	small	\N	gross_margin	Gross Margin	0.25	0.18	0.25	0.35	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
ffc1da33-4c9a-4423-acae-77f8233d75d0	general	medium	\N	gross_margin	Gross Margin	0.25	0.18	0.25	0.35	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
02bce49b-3ca7-4bb7-87da-18d563fcf9a2	general	small	\N	roa	Return on Assets	0.05	0.02	0.05	0.10	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
07a322a7-b8fb-43c3-823b-68fc0a880213	general	medium	\N	roa	Return on Assets	0.05	0.03	0.05	0.10	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
f95c667d-4b1c-4e91-824a-162499cb49cd	general	small	\N	roe	Return on Equity	0.10	0.05	0.10	0.20	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
26c4a888-8d19-4901-b9dd-e3cc1d21a686	general	medium	\N	roe	Return on Equity	0.10	0.05	0.10	0.20	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
a38a7033-ef0b-40ef-8640-07ed6d1a3850	general	small	\N	interest_coverage	Interest Coverage	2.0	1.5	2.0	3.5	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
d12f45e7-78c2-4ffd-8a23-824c656c5ac5	general	medium	\N	interest_coverage	Interest Coverage	2.0	1.5	2.5	4.0	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
190e057f-aa7f-4c59-ba29-d242bc20f268	general	small	\N	dso	Days Sales Outstanding	60	35	50	60	days	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
6cec5e5d-dce6-435a-b861-f82c05994586	general	medium	\N	dso	Days Sales Outstanding	60	30	45	60	days	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
fb2b8678-bc7d-47da-8c13-74f0aa0a2db6	general	large	\N	dso	Days Sales Outstanding	55	25	40	55	days	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
3bf20a2d-0b8a-45f7-a81b-cd67a24e90c7	general	micro	\N	dso	Days Sales Outstanding	70	40	55	70	days	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
4b614352-2170-40b5-88de-daecaaf45e60	general	small	\N	dpo	Days Payable Outstanding	45	25	35	45	days	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
6a35ac7d-4236-4847-81f7-a3d6a127338e	general	medium	\N	dpo	Days Payable Outstanding	45	25	35	45	days	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
a3262351-bbf8-4626-aa24-cd38490222ec	general	small	\N	inventory_days	Inventory Days	90	30	60	90	days	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
4964bb94-a89b-4525-87a0-8e5c6bf9a066	general	medium	\N	inventory_days	Inventory Days	90	25	55	90	days	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
af7d9f5a-2739-4692-b4fa-747dd66fb732	general	small	\N	revenue_growth	Revenue Growth YoY	0.05	0.00	0.05	0.15	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
969250cf-7040-4e4d-904f-b2c57183a63e	general	medium	\N	revenue_growth	Revenue Growth YoY	0.05	0.00	0.05	0.15	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
f8df8b5f-5096-47e2-b537-e0a65f638c36	general	small	\N	cash_conversion_cycle	Cash Conversion Cycle	90	30	60	90	days	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
1775fbf4-2af2-4217-a990-cd1cbf29855c	general	medium	\N	cash_conversion_cycle	Cash Conversion Cycle	90	25	55	90	days	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
7e86a6ee-d47f-404b-9a65-c17ad28aee9c	general	small	\N	employee_productivity	Revenue per Employee	400000	200000	400000	700000	MXN	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
e4736f8b-8ab7-4f8c-8555-439c795cacde	general	medium	\N	employee_productivity	Revenue per Employee	400000	250000	450000	800000	MXN	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
173ab841-14a0-4a3b-a9c2-7c98a24f8348	general	small	\N	working_capital_efficiency	Working Capital / Revenue	0.15	0.08	0.15	0.25	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
be5b39b0-52c7-4b40-84c1-03df010acb55	general	medium	\N	working_capital_efficiency	Working Capital / Revenue	0.15	0.08	0.15	0.25	%	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
8bdd9c78-0dce-4651-a573-a090f79b452e	general	small	\N	asset_turnover	Asset Turnover	0.8	0.5	0.8	1.2	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
4fecd291-8a4c-4763-b0ef-0b12374faa16	general	medium	\N	asset_turnover	Asset Turnover	0.8	0.5	0.8	1.3	ratio	static	2026-01-01	t	2026-04-16 19:28:30.177803+00	0
73773714-e4d6-46f0-8154-f4d630e2b198	general	small	\N	dscr	Debt Service Coverage Ratio	1.3	1.1	1.3	1.8	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
5ee5fd78-864e-4f49-b620-e54e4a6cc435	general	medium	\N	dscr	Debt Service Coverage Ratio	1.3	1.1	1.3	1.8	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
2da5ad27-9470-4d63-8164-87bcf8c45f1f	general	large	\N	dscr	Debt Service Coverage Ratio	1.3	1.2	1.5	2.0	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
6c065941-f73f-43e2-85e2-cac2899de852	general	micro	\N	dscr	Debt Service Coverage Ratio	1.2	1.0	1.2	1.5	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
0ee8a393-3239-4d6b-a7dc-683157ce2a7c	general	small	\N	current_ratio	Current Ratio	1.2	1.0	1.2	1.6	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
3963018b-af5c-44f3-b628-5fe23a78d3f1	general	medium	\N	current_ratio	Current Ratio	1.2	1.0	1.2	1.6	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
92e2bbd4-d0a2-48c2-bd61-36dd82ad2d1d	general	large	\N	current_ratio	Current Ratio	1.3	1.1	1.3	1.8	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
9ff8948f-140a-492a-93a8-69689386a0b0	general	micro	\N	current_ratio	Current Ratio	1.1	0.9	1.1	1.4	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
c499b64c-5612-4d6a-a50c-03819d969be1	general	small	\N	quick_ratio	Quick Ratio	0.8	0.6	0.8	1.1	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
2399893b-625e-48df-8ff9-8a0792665e79	general	medium	\N	quick_ratio	Quick Ratio	0.8	0.6	0.8	1.1	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
125a8080-1d84-4337-a14a-c1ffbb9343cb	general	small	\N	leverage	Leverage (Debt/Assets)	0.65	0.45	0.55	0.65	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
85c16b0f-f7a2-46f6-b05c-5f9d6fe35e87	general	medium	\N	leverage	Leverage (Debt/Assets)	0.65	0.40	0.50	0.65	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
73c0d74f-31b3-444d-91ff-0da0b5f2d612	general	large	\N	leverage	Leverage (Debt/Assets)	0.60	0.35	0.45	0.60	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
a9217b0e-250d-4be5-a8e3-e6e5b8693413	general	micro	\N	leverage	Leverage (Debt/Assets)	0.70	0.50	0.60	0.70	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
f6444148-e1f4-43bd-a55d-11adc42c6eac	general	small	\N	debt_equity_ratio	Debt to Equity	2.0	1.0	1.5	2.0	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
f573d6f0-a15c-439e-b3ab-8799dcd5ab3c	general	medium	\N	debt_equity_ratio	Debt to Equity	2.0	0.8	1.3	2.0	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
18466a12-da97-43f9-b4c2-eb44e9eb1196	general	small	\N	margin	Operating Margin	0.10	0.05	0.10	0.18	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
1b10cc87-bb75-4646-9479-64ca629e08cd	general	medium	\N	margin	Operating Margin	0.10	0.06	0.10	0.18	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
8334f68c-4ab7-4a84-92b6-c856f3fe7f49	general	large	\N	margin	Operating Margin	0.12	0.07	0.12	0.20	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
0beb1d6b-60e0-4153-8ef7-2d1c0ff920db	general	micro	\N	margin	Operating Margin	0.08	0.03	0.08	0.15	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
d6e80b3d-9412-4e17-a34e-5d7f56320d92	general	small	\N	gross_margin	Gross Margin	0.25	0.18	0.25	0.35	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
0f09d46a-e73a-4989-929d-aa99da3a4d32	general	medium	\N	gross_margin	Gross Margin	0.25	0.18	0.25	0.35	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
cd23fb28-be6b-49cc-ae9a-32efd412274d	general	small	\N	roa	Return on Assets	0.05	0.02	0.05	0.10	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
d375f4fd-0429-43f3-9b6b-1edb870a3ae6	general	medium	\N	roa	Return on Assets	0.05	0.03	0.05	0.10	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
b200d52b-5bc0-4041-b064-e6006590dc46	general	small	\N	roe	Return on Equity	0.10	0.05	0.10	0.20	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
6b6e6737-0a95-42dd-95e5-48fc2f709560	general	medium	\N	roe	Return on Equity	0.10	0.05	0.10	0.20	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
38a7339b-6a88-4f48-9b8a-129275c24f00	general	small	\N	interest_coverage	Interest Coverage	2.0	1.5	2.0	3.5	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
e9f643e3-a5a6-4c86-b710-7408b38e624b	general	medium	\N	interest_coverage	Interest Coverage	2.0	1.5	2.5	4.0	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
198c071d-ad16-4c25-b827-f3341135b0bb	general	small	\N	dso	Days Sales Outstanding	60	35	50	60	days	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
08d60c93-f952-454e-a062-6a614085bd17	general	medium	\N	dso	Days Sales Outstanding	60	30	45	60	days	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
48ce4fc6-76f0-4677-a9fb-cf5f93a3f7b8	general	large	\N	dso	Days Sales Outstanding	55	25	40	55	days	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
252c6494-65fe-476a-9ab8-a4a3b9cff124	general	micro	\N	dso	Days Sales Outstanding	70	40	55	70	days	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
d643cda7-c8d9-487e-a10a-d3f995d07bb9	general	small	\N	dpo	Days Payable Outstanding	45	25	35	45	days	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
a8d7b5d5-2ac0-416a-83d2-d7246319672f	general	medium	\N	dpo	Days Payable Outstanding	45	25	35	45	days	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
f2937b49-5fee-4eaa-979f-8d7303bcbb77	general	small	\N	inventory_days	Inventory Days	90	30	60	90	days	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
1552f0ec-34fc-47e4-8026-12d01ae47ebf	general	medium	\N	inventory_days	Inventory Days	90	25	55	90	days	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
43fd209e-ba0f-4eb7-b040-1a0db9a386a8	general	small	\N	revenue_growth	Revenue Growth YoY	0.05	0.00	0.05	0.15	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
56745ecf-a2e8-4b9f-ac16-ef4e97f404cd	general	medium	\N	revenue_growth	Revenue Growth YoY	0.05	0.00	0.05	0.15	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
3314f00a-7b90-4cc3-9fad-ee28e130b29c	general	small	\N	cash_conversion_cycle	Cash Conversion Cycle	90	30	60	90	days	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
559edb70-e96b-43a9-9119-705812e9337e	general	medium	\N	cash_conversion_cycle	Cash Conversion Cycle	90	25	55	90	days	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
4a5f3a23-b112-4fcf-9d25-f00466c2bf69	general	small	\N	employee_productivity	Revenue per Employee	400000	200000	400000	700000	MXN	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
979d2f9e-5c79-43d0-92cd-ca0e958e37cc	general	medium	\N	employee_productivity	Revenue per Employee	400000	250000	450000	800000	MXN	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
7621a989-1972-4d7b-a3b7-f656e68b9dd2	general	small	\N	working_capital_efficiency	Working Capital / Revenue	0.15	0.08	0.15	0.25	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
2c38e189-ee2e-486b-8b37-8de8c93447e0	general	medium	\N	working_capital_efficiency	Working Capital / Revenue	0.15	0.08	0.15	0.25	%	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
e985aa8a-ad6f-44b3-b136-96ed193d631f	general	small	\N	asset_turnover	Asset Turnover	0.8	0.5	0.8	1.2	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
a613c7ab-89e6-4bf6-ab70-3ed97f3a6441	general	medium	\N	asset_turnover	Asset Turnover	0.8	0.5	0.8	1.3	ratio	static	2026-01-01	t	2026-04-16 19:44:55.403008+00	0
\.


--
-- Data for Name: cs_benchmark_comparisons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_benchmark_comparisons (id, application_id, benchmark_id, engine_name, metric_name, applicant_value, benchmark_value, deviation_percent, percentile_rank, status, created_at) FROM stdin;
\.


--
-- Data for Name: cs_benchmark_cross_validation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_benchmark_cross_validation (id, application_id, total_ratios_compared, ratios_matched, ratios_minor_deviation, ratios_major_deviation, overall_confidence, flags, created_at) FROM stdin;
\.


--
-- Data for Name: cs_benchmark_syntage_ratios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_benchmark_syntage_ratios (id, application_id, ratio_category, ratio_name, syntage_value, calculated_value, deviation_percent, match_status, created_at) FROM stdin;
\.


--
-- Data for Name: cs_buro_active_credits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_buro_active_credits (id, application_id, credit_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_buro_analysis; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_buro_analysis (id, application_id, total_debt, monthly_debt_service, negative_records, portfolio_quality, created_at) FROM stdin;
\.


--
-- Data for Name: cs_buro_consultations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_buro_consultations (id, application_id, consultation_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_buro_data; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_buro_data (id, application_id, score_pyme, score_causes, califica_data, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_buro_debt_rotation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_buro_debt_rotation (id, application_id, rotation_flags, created_at) FROM stdin;
\.


--
-- Data for Name: cs_buro_hawk_checks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_buro_hawk_checks (id, application_id, hawk_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_buro_liquidated; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_buro_liquidated (id, application_id, liquidation_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_buro_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_buro_results (id, application_id, module_status, module_score, module_grade, risk_flags, key_metrics, benchmark_comparison, explanation, recommended_actions, trend_factor, created_at) FROM stdin;
\.


--
-- Data for Name: cs_business_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_business_rules (id, rule_key, rule_value, description, updated_by, updated_at) FROM stdin;
659b1990-bc21-4ce7-96c2-93156bf1e65c	min_amount_usd	100000	Monto mínimo de crédito en USD	\N	2026-04-16 19:28:11.748108+00
c456e4af-5ac4-4d44-8648-e9eaa0e125c0	max_amount_usd	1000000	Monto máximo de crédito en USD	\N	2026-04-16 19:28:11.748108+00
e65eb9b9-11b5-4d54-b5b7-449427f3dac6	min_revenue_multiplier	10	Ventas anuales mínimas = X veces el monto solicitado	\N	2026-04-16 19:28:11.748108+00
12a159a3-033f-4ce6-89e3-7f537e7bb258	min_business_age_years	2	Antigüedad mínima del negocio en años	\N	2026-04-16 19:28:11.748108+00
6678c364-1fed-4947-962f-d8ce164822c7	accepted_purposes	["importacion", "factoraje", "operaciones_fx", "exportacion"]	Propósitos de crédito aceptados	\N	2026-04-16 19:28:11.748108+00
c1604b4b-f5f9-4f75-8e5b-60c728a94be0	min_term_days	2	Plazo mínimo en días	\N	2026-04-16 19:28:11.748108+00
abfb90ed-1fd8-4943-a296-6cfceb2f766a	max_term_days	45	Plazo máximo en días sin garantía	\N	2026-04-16 19:28:11.748108+00
52679458-5020-4379-a450-16dfdbfd9db1	max_term_days_with_guarantee	90	Plazo máximo en días con garantía	\N	2026-04-16 19:28:11.748108+00
46e24b1e-8750-4276-9116-14191f328e33	min_buro_score	600	Score mínimo de Buró para continuar	\N	2026-04-16 19:28:11.748108+00
e735adde-22ac-4a98-af2c-5a22fa9ff841	token_expiry_hours	72	Horas de vigencia del token de acceso	\N	2026-04-16 19:28:11.748108+00
10aebb47-473f-4c6d-8b66-9fe2c28538aa	reminder_after_hours	48	Horas antes de enviar recordatorio	\N	2026-04-16 19:28:11.748108+00
\.


--
-- Data for Name: cs_cashflow_calculations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_cashflow_calculations (id, application_id, metric_name, metric_value, formula, period, created_at) FROM stdin;
\.


--
-- Data for Name: cs_cashflow_inputs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_cashflow_inputs (id, application_id, source, requested_amount, term_months, interest_rate, currency, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_cashflow_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_cashflow_results (id, application_id, module_status, module_score, module_grade, risk_flags, key_metrics, benchmark_comparison, explanation, recommended_actions, trend_factor, created_at) FROM stdin;
\.


--
-- Data for Name: cs_cashflow_scenarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_cashflow_scenarios (id, application_id, scenario_type, assumptions, results, created_at) FROM stdin;
\.


--
-- Data for Name: cs_companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_companies (id, tenant_id, rfc, legal_name, trade_name, business_activity, tax_regime, incorporation_date, address, syntage_entity_id, scory_entity_id, status, metadata, created_at, updated_at) FROM stdin;
a1111111-1111-1111-1111-111111111111	xending	DAZ050101AAA	Distribuidora Azteca S.A. de C.V.	Dist. Azteca	Comercio al por mayor	Regimen General de Ley	2005-01-15	{"zip": "06600", "city": "Ciudad de Mexico", "state": "CDMX", "street": "Av. Reforma 250"}	\N	\N	active	{}	2026-04-16 19:29:47.153003+00	2026-04-16 19:29:47.153003+00
b2222222-2222-2222-2222-222222222222	xending	TNO180315BBB	Tecnologia Nortena S. de R.L. de C.V.	TecNorte	Servicios de tecnologia	Regimen General de Ley	2018-03-15	{"zip": "64000", "city": "Monterrey", "state": "Nuevo Leon", "street": "Blvd. Constitucion 1500"}	\N	\N	active	{}	2026-04-16 19:29:47.166226+00	2026-04-16 19:29:47.166226+00
c3333333-3333-3333-3333-333333333333	xending	PAS030303CCC	Pacific Supplies SA de CV	PacSupplies	Importación	\N	\N	{"zip": "82100", "city": "Mazatlán", "state": "SIN", "street": "Av del Mar 200", "country": "Mexico"}	\N	\N	active	{}	2026-04-16 19:29:47.85446+00	2026-04-16 19:29:47.85446+00
d4444444-4444-4444-4444-444444444444	xending	GFI040404DDD	Grupo Financiero Istmo SA de CV	GF Istmo	Servicios financieros	\N	\N	{"zip": "97000", "city": "Mérida", "state": "YUC", "street": "Calle 60 #300", "country": "Mexico"}	\N	\N	active	{}	2026-04-16 19:29:47.85446+00	2026-04-16 19:29:47.85446+00
e5555555-5555-5555-5555-555555555555	xending	ALO050505EEE	Alimentos del Occidente SA de CV	AliOccidente	Alimentos y bebidas	\N	\N	{"zip": "44100", "city": "Guadalajara", "state": "JAL", "street": "Av Vallarta 1500", "country": "Mexico"}	\N	\N	active	{}	2026-04-16 19:29:47.85446+00	2026-04-16 19:29:47.85446+00
\.


--
-- Data for Name: cs_companies_owners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_companies_owners (id, company_id, user_id, created_at) FROM stdin;
5fdd1e7f-706b-434f-995e-6dcdcc8dc2d8	a1111111-1111-1111-1111-111111111111	00000000-0000-0000-0000-000000000001	2026-04-16 19:29:47.87777+00
5e208008-3da9-4166-a923-2153ed07a2e8	b2222222-2222-2222-2222-222222222222	00000000-0000-0000-0000-000000000001	2026-04-16 19:29:47.87777+00
f1d5c5f5-0057-4b41-8465-67db0202694d	c3333333-3333-3333-3333-333333333333	00000000-0000-0000-0000-000000000002	2026-04-16 19:29:47.87777+00
0fc2027c-800e-4029-a198-7f4a40529f66	d4444444-4444-4444-4444-444444444444	00000000-0000-0000-0000-000000000002	2026-04-16 19:29:47.87777+00
dda101f3-1ddb-41ef-a3e7-1d6db86b3ff9	e5555555-5555-5555-5555-555555555555	00000000-0000-0000-0000-000000000003	2026-04-16 19:29:47.87777+00
\.


--
-- Data for Name: cs_company_contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_company_contacts (id, company_id, contact_type, contact_value, contact_name, is_primary, created_at) FROM stdin;
603c370f-3a84-4070-b0b9-ab8e37011076	a1111111-1111-1111-1111-111111111111	email	contacto@distazteca.com.mx	Juan Perez	t	2026-04-16 19:29:47.159021+00
7a819a62-187e-4d0f-8b22-bb86db62829d	a1111111-1111-1111-1111-111111111111	phone	+525512345678	Juan Perez	t	2026-04-16 19:29:47.159021+00
2bc02f5e-8fad-4426-91c7-95e31334603e	a1111111-1111-1111-1111-111111111111	legal_rep	juan.perez@distazteca.com.mx	Juan Perez Lopez	f	2026-04-16 19:29:47.159021+00
8c960d61-e53a-4f78-ab50-2a8300eada99	b2222222-2222-2222-2222-222222222222	email	admin@tecnorte.mx	Maria Garcia	t	2026-04-16 19:29:47.169003+00
d9cd7671-da10-408f-b1ea-e276371a017c	b2222222-2222-2222-2222-222222222222	phone	+528198765432	Maria Garcia	t	2026-04-16 19:29:47.169003+00
fb862157-2c24-4e0f-9c9e-c3a8681549ad	b2222222-2222-2222-2222-222222222222	legal_rep	maria.garcia@tecnorte.mx	Maria Garcia Rodriguez	f	2026-04-16 19:29:47.169003+00
a0d1980d-f04b-45c4-8fcf-067e29fb300b	a1111111-1111-1111-1111-111111111111	email	contacto@distazteca.com.mx	Juan Perez	t	2026-04-16 19:44:56.895935+00
d0f515df-ab70-4361-a71a-557379a032d5	a1111111-1111-1111-1111-111111111111	phone	+525512345678	Juan Perez	t	2026-04-16 19:44:56.895935+00
988c351b-3885-42a1-be0c-a04529070058	a1111111-1111-1111-1111-111111111111	legal_rep	juan.perez@distazteca.com.mx	Juan Perez Lopez	f	2026-04-16 19:44:56.895935+00
c5316498-b57e-4a6b-b55c-d32b8c7b326f	b2222222-2222-2222-2222-222222222222	email	admin@tecnorte.mx	Maria Garcia	t	2026-04-16 19:44:56.902975+00
05da54d9-9d17-4d0d-a506-5d74326ec3c1	b2222222-2222-2222-2222-222222222222	phone	+528198765432	Maria Garcia	t	2026-04-16 19:44:56.902975+00
f816f3c0-5c6f-4bc7-a753-2af942e009ba	b2222222-2222-2222-2222-222222222222	legal_rep	maria.garcia@tecnorte.mx	Maria Garcia Rodriguez	f	2026-04-16 19:44:56.902975+00
\.


--
-- Data for Name: cs_company_payment_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_company_payment_accounts (id, company_id, clabe, bank_name, is_primary, deleted, created_at, currency) FROM stdin;
aa111111-1111-1111-1111-111111111111	a1111111-1111-1111-1111-111111111111	012345678901234567	BBVA Mexico	t	f	2026-04-16 19:29:47.85857+00	USD
bb222222-2222-2222-2222-222222222222	b2222222-2222-2222-2222-222222222222	021345678901234567	Banorte	t	f	2026-04-16 19:29:47.85857+00	USD
cc333333-3333-3333-3333-333333333333	c3333333-3333-3333-3333-333333333333	032345678901234567	Santander	t	f	2026-04-16 19:29:47.85857+00	USD
dd444444-4444-4444-4444-444444444444	d4444444-4444-4444-4444-444444444444	042345678901234567	HSBC	t	f	2026-04-16 19:29:47.85857+00	USD
ee555555-5555-5555-5555-555555555555	e5555555-5555-5555-5555-555555555555	052345678901234567	Banamex	t	f	2026-04-16 19:29:47.85857+00	USD
a1eaa557-76e2-4fb6-af0f-2e62c2fdce62	a1111111-1111-1111-1111-111111111111	012345678901234567	BBVA Mexico	t	f	2026-04-16 19:29:48.122534+00	USD
b0540631-1e15-4a95-9c4f-da6eb71631b8	b2222222-2222-2222-2222-222222222222	021345678901234567	Banorte	t	f	2026-04-16 19:29:48.122534+00	USD
76332eb7-4a12-4932-bfe7-fb6e56f84d74	a1111111-1111-1111-1111-111111111111	012345678901234567	BBVA Mexico	t	f	2026-04-16 19:44:57.753278+00	USD
56fd9f60-840a-42ef-a17c-14a023a5bfeb	b2222222-2222-2222-2222-222222222222	021345678901234567	Banorte	t	f	2026-04-16 19:44:57.753278+00	USD
\.


--
-- Data for Name: cs_compliance_checks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_compliance_checks (id, application_id, check_type, result, details, created_at) FROM stdin;
\.


--
-- Data for Name: cs_compliance_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_compliance_results (id, application_id, overall_status, risk_flags, blocking_reason, scory_response, created_at) FROM stdin;
\.


--
-- Data for Name: cs_covenants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_covenants (id, application_id, covenant_type, covenant_name, metric_name, threshold_value, threshold_operator, frequency, grace_period_days, severity, active, created_at) FROM stdin;
\.


--
-- Data for Name: cs_covenant_monitoring; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_covenant_monitoring (id, covenant_id, application_id, check_date, actual_value, threshold_value, compliant, breach_severity, notes, created_at) FROM stdin;
\.


--
-- Data for Name: cs_credit_limits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_credit_limits (id, application_id, limit_by_flow, limit_by_sales, limit_by_ebitda, limit_by_guarantee, limit_by_portfolio, final_limit, binding_constraint, explanation, created_at) FROM stdin;
\.


--
-- Data for Name: cs_cross_analysis; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_cross_analysis (id, application_id, cross_number, cross_name, engines_involved, pattern_detected, severity, interpretation, recommended_action, details, created_at) FROM stdin;
\.


--
-- Data for Name: cs_decision_gates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_decision_gates (id, application_id, gate_number, result, details, created_at) FROM stdin;
\.


--
-- Data for Name: cs_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_documents (id, application_id, document_type, file_name, file_url, status, is_required, is_blocking, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: cs_document_validations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_document_validations (id, document_id, validation_type, result, details, created_at) FROM stdin;
\.


--
-- Data for Name: cs_documentation_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_documentation_results (id, application_id, module_status, module_score, module_grade, completeness_percent, risk_flags, key_metrics, explanation, recommended_actions, created_at) FROM stdin;
\.


--
-- Data for Name: cs_employee_headcount; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_employee_headcount (id, application_id, period, employee_count, source, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_employee_payroll; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_employee_payroll (id, application_id, period, payroll_total, nomina_ingresos_ratio, payroll_trend, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_employee_productivity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_employee_productivity (id, application_id, period, revenue_per_employee, metric_name, metric_value, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_employee_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_employee_results (id, application_id, module_status, module_score, module_grade, risk_flags, key_metrics, benchmark_comparison, explanation, recommended_actions, trend_factor, created_at) FROM stdin;
\.


--
-- Data for Name: cs_expedientes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_expedientes (id, folio, rfc, company_name, requested_amount, currency, credit_purpose, declared_annual_revenue, declared_business_age, term_days, stage, rejection_reason, rejected_at_stage, contact_email, contact_phone, legal_representative, syntage_entity_id, application_id, pre_filter_score, buro_score, pld_score, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cs_expediente_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_expediente_events (id, expediente_id, event_type, stage, description, data, actor, created_at) FROM stdin;
\.


--
-- Data for Name: cs_expediente_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_expediente_tokens (id, expediente_id, token, purpose, expires_at, is_used, access_count, last_accessed_at, created_at) FROM stdin;
\.


--
-- Data for Name: cs_financial_balance_detail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_financial_balance_detail (id, application_id, fiscal_year, balance_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_financial_balanza; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_financial_balanza (id, application_id, period, balanza_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_financial_calculations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_financial_calculations (id, application_id, metric_name, metric_value, formula, period, created_at) FROM stdin;
\.


--
-- Data for Name: cs_financial_income_detail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_financial_income_detail (id, application_id, fiscal_year, income_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_financial_inputs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_financial_inputs (id, application_id, source, fiscal_year, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_financial_related_parties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_financial_related_parties (id, application_id, rp_data, total_exposure_percent, created_at) FROM stdin;
\.


--
-- Data for Name: cs_financial_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_financial_results (id, application_id, module_status, module_score, module_grade, risk_flags, key_metrics, benchmark_comparison, explanation, recommended_actions, trend_factor, created_at) FROM stdin;
\.


--
-- Data for Name: cs_fx_exposure; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_fx_exposure (id, application_id, currency_mismatch_ratio, pct_ingresos_misma_moneda, natural_hedge_ratio, uncovered_fx_exposure, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_fx_inputs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_fx_inputs (id, application_id, moneda_credito, moneda_ingresos, moneda_costos, moneda_facturacion, moneda_cuentas_cobrar, moneda_deuda, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_fx_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_fx_results (id, application_id, module_status, module_score, module_grade, risk_flags, key_metrics, benchmark_comparison, explanation, recommended_actions, trend_factor, fx_vulnerability, recommended_currency, hedge_obligation, created_at) FROM stdin;
\.


--
-- Data for Name: cs_fx_scenarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_fx_scenarios (id, application_id, scenario_type, ebitda_sensitivity, dscr_stressed, ltv_stressed, scenario_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_guarantee_guarantees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_guarantee_guarantees (id, application_id, tipo, valor_comercial, valor_forzoso, liquidez, moneda, jurisdiccion, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_guarantee_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_guarantee_documents (id, application_id, guarantee_id, document_type, document_status, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_guarantee_haircuts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_guarantee_haircuts (id, application_id, guarantee_id, guarantee_type, haircut_min, haircut_max, haircut_applied, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_guarantee_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_guarantee_results (id, application_id, module_status, module_score, module_grade, risk_flags, key_metrics, benchmark_comparison, explanation, recommended_actions, trend_factor, valor_elegible_neto, cobertura_neta, faltante_garantia, cumple_2_1, created_at) FROM stdin;
\.


--
-- Data for Name: cs_guarantee_valuations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_guarantee_valuations (id, application_id, guarantee_id, valuation_date, valuation_amount, appraiser, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_limit_calculations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_limit_calculations (id, application_id, limit_type, input_values, calculation_steps, result_value, created_at) FROM stdin;
\.


--
-- Data for Name: cs_metric_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_metric_catalog (id, metric_name, label, description, source, formula, unit, engine_name, created_at) FROM stdin;
\.


--
-- Data for Name: cs_metric_values; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_metric_values (id, application_id, metric_name, value, benchmark, deviation_percent, interpretation, impact_on_score, flag, created_at) FROM stdin;
\.


--
-- Data for Name: cs_network_clients_detail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_network_clients_detail (id, application_id, client_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_network_concentration; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_network_concentration (id, application_id, concentration_type, hhi, top1_percent, top3_percent, analysis_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_network_counterparties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_network_counterparties (id, application_id, counterparty_type, rfc, name, revenue_share, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_network_financial_institutions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_network_financial_institutions (id, application_id, fi_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_network_government; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_network_government (id, application_id, gov_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_network_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_network_metrics (id, application_id, metric_name, metric_value, unit, period, created_at) FROM stdin;
\.


--
-- Data for Name: cs_network_products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_network_products (id, application_id, product_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_network_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_network_results (id, application_id, module_status, module_score, module_grade, risk_flags, key_metrics, benchmark_comparison, explanation, recommended_actions, trend_factor, created_at) FROM stdin;
\.


--
-- Data for Name: cs_network_suppliers_detail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_network_suppliers_detail (id, application_id, supplier_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_policies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_policies (id, policy_name, config, effective_date, version, active, created_at) FROM stdin;
\.


--
-- Data for Name: cs_policy_audit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_policy_audit (id, policy_id, action, details, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: cs_policy_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_policy_versions (id, policy_id, old_config, new_config, changed_by, created_at) FROM stdin;
\.


--
-- Data for Name: cs_portfolio_exposure; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_portfolio_exposure (id, application_id, exposure_by_sector, exposure_by_currency, exposure_by_group, correlation, concentration_post_origination, expected_loss_incremental, worst_case_loss_incremental, created_at) FROM stdin;
\.


--
-- Data for Name: cs_portfolio_limits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_portfolio_limits (id, application_id, limit_type, limit_name, max_concentration, current_concentration, post_origination_concentration, breach, created_at) FROM stdin;
\.


--
-- Data for Name: cs_portfolio_positions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_portfolio_positions (id, application_id, position_type, position_name, current_exposure, exposure_percent, counterparty_count, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_portfolio_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_portfolio_results (id, application_id, module_status, module_score, module_grade, risk_flags, key_metrics, benchmark_comparison, explanation, recommended_actions, trend_factor, created_at) FROM stdin;
\.


--
-- Data for Name: cs_review_schedule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_review_schedule (id, application_id, frequency, next_review, triggers, created_at) FROM stdin;
\.


--
-- Data for Name: cs_review_triggers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_review_triggers (id, application_id, trigger_type, trigger_condition, is_active, last_triggered_at, created_at) FROM stdin;
\.


--
-- Data for Name: cs_risk_matrix_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_risk_matrix_results (id, application_id, gate1_result, gate1_flags, gate2_result, gate2_semaphores, gate3_score, gate3_breakdown, final_decision, created_at) FROM stdin;
\.


--
-- Data for Name: cs_sat_blacklisted_invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_sat_blacklisted_invoices (id, application_id, counterparty_rfc, direction, total_amount, invoice_count, list_type, created_at) FROM stdin;
\.


--
-- Data for Name: cs_sat_data; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_sat_data (id, application_id, data_type, raw_data, period, created_at) FROM stdin;
\.


--
-- Data for Name: cs_sat_facturado_vs_declarado; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_sat_facturado_vs_declarado (id, application_id, fiscal_year, total_facturado, total_declarado, discrepancy_amount, discrepancy_percent, flagged, created_at) FROM stdin;
\.


--
-- Data for Name: cs_sat_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_sat_metrics (id, application_id, metric_name, metric_value, unit, period, created_at) FROM stdin;
\.


--
-- Data for Name: cs_sat_payment_behavior; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_sat_payment_behavior (id, application_id, period, direction, total_pue, total_ppd, ppd_collected, ppd_collection_ratio, dso_days, dpo_days, created_at) FROM stdin;
\.


--
-- Data for Name: cs_sat_product_diversification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_sat_product_diversification (id, application_id, product_service_key, description, total_amount, weight_percent, created_at) FROM stdin;
\.


--
-- Data for Name: cs_sat_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_sat_results (id, application_id, module_status, module_score, module_grade, risk_flags, key_metrics, benchmark_comparison, explanation, recommended_actions, trend_factor, created_at) FROM stdin;
\.


--
-- Data for Name: cs_sat_revenue_quality; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_sat_revenue_quality (id, application_id, period, gross_revenue, cancellations, credit_notes, discounts, net_revenue, cancellation_ratio, credit_note_ratio, created_at) FROM stdin;
\.


--
-- Data for Name: cs_scenario_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_scenario_results (id, application_id, total_scenarios_run, scenarios_passed, scenarios_failed, worst_case_scenario, breaking_points, resilience_score, module_status, module_score, module_grade, risk_flags, explanation, recommended_actions, created_at) FROM stdin;
\.


--
-- Data for Name: cs_scenarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_scenarios (id, application_id, scenario_type, scenario_name, parameters, base_values, stressed_values, impact_summary, breaking_point, created_at) FROM stdin;
\.


--
-- Data for Name: cs_scoring_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_scoring_versions (id, version, model_config, active, created_at) FROM stdin;
\.


--
-- Data for Name: cs_stability_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_stability_metrics (id, application_id, metric_name, metric_value, unit, period, created_at) FROM stdin;
\.


--
-- Data for Name: cs_stability_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_stability_results (id, application_id, module_status, module_score, module_grade, pattern_classification, risk_flags, key_metrics, benchmark_comparison, explanation, recommended_actions, trend_factor, created_at) FROM stdin;
\.


--
-- Data for Name: cs_stability_timeseries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_stability_timeseries (id, application_id, metric_name, period, value, created_at) FROM stdin;
\.


--
-- Data for Name: cs_trend_ai_narrative; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_trend_ai_narrative (id, application_id, executive_summary, top_positive, top_negative, threshold_projections, recommendation, created_at) FROM stdin;
\.


--
-- Data for Name: cs_trend_charts_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_trend_charts_config (id, engine_name, metric_name, chart_type, thresholds, higher_is_better, y_axis_format, brand_colors, created_at) FROM stdin;
\.


--
-- Data for Name: cs_trend_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_trend_results (id, application_id, engine_name, metric_name, direction, speed, classification, change_percent, slope, r_squared, projection, months_to_threshold, threshold_value, risk_flags, chart_config, created_at) FROM stdin;
\.


--
-- Data for Name: cs_trend_timeseries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_trend_timeseries (id, application_id, engine_name, metric_name, period, value, benchmark, created_at) FROM stdin;
\.


--
-- Data for Name: cs_workflow_decisions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_workflow_decisions (id, application_id, decision, decided_by, conditions, created_at) FROM stdin;
\.


--
-- Data for Name: cs_workflow_overrides; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_workflow_overrides (id, application_id, override_reason, approved_by, created_at) FROM stdin;
\.


--
-- Data for Name: cs_workflow_queue; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_workflow_queue (id, application_id, assigned_to, level, sla_deadline, status, created_at) FROM stdin;
\.


--
-- Data for Name: cs_working_capital_aging; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_working_capital_aging (id, application_id, aging_type, period, aging_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_working_capital_cycle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_working_capital_cycle (id, application_id, period, dso, dio, dpo, ccc, created_at) FROM stdin;
\.


--
-- Data for Name: cs_working_capital_inputs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_working_capital_inputs (id, application_id, source, raw_data, created_at) FROM stdin;
\.


--
-- Data for Name: cs_working_capital_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cs_working_capital_results (id, application_id, module_status, module_score, module_grade, risk_flags, key_metrics, benchmark_comparison, explanation, recommended_actions, trend_factor, created_at) FROM stdin;
\.


--
-- Data for Name: fx_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fx_transactions (id, folio, company_id, quantity, base_rate, markup_rate, buys_currency, pays_currency, status, payment_account_id, pi_account_id, created_by, authorized_by, authorized_at, proof_url, cancelled, cancelled_at, cancelled_by, created_at, updated_at) FROM stdin;
aa19b451-2b10-44d5-8126-d0c35a8384e9	XG-26-0001	b2222222-2222-2222-2222-222222222222	8333.00	17.0500	17.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-10 14:29:47.882685+00	2026-04-10 14:29:47.882685+00
2360a315-4529-4add-9029-4f777bfc51dc	XG-26-0002	c3333333-3333-3333-3333-333333333333	11666.00	17.1000	17.1900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-10 17:29:47.882685+00	\N	f	\N	\N	2026-04-10 15:29:47.882685+00	2026-04-10 15:29:47.882685+00
ece6ec8e-f1eb-4bcc-bf5b-d51672c81d58	XG-26-0003	d4444444-4444-4444-4444-444444444444	14999.00	17.1500	17.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-10 18:29:47.882685+00	\N	f	\N	\N	2026-04-10 16:29:47.882685+00	2026-04-10 16:29:47.882685+00
b876457b-bd10-40d7-b366-59755e66dae3	XG-26-0004	e5555555-5555-5555-5555-555555555555	131108.00	0.0552	0.0591	MXN	USD	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-10 19:29:47.882685+00	https://example.com/proof-4.pdf	f	\N	\N	2026-04-10 17:29:47.882685+00	2026-04-10 17:29:47.882685+00
e8769aa9-ded3-445b-9827-ebe76985dc1d	XG-26-0005	a1111111-1111-1111-1111-111111111111	21665.00	17.2500	17.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-10 18:29:47.882685+00	2026-04-10 18:29:47.882685+00
305d4a77-258f-47a6-9d4e-d5c98151cf82	XG-26-0006	b2222222-2222-2222-2222-222222222222	24998.00	17.3000	17.4700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-10 19:29:47.882685+00	2026-04-10 19:29:47.882685+00
07600e63-20d3-4f24-b141-ae3452fe7eb0	XG-26-0007	c3333333-3333-3333-3333-333333333333	28331.00	17.3500	17.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-10 22:29:47.882685+00	\N	f	\N	\N	2026-04-10 20:29:47.882685+00	2026-04-10 20:29:47.882685+00
842559e7-56d6-4607-b55f-c3b652815b0a	XG-26-0008	d4444444-4444-4444-4444-444444444444	162216.00	0.0564	0.0626	MXN	USD	pending	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	t	2026-04-11 01:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-10 21:29:47.882685+00	2026-04-10 21:29:47.882685+00
eff794ef-c76e-4272-8643-9284be682ef4	XG-26-0009	e5555555-5555-5555-5555-555555555555	34997.00	17.4500	17.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-11 00:29:47.882685+00	https://example.com/proof-9.pdf	f	\N	\N	2026-04-10 22:29:47.882685+00	2026-04-10 22:29:47.882685+00
21ee2b64-81f4-4779-93d3-aed32d90452a	XG-26-0010	a1111111-1111-1111-1111-111111111111	38330.00	17.5000	17.5500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-10 23:29:47.882685+00	2026-04-10 23:29:47.882685+00
969f243c-8146-48a4-8768-89c3a040e496	XG-26-0011	b2222222-2222-2222-2222-222222222222	41663.00	17.5500	17.6200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-11 00:29:47.882685+00	2026-04-11 00:29:47.882685+00
da9279ed-85a7-4aac-ae4a-b69bbedea29c	XG-26-0012	c3333333-3333-3333-3333-333333333333	193324.00	0.0576	0.0662	MXN	USD	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-11 03:29:47.882685+00	\N	f	\N	\N	2026-04-11 01:29:47.882685+00	2026-04-11 01:29:47.882685+00
ea9fc8a4-361b-4bbf-8269-6447b9c93fb4	XG-26-0013	d4444444-4444-4444-4444-444444444444	48329.00	17.6500	17.7600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-11 04:29:47.882685+00	\N	f	\N	\N	2026-04-11 02:29:47.882685+00	2026-04-11 02:29:47.882685+00
49b88b45-691d-4f9a-8e22-11962ef92bf4	XG-26-0014	e5555555-5555-5555-5555-555555555555	51662.00	17.7000	17.8300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-11 05:29:47.882685+00	https://example.com/proof-14.pdf	f	\N	\N	2026-04-11 03:29:47.882685+00	2026-04-11 03:29:47.882685+00
01aec1bb-44e5-4406-be58-5b743f71bb40	XG-26-0015	a1111111-1111-1111-1111-111111111111	54995.00	17.7500	17.9000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-11 04:29:47.882685+00	2026-04-11 04:29:47.882685+00
be306949-2822-4299-b0be-de6807dcb177	XG-26-0016	b2222222-2222-2222-2222-222222222222	224432.00	0.0588	0.0623	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	t	2026-04-11 09:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-11 05:29:47.882685+00	2026-04-11 05:29:47.882685+00
a7faf890-bb81-45d1-bad3-1b5b612bef22	XG-26-0017	c3333333-3333-3333-3333-333333333333	61661.00	17.8500	18.0400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-11 08:29:47.882685+00	\N	f	\N	\N	2026-04-11 06:29:47.882685+00	2026-04-11 06:29:47.882685+00
5525db46-4391-4ccf-b144-e010c0a1518d	XG-26-0018	d4444444-4444-4444-4444-444444444444	64994.00	17.9000	18.1100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-11 09:29:47.882685+00	\N	f	\N	\N	2026-04-11 07:29:47.882685+00	2026-04-11 07:29:47.882685+00
44e97a92-0d9a-426f-8720-33b744eb9f2b	XG-26-0019	e5555555-5555-5555-5555-555555555555	68327.00	17.9500	18.1800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-11 10:29:47.882685+00	https://example.com/proof-19.pdf	f	\N	\N	2026-04-11 08:29:47.882685+00	2026-04-11 08:29:47.882685+00
1d9e9271-e05b-44d5-854b-db8ecc667840	XG-26-0020	a1111111-1111-1111-1111-111111111111	255540.00	0.0540	0.0594	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-11 09:29:47.882685+00	2026-04-11 09:29:47.882685+00
7886ee4c-5a2c-4d24-8767-f44ea353aa92	XG-26-0021	b2222222-2222-2222-2222-222222222222	74993.00	18.0500	18.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-11 10:29:47.882685+00	2026-04-11 10:29:47.882685+00
61fdbdd5-1681-486f-a0c0-7c7ce6f426c1	XG-26-0022	c3333333-3333-3333-3333-333333333333	78326.00	18.1000	18.1900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-11 13:29:47.882685+00	\N	f	\N	\N	2026-04-11 11:29:47.882685+00	2026-04-11 11:29:47.882685+00
4ca7619d-d863-42c3-9a56-7ef712ad1207	XG-26-0023	d4444444-4444-4444-4444-444444444444	81659.00	18.1500	18.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-11 14:29:47.882685+00	\N	f	\N	\N	2026-04-11 12:29:47.882685+00	2026-04-11 12:29:47.882685+00
b0fbad75-3e20-4b62-8e05-117cf5a99a07	XG-26-0024	e5555555-5555-5555-5555-555555555555	286648.00	0.0552	0.0629	MXN	USD	pending	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	t	2026-04-11 17:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-11 13:29:47.882685+00	2026-04-11 13:29:47.882685+00
ba989a2a-bfdd-4764-a5ef-d6c92d1e2d23	XG-26-0025	a1111111-1111-1111-1111-111111111111	88325.00	18.2500	18.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-11 14:29:47.882685+00	2026-04-11 14:29:47.882685+00
e5a365ed-6ee4-40a3-89fc-04a45dd7b1a9	XG-26-0026	b2222222-2222-2222-2222-222222222222	91658.00	18.3000	18.4700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-11 15:29:47.882685+00	2026-04-11 15:29:47.882685+00
598872eb-2ced-4f8b-8829-6b9edbc556cd	XG-26-0027	c3333333-3333-3333-3333-333333333333	94991.00	18.3500	18.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-11 18:29:47.882685+00	\N	f	\N	\N	2026-04-11 16:29:47.882685+00	2026-04-11 16:29:47.882685+00
0617a1fe-9d67-4c6a-8c1a-890fe48851ad	XG-26-0028	d4444444-4444-4444-4444-444444444444	317756.00	0.0564	0.0592	MXN	USD	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-11 19:29:47.882685+00	\N	f	\N	\N	2026-04-11 17:29:47.882685+00	2026-04-11 17:29:47.882685+00
5833290a-4f9b-4823-8297-d4adf5d6c5b5	XG-26-0029	e5555555-5555-5555-5555-555555555555	101657.00	18.4500	18.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-11 20:29:47.882685+00	https://example.com/proof-29.pdf	f	\N	\N	2026-04-11 18:29:47.882685+00	2026-04-11 18:29:47.882685+00
9aef432f-2f8c-4897-ac5e-ee4634ab582c	XG-26-0030	a1111111-1111-1111-1111-111111111111	104990.00	17.0000	17.0500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-11 19:29:47.882685+00	2026-04-11 19:29:47.882685+00
d5d0ea97-650c-490e-992e-7d3b9dc7516d	XG-26-0031	b2222222-2222-2222-2222-222222222222	108323.00	17.0500	17.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-11 20:29:47.882685+00	2026-04-11 20:29:47.882685+00
b37597e1-0fa3-4bc7-9117-121a026eed19	XG-26-0032	c3333333-3333-3333-3333-333333333333	348864.00	0.0576	0.0628	MXN	USD	pending	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	t	2026-04-12 01:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-11 21:29:47.882685+00	2026-04-11 21:29:47.882685+00
5cd7f410-b1bb-4372-8cf9-6ee4930224e6	XG-26-0033	d4444444-4444-4444-4444-444444444444	114989.00	17.1500	17.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-12 00:29:47.882685+00	\N	f	\N	\N	2026-04-11 22:29:47.882685+00	2026-04-11 22:29:47.882685+00
968ac515-7c0c-42d1-bf4d-dba69453c2b8	XG-26-0034	e5555555-5555-5555-5555-555555555555	118322.00	17.2000	17.3300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-12 01:29:47.882685+00	https://example.com/proof-34.pdf	f	\N	\N	2026-04-11 23:29:47.882685+00	2026-04-11 23:29:47.882685+00
881a0307-1c68-469b-b4f5-cbe0b750a42d	XG-26-0035	a1111111-1111-1111-1111-111111111111	121655.00	17.2500	17.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-12 00:29:47.882685+00	2026-04-12 00:29:47.882685+00
54d48e46-dfc5-4b22-880a-df60353726ea	XG-26-0036	b2222222-2222-2222-2222-222222222222	379972.00	0.0588	0.0664	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-12 01:29:47.882685+00	2026-04-12 01:29:47.882685+00
04d6382d-6d52-481d-829b-4dde9b53d0a4	XG-26-0037	c3333333-3333-3333-3333-333333333333	128321.00	17.3500	17.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-12 04:29:47.882685+00	\N	f	\N	\N	2026-04-12 02:29:47.882685+00	2026-04-12 02:29:47.882685+00
5d0fc08c-460c-4a93-b334-f95b95c50693	XG-26-0038	d4444444-4444-4444-4444-444444444444	131654.00	17.4000	17.6100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-12 05:29:47.882685+00	\N	f	\N	\N	2026-04-12 03:29:47.882685+00	2026-04-12 03:29:47.882685+00
3d278664-2fd2-4a7c-ae52-9c2eb9d2b35f	XG-26-0039	e5555555-5555-5555-5555-555555555555	134987.00	17.4500	17.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-12 06:29:47.882685+00	https://example.com/proof-39.pdf	f	\N	\N	2026-04-12 04:29:47.882685+00	2026-04-12 04:29:47.882685+00
67f0d947-073e-416e-8513-f9bc921b5d87	XG-26-0040	a1111111-1111-1111-1111-111111111111	411080.00	0.0540	0.0562	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	t	2026-04-12 09:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-12 05:29:47.882685+00	2026-04-12 05:29:47.882685+00
77c349de-41f8-4612-ad1a-1edb2be5b7e5	XG-26-0041	b2222222-2222-2222-2222-222222222222	141653.00	17.5500	17.6200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-12 06:29:47.882685+00	2026-04-12 06:29:47.882685+00
7f59e1a2-0f23-4836-9c5e-c241e78e92ac	XG-26-0164	c3333333-3333-3333-3333-333333333333	193324.00	0.0576	0.0662	MXN	USD	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-11 03:44:57.499529+00	\N	f	\N	\N	2026-04-11 01:44:57.499529+00	2026-04-11 01:44:57.499529+00
1d4d7c49-21fa-4065-bb33-a3726b265ba1	XG-26-0042	c3333333-3333-3333-3333-333333333333	144986.00	17.6000	17.6900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-12 09:29:47.882685+00	\N	f	\N	\N	2026-04-12 07:29:47.882685+00	2026-04-12 07:29:47.882685+00
4b2b7587-2117-4cd1-a6e3-b68c539f3730	XG-26-0043	d4444444-4444-4444-4444-444444444444	148319.00	17.6500	17.7600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-12 10:29:47.882685+00	\N	f	\N	\N	2026-04-12 08:29:47.882685+00	2026-04-12 08:29:47.882685+00
53470732-3bfb-47ab-9ae5-1a71349df51f	XG-26-0044	e5555555-5555-5555-5555-555555555555	442188.00	0.0552	0.0596	MXN	USD	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-12 11:29:47.882685+00	https://example.com/proof-44.pdf	f	\N	\N	2026-04-12 09:29:47.882685+00	2026-04-12 09:29:47.882685+00
97d2f9ce-c620-4cc2-abf8-c1748e238014	XG-26-0045	a1111111-1111-1111-1111-111111111111	154985.00	17.7500	17.9000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-12 10:29:47.882685+00	2026-04-12 10:29:47.882685+00
11b457f5-dfa7-4230-ba88-a28bfe4d41b1	XG-26-0046	b2222222-2222-2222-2222-222222222222	158318.00	17.8000	17.9700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-12 11:29:47.882685+00	2026-04-12 11:29:47.882685+00
e6a6086c-12f0-482f-83e5-b9f63e9bb149	XG-26-0047	c3333333-3333-3333-3333-333333333333	161651.00	17.8500	18.0400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-12 14:29:47.882685+00	\N	f	\N	\N	2026-04-12 12:29:47.882685+00	2026-04-12 12:29:47.882685+00
8ce810ac-4fa4-40a7-84d0-bb067cc4c4ea	XG-26-0048	d4444444-4444-4444-4444-444444444444	473296.00	0.0564	0.0632	MXN	USD	pending	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	t	2026-04-12 17:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-12 13:29:47.882685+00	2026-04-12 13:29:47.882685+00
9ad2eb8d-8e86-484f-a501-6d5b1d8f9d4a	XG-26-0049	e5555555-5555-5555-5555-555555555555	168317.00	17.9500	18.1800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-12 16:29:47.882685+00	https://example.com/proof-49.pdf	f	\N	\N	2026-04-12 14:29:47.882685+00	2026-04-12 14:29:47.882685+00
c235cc82-6d62-4268-8d07-67b1b6a7d8ee	XG-26-0050	a1111111-1111-1111-1111-111111111111	171650.00	18.0000	18.0500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-12 15:29:47.882685+00	2026-04-12 15:29:47.882685+00
f32227f0-78f9-4200-9d35-5c8b9d1a9aa2	XG-26-0051	b2222222-2222-2222-2222-222222222222	174983.00	18.0500	18.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-12 16:29:47.882685+00	2026-04-12 16:29:47.882685+00
89f81d47-a1e2-4883-99aa-9008a1be7d58	XG-26-0052	c3333333-3333-3333-3333-333333333333	504404.00	0.0576	0.0593	MXN	USD	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-12 19:29:47.882685+00	\N	f	\N	\N	2026-04-12 17:29:47.882685+00	2026-04-12 17:29:47.882685+00
ec050393-c8e8-4ac1-8973-cc04c223243f	XG-26-0053	d4444444-4444-4444-4444-444444444444	181649.00	18.1500	18.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-12 20:29:47.882685+00	\N	f	\N	\N	2026-04-12 18:29:47.882685+00	2026-04-12 18:29:47.882685+00
87bf4a7e-d13e-4d84-b12c-d2e030907259	XG-26-0054	e5555555-5555-5555-5555-555555555555	184982.00	18.2000	18.3300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-12 21:29:47.882685+00	https://example.com/proof-54.pdf	f	\N	\N	2026-04-12 19:29:47.882685+00	2026-04-12 19:29:47.882685+00
a39f1b6f-bf34-47fd-a1ad-99acdf8a6d13	XG-26-0055	a1111111-1111-1111-1111-111111111111	188315.00	18.2500	18.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-12 20:29:47.882685+00	2026-04-12 20:29:47.882685+00
e14db5a8-2a0b-4b5a-9671-762cfc44111d	XG-26-0056	b2222222-2222-2222-2222-222222222222	535512.00	0.0588	0.0629	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	t	2026-04-13 01:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-12 21:29:47.882685+00	2026-04-12 21:29:47.882685+00
e184e241-01f3-4570-b3c0-418eb75cce08	XG-26-0057	c3333333-3333-3333-3333-333333333333	194981.00	18.3500	18.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-13 00:29:47.882685+00	\N	f	\N	\N	2026-04-12 22:29:47.882685+00	2026-04-12 22:29:47.882685+00
7c9d6231-0a07-4ee2-a051-be6c36ad9a5b	XG-26-0058	d4444444-4444-4444-4444-444444444444	198314.00	18.4000	18.6100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-13 01:29:47.882685+00	\N	f	\N	\N	2026-04-12 23:29:47.882685+00	2026-04-12 23:29:47.882685+00
c0e80cb3-0352-4522-9604-ff9b242abdc2	XG-26-0059	e5555555-5555-5555-5555-555555555555	6647.00	18.4500	18.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-13 02:29:47.882685+00	https://example.com/proof-59.pdf	f	\N	\N	2026-04-13 00:29:47.882685+00	2026-04-13 00:29:47.882685+00
3e84190a-23ad-4438-9964-b7383fceb90a	XG-26-0060	a1111111-1111-1111-1111-111111111111	566620.00	0.0540	0.0599	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-13 01:29:47.882685+00	2026-04-13 01:29:47.882685+00
3446bd12-d6b8-4b04-a037-174177355193	XG-26-0061	b2222222-2222-2222-2222-222222222222	13313.00	17.0500	17.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-13 02:29:47.882685+00	2026-04-13 02:29:47.882685+00
3cd7097f-f0c6-46d5-8331-58cb03275ed9	XG-26-0062	c3333333-3333-3333-3333-333333333333	16646.00	17.1000	17.1900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-13 05:29:47.882685+00	\N	f	\N	\N	2026-04-13 03:29:47.882685+00	2026-04-13 03:29:47.882685+00
31aee4e4-b8de-4132-9c74-4bb766ef9a9b	XG-26-0063	d4444444-4444-4444-4444-444444444444	19979.00	17.1500	17.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-13 06:29:47.882685+00	\N	f	\N	\N	2026-04-13 04:29:47.882685+00	2026-04-13 04:29:47.882685+00
008350ba-f11f-4f64-8baa-dae4977537cd	XG-26-0064	e5555555-5555-5555-5555-555555555555	597728.00	0.0552	0.0635	MXN	USD	pending	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	t	2026-04-13 09:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-13 05:29:47.882685+00	2026-04-13 05:29:47.882685+00
242d65d9-44f7-400c-8db5-2859027f0937	XG-26-0065	a1111111-1111-1111-1111-111111111111	26645.00	17.2500	17.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-13 06:29:47.882685+00	2026-04-13 06:29:47.882685+00
9115b2a4-521f-4ebe-9b97-9bfd3eca5d05	XG-26-0066	b2222222-2222-2222-2222-222222222222	29978.00	17.3000	17.4700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-13 07:29:47.882685+00	2026-04-13 07:29:47.882685+00
0aff1ac0-3540-4d6a-8530-7da62ac1b213	XG-26-0067	c3333333-3333-3333-3333-333333333333	33311.00	17.3500	17.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-13 10:29:47.882685+00	\N	f	\N	\N	2026-04-13 08:29:47.882685+00	2026-04-13 08:29:47.882685+00
0d08e040-3eac-4495-898c-4f3b31eaabc4	XG-26-0068	d4444444-4444-4444-4444-444444444444	628836.00	0.0564	0.0598	MXN	USD	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-13 11:29:47.882685+00	\N	f	\N	\N	2026-04-13 09:29:47.882685+00	2026-04-13 09:29:47.882685+00
b83f7954-f6b8-4b31-a6fc-0554f64d1773	XG-26-0069	e5555555-5555-5555-5555-555555555555	39977.00	17.4500	17.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-13 12:29:47.882685+00	https://example.com/proof-69.pdf	f	\N	\N	2026-04-13 10:29:47.882685+00	2026-04-13 10:29:47.882685+00
28b1470d-67ae-4102-aa87-bfff01896dfb	XG-26-0070	a1111111-1111-1111-1111-111111111111	43310.00	17.5000	17.5500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-13 11:29:47.882685+00	2026-04-13 11:29:47.882685+00
0c539c33-f982-4ca6-99c9-8febc7d85f4b	XG-26-0071	b2222222-2222-2222-2222-222222222222	46643.00	17.5500	17.6200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-13 12:29:47.882685+00	2026-04-13 12:29:47.882685+00
1dd62bf7-a51e-4ce0-8bf1-552c52139239	XG-26-0072	c3333333-3333-3333-3333-333333333333	659944.00	0.0576	0.0634	MXN	USD	pending	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	t	2026-04-13 17:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-13 13:29:47.882685+00	2026-04-13 13:29:47.882685+00
ac8f6d49-5028-4441-8d50-07fb0e262f25	XG-26-0073	d4444444-4444-4444-4444-444444444444	53309.00	17.6500	17.7600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-13 16:29:47.882685+00	\N	f	\N	\N	2026-04-13 14:29:47.882685+00	2026-04-13 14:29:47.882685+00
5fa96704-00fa-4440-ad5e-0ff24de3e440	XG-26-0074	e5555555-5555-5555-5555-555555555555	56642.00	17.7000	17.8300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-13 17:29:47.882685+00	https://example.com/proof-74.pdf	f	\N	\N	2026-04-13 15:29:47.882685+00	2026-04-13 15:29:47.882685+00
f2639e89-af1e-4c68-8dce-60a99d6e0643	XG-26-0075	a1111111-1111-1111-1111-111111111111	59975.00	17.7500	17.9000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-13 16:29:47.882685+00	2026-04-13 16:29:47.882685+00
1d5756d9-62bc-4f8a-a127-758de0b8541f	XG-26-0076	b2222222-2222-2222-2222-222222222222	691052.00	0.0588	0.0670	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-13 17:29:47.882685+00	2026-04-13 17:29:47.882685+00
a2759847-ed79-4365-85cb-2c1036705b92	XG-26-0077	c3333333-3333-3333-3333-333333333333	66641.00	17.8500	18.0400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-13 20:29:47.882685+00	\N	f	\N	\N	2026-04-13 18:29:47.882685+00	2026-04-13 18:29:47.882685+00
59a26a55-a8d6-4d76-ac3e-138132ff49df	XG-26-0078	d4444444-4444-4444-4444-444444444444	69974.00	17.9000	18.1100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-13 21:29:47.882685+00	\N	f	\N	\N	2026-04-13 19:29:47.882685+00	2026-04-13 19:29:47.882685+00
73b89288-2f42-46d5-9ae9-b0283740bf09	XG-26-0079	e5555555-5555-5555-5555-555555555555	73307.00	17.9500	18.1800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-13 22:29:47.882685+00	https://example.com/proof-79.pdf	f	\N	\N	2026-04-13 20:29:47.882685+00	2026-04-13 20:29:47.882685+00
cf17b1a2-284f-4cc5-9adb-55ac720a3bd5	XG-26-0080	a1111111-1111-1111-1111-111111111111	722160.00	0.0540	0.0567	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	t	2026-04-14 01:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-13 21:29:47.882685+00	2026-04-13 21:29:47.882685+00
6dc0424b-02f3-4102-8d56-0366c8aa0c00	XG-26-0081	b2222222-2222-2222-2222-222222222222	79973.00	18.0500	18.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-13 22:29:47.882685+00	2026-04-13 22:29:47.882685+00
f55794b7-d1f5-48ea-8ebe-086899bb06c0	XG-26-0082	c3333333-3333-3333-3333-333333333333	83306.00	18.1000	18.1900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-14 01:29:47.882685+00	\N	f	\N	\N	2026-04-13 23:29:47.882685+00	2026-04-13 23:29:47.882685+00
21ba217c-70f6-4a3f-b7c5-c5fbc336968f	XG-26-0083	d4444444-4444-4444-4444-444444444444	86639.00	18.1500	18.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-14 02:29:47.882685+00	\N	f	\N	\N	2026-04-14 00:29:47.882685+00	2026-04-14 00:29:47.882685+00
e3b8943f-b6bb-48b1-a38d-740222df1485	XG-26-0084	e5555555-5555-5555-5555-555555555555	753268.00	0.0552	0.0602	MXN	USD	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-14 03:29:47.882685+00	https://example.com/proof-84.pdf	f	\N	\N	2026-04-14 01:29:47.882685+00	2026-04-14 01:29:47.882685+00
47ac30b8-ff80-4b89-8799-ebc859e33a4b	XG-26-0085	a1111111-1111-1111-1111-111111111111	93305.00	18.2500	18.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-14 02:29:47.882685+00	2026-04-14 02:29:47.882685+00
d42a4c05-db9d-43bb-8b29-c15df951e981	XG-26-0086	b2222222-2222-2222-2222-222222222222	96638.00	18.3000	18.4700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-14 03:29:47.882685+00	2026-04-14 03:29:47.882685+00
c20f365c-ef72-456e-9380-fc76613334ad	XG-26-0087	c3333333-3333-3333-3333-333333333333	99971.00	18.3500	18.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-14 06:29:47.882685+00	\N	f	\N	\N	2026-04-14 04:29:47.882685+00	2026-04-14 04:29:47.882685+00
124225d7-0e03-4ff9-a185-4eaa1bdbbc94	XG-26-0088	d4444444-4444-4444-4444-444444444444	784376.00	0.0564	0.0637	MXN	USD	pending	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	t	2026-04-14 09:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-14 05:29:47.882685+00	2026-04-14 05:29:47.882685+00
d1ad996e-1184-4336-85a4-41cd8a1a2237	XG-26-0089	e5555555-5555-5555-5555-555555555555	106637.00	18.4500	18.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-14 08:29:47.882685+00	https://example.com/proof-89.pdf	f	\N	\N	2026-04-14 06:29:47.882685+00	2026-04-14 06:29:47.882685+00
cd785ba1-30e8-49f4-9a37-670763bab220	XG-26-0090	a1111111-1111-1111-1111-111111111111	109970.00	17.0000	17.0500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-14 07:29:47.882685+00	2026-04-14 07:29:47.882685+00
516a2685-cf24-4649-bec0-63907a0901c4	XG-26-0091	b2222222-2222-2222-2222-222222222222	113303.00	17.0500	17.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-14 08:29:47.882685+00	2026-04-14 08:29:47.882685+00
360b3f17-c3e7-404e-8709-43c45ceba023	XG-26-0092	c3333333-3333-3333-3333-333333333333	815484.00	0.0576	0.0599	MXN	USD	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-14 11:29:47.882685+00	\N	f	\N	\N	2026-04-14 09:29:47.882685+00	2026-04-14 09:29:47.882685+00
f67758bd-7d8b-45de-b0b6-c13b18cfa35c	XG-26-0093	d4444444-4444-4444-4444-444444444444	119969.00	17.1500	17.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-14 12:29:47.882685+00	\N	f	\N	\N	2026-04-14 10:29:47.882685+00	2026-04-14 10:29:47.882685+00
478ffce5-eaa0-42e8-b5a6-42496055da9a	XG-26-0094	e5555555-5555-5555-5555-555555555555	123302.00	17.2000	17.3300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-14 13:29:47.882685+00	https://example.com/proof-94.pdf	f	\N	\N	2026-04-14 11:29:47.882685+00	2026-04-14 11:29:47.882685+00
a527d563-f5d1-4b10-9bd5-a44ca5dafc8f	XG-26-0095	a1111111-1111-1111-1111-111111111111	126635.00	17.2500	17.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-14 12:29:47.882685+00	2026-04-14 12:29:47.882685+00
531369bf-72a0-40a5-ab40-049762b6927e	XG-26-0096	b2222222-2222-2222-2222-222222222222	846592.00	0.0588	0.0635	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	t	2026-04-14 17:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-14 13:29:47.882685+00	2026-04-14 13:29:47.882685+00
6bef1a98-c9f5-47f9-a9b0-8c6c972066f2	XG-26-0097	c3333333-3333-3333-3333-333333333333	133301.00	17.3500	17.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-14 16:29:47.882685+00	\N	f	\N	\N	2026-04-14 14:29:47.882685+00	2026-04-14 14:29:47.882685+00
87b54493-41c7-4276-9492-65c3af76e478	XG-26-0098	d4444444-4444-4444-4444-444444444444	136634.00	17.4000	17.6100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-14 17:29:47.882685+00	\N	f	\N	\N	2026-04-14 15:29:47.882685+00	2026-04-14 15:29:47.882685+00
a13f50b8-8500-4e27-97d1-ce5440fa2227	XG-26-0099	e5555555-5555-5555-5555-555555555555	139967.00	17.4500	17.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-14 18:29:47.882685+00	https://example.com/proof-99.pdf	f	\N	\N	2026-04-14 16:29:47.882685+00	2026-04-14 16:29:47.882685+00
7c39c41e-9764-4dd0-adb7-83be46019975	XG-26-0100	a1111111-1111-1111-1111-111111111111	877700.00	0.0540	0.0605	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-14 17:29:47.882685+00	2026-04-14 17:29:47.882685+00
9308c35c-0c67-46b1-9886-ff3c78739b9e	XG-26-0101	b2222222-2222-2222-2222-222222222222	146633.00	17.5500	17.6200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-14 18:29:47.882685+00	2026-04-14 18:29:47.882685+00
35f0b2bc-47a9-44b2-b046-838da2eec94a	XG-26-0102	c3333333-3333-3333-3333-333333333333	149966.00	17.6000	17.6900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-14 21:29:47.882685+00	\N	f	\N	\N	2026-04-14 19:29:47.882685+00	2026-04-14 19:29:47.882685+00
bf22ef3d-a48e-48d6-8e21-0270c165419a	XG-26-0103	d4444444-4444-4444-4444-444444444444	153299.00	17.6500	17.7600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-14 22:29:47.882685+00	\N	f	\N	\N	2026-04-14 20:29:47.882685+00	2026-04-14 20:29:47.882685+00
60055a57-4eb9-4887-97eb-7a2fd1ae7ea7	XG-26-0104	e5555555-5555-5555-5555-555555555555	908808.00	0.0552	0.0569	MXN	USD	pending	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	t	2026-04-15 01:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-14 21:29:47.882685+00	2026-04-14 21:29:47.882685+00
6848b287-bde0-4b81-bc5e-c424b33621e1	XG-26-0105	a1111111-1111-1111-1111-111111111111	159965.00	17.7500	17.9000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-14 22:29:47.882685+00	2026-04-14 22:29:47.882685+00
42aeced3-4f5d-4ecd-a066-9271c7bc2b2b	XG-26-0106	b2222222-2222-2222-2222-222222222222	163298.00	17.8000	17.9700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-14 23:29:47.882685+00	2026-04-14 23:29:47.882685+00
359968b3-02b7-40b5-9ffa-0986c18ad957	XG-26-0107	c3333333-3333-3333-3333-333333333333	166631.00	17.8500	18.0400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-15 02:29:47.882685+00	\N	f	\N	\N	2026-04-15 00:29:47.882685+00	2026-04-15 00:29:47.882685+00
81798389-6cf2-40e7-b9e9-d4e332278d89	XG-26-0108	d4444444-4444-4444-4444-444444444444	939916.00	0.0564	0.0603	MXN	USD	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-15 03:29:47.882685+00	\N	f	\N	\N	2026-04-15 01:29:47.882685+00	2026-04-15 01:29:47.882685+00
1f0e6499-232a-4d90-b6ba-878093dd0ab4	XG-26-0109	e5555555-5555-5555-5555-555555555555	173297.00	17.9500	18.1800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-15 04:29:47.882685+00	https://example.com/proof-109.pdf	f	\N	\N	2026-04-15 02:29:47.882685+00	2026-04-15 02:29:47.882685+00
a35469c1-27ce-4170-a6da-7fcc9197c098	XG-26-0110	a1111111-1111-1111-1111-111111111111	176630.00	18.0000	18.0500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-15 03:29:47.882685+00	2026-04-15 03:29:47.882685+00
e28a77dd-da8b-4156-9804-2bb23f1f59c2	XG-26-0111	b2222222-2222-2222-2222-222222222222	179963.00	18.0500	18.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-15 04:29:47.882685+00	2026-04-15 04:29:47.882685+00
9a717556-26aa-4e22-b3a9-066cd6e6590d	XG-26-0112	c3333333-3333-3333-3333-333333333333	971024.00	0.0576	0.0639	MXN	USD	pending	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	t	2026-04-15 09:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-15 05:29:47.882685+00	2026-04-15 05:29:47.882685+00
f00e1f21-cad5-45ee-b11b-3854a6050124	XG-26-0113	d4444444-4444-4444-4444-444444444444	186629.00	18.1500	18.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-15 08:29:47.882685+00	\N	f	\N	\N	2026-04-15 06:29:47.882685+00	2026-04-15 06:29:47.882685+00
19b27988-5ffb-4b31-b5c6-0653d6e4ff6b	XG-26-0114	e5555555-5555-5555-5555-555555555555	189962.00	18.2000	18.3300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-15 09:29:47.882685+00	https://example.com/proof-114.pdf	f	\N	\N	2026-04-15 07:29:47.882685+00	2026-04-15 07:29:47.882685+00
cd07bb3c-7760-4720-bb40-9d89c6c0d2fc	XG-26-0115	a1111111-1111-1111-1111-111111111111	193295.00	18.2500	18.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-15 08:29:47.882685+00	2026-04-15 08:29:47.882685+00
efed95c1-6266-41d8-b775-0940c6411dd9	XG-26-0116	b2222222-2222-2222-2222-222222222222	102132.00	0.0588	0.0676	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-15 09:29:47.882685+00	2026-04-15 09:29:47.882685+00
2546462b-83cc-4501-ad1a-b439b952d64b	XG-26-0117	c3333333-3333-3333-3333-333333333333	199961.00	18.3500	18.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-15 12:29:47.882685+00	\N	f	\N	\N	2026-04-15 10:29:47.882685+00	2026-04-15 10:29:47.882685+00
999f4ed6-7a38-466d-9a08-c0c740dc3614	XG-26-0118	d4444444-4444-4444-4444-444444444444	8294.00	18.4000	18.6100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-15 13:29:47.882685+00	\N	f	\N	\N	2026-04-15 11:29:47.882685+00	2026-04-15 11:29:47.882685+00
74f55757-8e96-41fe-a519-6e6495048a57	XG-26-0119	e5555555-5555-5555-5555-555555555555	11627.00	18.4500	18.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-15 14:29:47.882685+00	https://example.com/proof-119.pdf	f	\N	\N	2026-04-15 12:29:47.882685+00	2026-04-15 12:29:47.882685+00
43dd180e-3f03-4a22-bc1a-fcdaa0af0384	XG-26-0120	a1111111-1111-1111-1111-111111111111	133240.00	0.0540	0.0572	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	t	2026-04-15 17:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-15 13:29:47.882685+00	2026-04-15 13:29:47.882685+00
adc9ae8d-d7ec-4931-a196-f3dd65b3384a	XG-26-0121	b2222222-2222-2222-2222-222222222222	18293.00	17.0500	17.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-15 14:29:47.882685+00	2026-04-15 14:29:47.882685+00
db550589-8ffd-488d-9a18-f9cf0216e567	XG-26-0122	c3333333-3333-3333-3333-333333333333	21626.00	17.1000	17.1900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-15 17:29:47.882685+00	\N	f	\N	\N	2026-04-15 15:29:47.882685+00	2026-04-15 15:29:47.882685+00
ba9a60e9-72ee-4226-8350-fe093f702d7d	XG-26-0123	d4444444-4444-4444-4444-444444444444	24959.00	17.1500	17.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-15 18:29:47.882685+00	\N	f	\N	\N	2026-04-15 16:29:47.882685+00	2026-04-15 16:29:47.882685+00
c75324ae-6087-4e57-a896-397ae4492c79	XG-26-0124	e5555555-5555-5555-5555-555555555555	164348.00	0.0552	0.0607	MXN	USD	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-15 19:29:47.882685+00	https://example.com/proof-124.pdf	f	\N	\N	2026-04-15 17:29:47.882685+00	2026-04-15 17:29:47.882685+00
0cffd3b9-08f5-49e2-b186-08e36d28a18f	XG-26-0125	a1111111-1111-1111-1111-111111111111	31625.00	17.2500	17.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-15 18:29:47.882685+00	2026-04-15 18:29:47.882685+00
0230b657-4a4b-47fd-b1cb-196c4adc1028	XG-26-0126	b2222222-2222-2222-2222-222222222222	34958.00	17.3000	17.4700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-15 19:29:47.882685+00	2026-04-15 19:29:47.882685+00
b85990c4-4063-43b7-a20b-611fdc380150	XG-26-0127	c3333333-3333-3333-3333-333333333333	38291.00	17.3500	17.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-15 22:29:47.882685+00	\N	f	\N	\N	2026-04-15 20:29:47.882685+00	2026-04-15 20:29:47.882685+00
8533a687-56f5-47b1-aa7e-afea24b14c10	XG-26-0128	d4444444-4444-4444-4444-444444444444	195456.00	0.0564	0.0643	MXN	USD	pending	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	t	2026-04-16 01:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-15 21:29:47.882685+00	2026-04-15 21:29:47.882685+00
5b4e72ea-fd71-41c7-b8c9-32c47e3b3b5e	XG-26-0129	e5555555-5555-5555-5555-555555555555	44957.00	17.4500	17.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-16 00:29:47.882685+00	https://example.com/proof-129.pdf	f	\N	\N	2026-04-15 22:29:47.882685+00	2026-04-15 22:29:47.882685+00
cd1110b0-5f38-4967-8e9f-c307dd3ebab3	XG-26-0130	a1111111-1111-1111-1111-111111111111	48290.00	17.5000	17.5500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-15 23:29:47.882685+00	2026-04-15 23:29:47.882685+00
f91c2d53-67bb-4320-ab6d-d37529c32142	XG-26-0131	b2222222-2222-2222-2222-222222222222	51623.00	17.5500	17.6200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-16 00:29:47.882685+00	2026-04-16 00:29:47.882685+00
cc597590-2ca6-4fec-b490-0f983ba5bacf	XG-26-0132	c3333333-3333-3333-3333-333333333333	226564.00	0.0576	0.0605	MXN	USD	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-16 03:29:47.882685+00	\N	f	\N	\N	2026-04-16 01:29:47.882685+00	2026-04-16 01:29:47.882685+00
5022b84e-204e-4f98-9f74-e0c4870d2c09	XG-26-0133	d4444444-4444-4444-4444-444444444444	58289.00	17.6500	17.7600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-16 04:29:47.882685+00	\N	f	\N	\N	2026-04-16 02:29:47.882685+00	2026-04-16 02:29:47.882685+00
55e50db7-fa28-4601-bf67-18b2aefd69eb	XG-26-0134	e5555555-5555-5555-5555-555555555555	61622.00	17.7000	17.8300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-16 05:29:47.882685+00	https://example.com/proof-134.pdf	f	\N	\N	2026-04-16 03:29:47.882685+00	2026-04-16 03:29:47.882685+00
0ed6cd31-0994-4093-91fa-30a49b10fe73	XG-26-0135	a1111111-1111-1111-1111-111111111111	64955.00	17.7500	17.9000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-16 04:29:47.882685+00	2026-04-16 04:29:47.882685+00
0d40293e-cc10-44f5-8800-dd2264e795a3	XG-26-0136	b2222222-2222-2222-2222-222222222222	257672.00	0.0588	0.0641	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	t	2026-04-16 09:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-16 05:29:47.882685+00	2026-04-16 05:29:47.882685+00
891e1b2a-1ce6-4bf8-bd00-a5385dfbc102	XG-26-0137	c3333333-3333-3333-3333-333333333333	71621.00	17.8500	18.0400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-16 08:29:47.882685+00	\N	f	\N	\N	2026-04-16 06:29:47.882685+00	2026-04-16 06:29:47.882685+00
25615815-f3e5-4b53-8dcc-9459f1882ff0	XG-26-0138	d4444444-4444-4444-4444-444444444444	74954.00	17.9000	18.1100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-16 09:29:47.882685+00	\N	f	\N	\N	2026-04-16 07:29:47.882685+00	2026-04-16 07:29:47.882685+00
a2b53ab2-26c5-40c9-9d33-9cb9d45f3d30	XG-26-0139	e5555555-5555-5555-5555-555555555555	78287.00	17.9500	18.1800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-16 10:29:47.882685+00	https://example.com/proof-139.pdf	f	\N	\N	2026-04-16 08:29:47.882685+00	2026-04-16 08:29:47.882685+00
0a6256e8-60c8-4ad6-9630-6e4763243e66	XG-26-0140	a1111111-1111-1111-1111-111111111111	288780.00	0.0540	0.0610	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-16 09:29:47.882685+00	2026-04-16 09:29:47.882685+00
903baa95-8e87-46ac-ab58-432f9874863d	XG-26-0141	b2222222-2222-2222-2222-222222222222	84953.00	18.0500	18.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-16 10:29:47.882685+00	2026-04-16 10:29:47.882685+00
65befcbb-5147-482a-8efb-23d778ed5626	XG-26-0142	c3333333-3333-3333-3333-333333333333	88286.00	18.1000	18.1900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-16 13:29:47.882685+00	\N	f	\N	\N	2026-04-16 11:29:47.882685+00	2026-04-16 11:29:47.882685+00
2f28818b-c7d4-4ad1-9cc8-2c24ac80fc73	XG-26-0143	d4444444-4444-4444-4444-444444444444	91619.00	18.1500	18.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-16 14:29:47.882685+00	\N	f	\N	\N	2026-04-16 12:29:47.882685+00	2026-04-16 12:29:47.882685+00
ae8f3eae-bc56-4712-a102-637383d567d4	XG-26-0144	e5555555-5555-5555-5555-555555555555	319888.00	0.0552	0.0574	MXN	USD	pending	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	t	2026-04-16 17:29:47.882685+00	00000000-0000-0000-0000-000000000001	2026-04-16 13:29:47.882685+00	2026-04-16 13:29:47.882685+00
58747d24-b4bc-4d86-8b68-9fdcbf9af972	XG-26-0145	a1111111-1111-1111-1111-111111111111	98285.00	18.2500	18.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-16 14:29:47.882685+00	2026-04-16 14:29:47.882685+00
01394e9b-b28e-44de-bf03-664027d8af46	XG-26-0146	b2222222-2222-2222-2222-222222222222	101618.00	18.3000	18.4700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-16 15:29:47.882685+00	2026-04-16 15:29:47.882685+00
e6b11d5e-3627-406a-8ab2-7e19559602b7	XG-26-0147	c3333333-3333-3333-3333-333333333333	104951.00	18.3500	18.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-16 18:29:47.882685+00	\N	f	\N	\N	2026-04-16 16:29:47.882685+00	2026-04-16 16:29:47.882685+00
40667db6-d762-4226-9cd1-1f235f53bd60	XG-26-0148	d4444444-4444-4444-4444-444444444444	350996.00	0.0564	0.0609	MXN	USD	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-16 19:29:47.882685+00	\N	f	\N	\N	2026-04-16 17:29:47.882685+00	2026-04-16 17:29:47.882685+00
ac72a655-8072-484c-8ada-418940887f65	XG-26-0149	e5555555-5555-5555-5555-555555555555	111617.00	18.4500	18.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-16 20:29:47.882685+00	https://example.com/proof-149.pdf	f	\N	\N	2026-04-16 18:29:47.882685+00	2026-04-16 18:29:47.882685+00
60e6b679-aaa6-49a5-a755-218ee768e0bf	XG-26-0150	a1111111-1111-1111-1111-111111111111	114950.00	17.0000	17.0500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-16 19:29:47.882685+00	2026-04-16 19:29:47.882685+00
fc4d00aa-0870-45dd-bcad-2569008efe14	XG-26-0151	a1111111-1111-1111-1111-111111111111	50000.00	17.2350	17.2350	USD	MXN	authorized	\N	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-14 19:29:48.127538+00	\N	f	\N	\N	2026-04-16 19:29:48.127538+00	2026-04-16 19:29:48.127538+00
f9581534-b298-4a07-9fa7-ccb3653592da	XG-26-0152	a1111111-1111-1111-1111-111111111111	25000.00	17.3100	17.3100	USD	MXN	pending	\N	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-16 19:29:48.127538+00	2026-04-16 19:29:48.127538+00
ed357c08-389a-432d-af59-e7daf3946f2b	XG-26-0153	b2222222-2222-2222-2222-222222222222	8333.00	17.0500	17.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-10 14:44:57.499529+00	2026-04-10 14:44:57.499529+00
96b6dd5e-5b64-4526-972b-8771981eb3c4	XG-26-0154	c3333333-3333-3333-3333-333333333333	11666.00	17.1000	17.1900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-10 17:44:57.499529+00	\N	f	\N	\N	2026-04-10 15:44:57.499529+00	2026-04-10 15:44:57.499529+00
63ab9250-0dd3-434e-9ff7-7e7da56f5321	XG-26-0155	d4444444-4444-4444-4444-444444444444	14999.00	17.1500	17.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-10 18:44:57.499529+00	\N	f	\N	\N	2026-04-10 16:44:57.499529+00	2026-04-10 16:44:57.499529+00
c4279de2-2266-4a51-9a4b-088922f474ca	XG-26-0156	e5555555-5555-5555-5555-555555555555	131108.00	0.0552	0.0591	MXN	USD	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-10 19:44:57.499529+00	https://example.com/proof-4.pdf	f	\N	\N	2026-04-10 17:44:57.499529+00	2026-04-10 17:44:57.499529+00
d37c7bc9-d4da-4a92-b7ce-648ffa69201e	XG-26-0157	a1111111-1111-1111-1111-111111111111	21665.00	17.2500	17.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-10 18:44:57.499529+00	2026-04-10 18:44:57.499529+00
588b56f3-9893-474e-829d-a584d1dcf090	XG-26-0158	b2222222-2222-2222-2222-222222222222	24998.00	17.3000	17.4700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-10 19:44:57.499529+00	2026-04-10 19:44:57.499529+00
d7f99a40-964d-4288-9ddf-e246b65e5dff	XG-26-0159	c3333333-3333-3333-3333-333333333333	28331.00	17.3500	17.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-10 22:44:57.499529+00	\N	f	\N	\N	2026-04-10 20:44:57.499529+00	2026-04-10 20:44:57.499529+00
ff6d785e-b2a4-4896-9741-09631336cb89	XG-26-0160	d4444444-4444-4444-4444-444444444444	162216.00	0.0564	0.0626	MXN	USD	pending	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	t	2026-04-11 01:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-10 21:44:57.499529+00	2026-04-10 21:44:57.499529+00
d1d647c0-bb4f-4c66-9082-1a9290c04327	XG-26-0161	e5555555-5555-5555-5555-555555555555	34997.00	17.4500	17.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-11 00:44:57.499529+00	https://example.com/proof-9.pdf	f	\N	\N	2026-04-10 22:44:57.499529+00	2026-04-10 22:44:57.499529+00
4ea0d05b-161d-4ff1-a386-ef55bc291350	XG-26-0162	a1111111-1111-1111-1111-111111111111	38330.00	17.5000	17.5500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-10 23:44:57.499529+00	2026-04-10 23:44:57.499529+00
4e2bb570-9c79-4ad7-ac30-4e37a8180c4a	XG-26-0163	b2222222-2222-2222-2222-222222222222	41663.00	17.5500	17.6200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-11 00:44:57.499529+00	2026-04-11 00:44:57.499529+00
a4c7ef73-7099-4465-a0de-9938ee042e38	XG-26-0165	d4444444-4444-4444-4444-444444444444	48329.00	17.6500	17.7600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-11 04:44:57.499529+00	\N	f	\N	\N	2026-04-11 02:44:57.499529+00	2026-04-11 02:44:57.499529+00
32220618-cb7b-4f09-9f64-d310ec739928	XG-26-0166	e5555555-5555-5555-5555-555555555555	51662.00	17.7000	17.8300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-11 05:44:57.499529+00	https://example.com/proof-14.pdf	f	\N	\N	2026-04-11 03:44:57.499529+00	2026-04-11 03:44:57.499529+00
947630f5-89fc-4d5b-a1e2-bc37a13d7cd6	XG-26-0167	a1111111-1111-1111-1111-111111111111	54995.00	17.7500	17.9000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-11 04:44:57.499529+00	2026-04-11 04:44:57.499529+00
9bb9468d-eda0-4303-919a-c2a086bd6ff5	XG-26-0168	b2222222-2222-2222-2222-222222222222	224432.00	0.0588	0.0623	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	t	2026-04-11 09:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-11 05:44:57.499529+00	2026-04-11 05:44:57.499529+00
1245c876-808e-4fae-bd76-581fb0a2ceeb	XG-26-0169	c3333333-3333-3333-3333-333333333333	61661.00	17.8500	18.0400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-11 08:44:57.499529+00	\N	f	\N	\N	2026-04-11 06:44:57.499529+00	2026-04-11 06:44:57.499529+00
04a34813-1010-4413-a791-b88444333389	XG-26-0170	d4444444-4444-4444-4444-444444444444	64994.00	17.9000	18.1100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-11 09:44:57.499529+00	\N	f	\N	\N	2026-04-11 07:44:57.499529+00	2026-04-11 07:44:57.499529+00
a9c915e9-b44d-428a-9a5e-494e45aa7df0	XG-26-0171	e5555555-5555-5555-5555-555555555555	68327.00	17.9500	18.1800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-11 10:44:57.499529+00	https://example.com/proof-19.pdf	f	\N	\N	2026-04-11 08:44:57.499529+00	2026-04-11 08:44:57.499529+00
8e16f0fd-284b-4b4f-861c-3179f5472e63	XG-26-0172	a1111111-1111-1111-1111-111111111111	255540.00	0.0540	0.0594	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-11 09:44:57.499529+00	2026-04-11 09:44:57.499529+00
2e076b50-f848-49bf-a5db-cc9dc4cd41d6	XG-26-0173	b2222222-2222-2222-2222-222222222222	74993.00	18.0500	18.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-11 10:44:57.499529+00	2026-04-11 10:44:57.499529+00
13875dd5-63ef-4e1c-b1e6-0e89d7278052	XG-26-0174	c3333333-3333-3333-3333-333333333333	78326.00	18.1000	18.1900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-11 13:44:57.499529+00	\N	f	\N	\N	2026-04-11 11:44:57.499529+00	2026-04-11 11:44:57.499529+00
a6874bb3-3320-49b8-8e88-99c474f2d5f1	XG-26-0175	d4444444-4444-4444-4444-444444444444	81659.00	18.1500	18.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-11 14:44:57.499529+00	\N	f	\N	\N	2026-04-11 12:44:57.499529+00	2026-04-11 12:44:57.499529+00
5325688e-43d4-453b-9f27-7790e065589b	XG-26-0176	e5555555-5555-5555-5555-555555555555	286648.00	0.0552	0.0629	MXN	USD	pending	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	t	2026-04-11 17:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-11 13:44:57.499529+00	2026-04-11 13:44:57.499529+00
4714ce9f-451d-4ab1-9909-a81a0cdb4b5b	XG-26-0177	a1111111-1111-1111-1111-111111111111	88325.00	18.2500	18.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-11 14:44:57.499529+00	2026-04-11 14:44:57.499529+00
f3a56a11-01e4-4a0a-86ab-64b688b6d0cc	XG-26-0178	b2222222-2222-2222-2222-222222222222	91658.00	18.3000	18.4700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-11 15:44:57.499529+00	2026-04-11 15:44:57.499529+00
dee791c0-46c3-4cad-abb8-90cff9b2024b	XG-26-0179	c3333333-3333-3333-3333-333333333333	94991.00	18.3500	18.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-11 18:44:57.499529+00	\N	f	\N	\N	2026-04-11 16:44:57.499529+00	2026-04-11 16:44:57.499529+00
9518b716-b544-4f80-b5ae-0eb8b6fcb503	XG-26-0180	d4444444-4444-4444-4444-444444444444	317756.00	0.0564	0.0592	MXN	USD	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-11 19:44:57.499529+00	\N	f	\N	\N	2026-04-11 17:44:57.499529+00	2026-04-11 17:44:57.499529+00
7579dffd-8934-4fc1-a055-5e3b0015cd1a	XG-26-0181	e5555555-5555-5555-5555-555555555555	101657.00	18.4500	18.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-11 20:44:57.499529+00	https://example.com/proof-29.pdf	f	\N	\N	2026-04-11 18:44:57.499529+00	2026-04-11 18:44:57.499529+00
3caf9c1c-410a-42ce-b634-4be52632dc86	XG-26-0182	a1111111-1111-1111-1111-111111111111	104990.00	17.0000	17.0500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-11 19:44:57.499529+00	2026-04-11 19:44:57.499529+00
7521e57a-9871-485d-b0df-e7d01706e1aa	XG-26-0183	b2222222-2222-2222-2222-222222222222	108323.00	17.0500	17.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-11 20:44:57.499529+00	2026-04-11 20:44:57.499529+00
f7bebeaf-15c5-42d5-851c-10479e0fd1ab	XG-26-0184	c3333333-3333-3333-3333-333333333333	348864.00	0.0576	0.0628	MXN	USD	pending	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	t	2026-04-12 01:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-11 21:44:57.499529+00	2026-04-11 21:44:57.499529+00
28ebcc87-573e-4aa8-9abd-542f65c746ab	XG-26-0185	d4444444-4444-4444-4444-444444444444	114989.00	17.1500	17.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-12 00:44:57.499529+00	\N	f	\N	\N	2026-04-11 22:44:57.499529+00	2026-04-11 22:44:57.499529+00
f14c90a7-9458-4e71-a6ee-ed53cd64cb75	XG-26-0186	e5555555-5555-5555-5555-555555555555	118322.00	17.2000	17.3300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-12 01:44:57.499529+00	https://example.com/proof-34.pdf	f	\N	\N	2026-04-11 23:44:57.499529+00	2026-04-11 23:44:57.499529+00
137b87d4-be09-4340-9835-1dac18cce233	XG-26-0187	a1111111-1111-1111-1111-111111111111	121655.00	17.2500	17.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-12 00:44:57.499529+00	2026-04-12 00:44:57.499529+00
2aac4901-a4e1-4bbf-a316-6d643a33d939	XG-26-0188	b2222222-2222-2222-2222-222222222222	379972.00	0.0588	0.0664	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-12 01:44:57.499529+00	2026-04-12 01:44:57.499529+00
1ca06cdf-d176-4196-87c1-1876ee412393	XG-26-0189	c3333333-3333-3333-3333-333333333333	128321.00	17.3500	17.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-12 04:44:57.499529+00	\N	f	\N	\N	2026-04-12 02:44:57.499529+00	2026-04-12 02:44:57.499529+00
ed6fb364-80ee-4b23-b8b9-432be35e13bc	XG-26-0190	d4444444-4444-4444-4444-444444444444	131654.00	17.4000	17.6100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-12 05:44:57.499529+00	\N	f	\N	\N	2026-04-12 03:44:57.499529+00	2026-04-12 03:44:57.499529+00
d8418a7a-663d-4e33-a965-783f587a9789	XG-26-0191	e5555555-5555-5555-5555-555555555555	134987.00	17.4500	17.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-12 06:44:57.499529+00	https://example.com/proof-39.pdf	f	\N	\N	2026-04-12 04:44:57.499529+00	2026-04-12 04:44:57.499529+00
13eec2a5-7af8-41bd-a7f5-06cec0b6d1dd	XG-26-0192	a1111111-1111-1111-1111-111111111111	411080.00	0.0540	0.0562	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	t	2026-04-12 09:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-12 05:44:57.499529+00	2026-04-12 05:44:57.499529+00
ced09bbd-e1a7-43b2-9d63-18df7feed125	XG-26-0193	b2222222-2222-2222-2222-222222222222	141653.00	17.5500	17.6200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-12 06:44:57.499529+00	2026-04-12 06:44:57.499529+00
bfb7f743-1f19-422d-b72e-cd3e4d1563bd	XG-26-0194	c3333333-3333-3333-3333-333333333333	144986.00	17.6000	17.6900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-12 09:44:57.499529+00	\N	f	\N	\N	2026-04-12 07:44:57.499529+00	2026-04-12 07:44:57.499529+00
5c43fcd0-1860-422a-a0ab-909fe860ab96	XG-26-0195	d4444444-4444-4444-4444-444444444444	148319.00	17.6500	17.7600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-12 10:44:57.499529+00	\N	f	\N	\N	2026-04-12 08:44:57.499529+00	2026-04-12 08:44:57.499529+00
34f16b47-25d5-4867-8d77-dabc5452658b	XG-26-0196	e5555555-5555-5555-5555-555555555555	442188.00	0.0552	0.0596	MXN	USD	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-12 11:44:57.499529+00	https://example.com/proof-44.pdf	f	\N	\N	2026-04-12 09:44:57.499529+00	2026-04-12 09:44:57.499529+00
1612358c-326e-486b-a39e-89ecbc2be443	XG-26-0197	a1111111-1111-1111-1111-111111111111	154985.00	17.7500	17.9000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-12 10:44:57.499529+00	2026-04-12 10:44:57.499529+00
742ac528-6e2e-41cb-bd1c-177207a2edf6	XG-26-0198	b2222222-2222-2222-2222-222222222222	158318.00	17.8000	17.9700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-12 11:44:57.499529+00	2026-04-12 11:44:57.499529+00
8f0d8ffe-08ab-4d4e-b208-4f1548527d1c	XG-26-0199	c3333333-3333-3333-3333-333333333333	161651.00	17.8500	18.0400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-12 14:44:57.499529+00	\N	f	\N	\N	2026-04-12 12:44:57.499529+00	2026-04-12 12:44:57.499529+00
3c998952-d9c4-48be-b3ca-a7101d401c59	XG-26-0200	d4444444-4444-4444-4444-444444444444	473296.00	0.0564	0.0632	MXN	USD	pending	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	t	2026-04-12 17:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-12 13:44:57.499529+00	2026-04-12 13:44:57.499529+00
1e7a2363-594e-4c64-b541-296317aba38f	XG-26-0201	e5555555-5555-5555-5555-555555555555	168317.00	17.9500	18.1800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-12 16:44:57.499529+00	https://example.com/proof-49.pdf	f	\N	\N	2026-04-12 14:44:57.499529+00	2026-04-12 14:44:57.499529+00
ceb1ede3-80ca-472b-8308-c8deff2535be	XG-26-0202	a1111111-1111-1111-1111-111111111111	171650.00	18.0000	18.0500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-12 15:44:57.499529+00	2026-04-12 15:44:57.499529+00
c4e528d5-f176-42bd-b7c1-4779a4345e6c	XG-26-0203	b2222222-2222-2222-2222-222222222222	174983.00	18.0500	18.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-12 16:44:57.499529+00	2026-04-12 16:44:57.499529+00
4ae60df0-8d22-47a3-b1eb-e11a06bb7d0b	XG-26-0204	c3333333-3333-3333-3333-333333333333	504404.00	0.0576	0.0593	MXN	USD	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-12 19:44:57.499529+00	\N	f	\N	\N	2026-04-12 17:44:57.499529+00	2026-04-12 17:44:57.499529+00
28993c00-f18e-4ce0-9a15-b5c299e274b2	XG-26-0205	d4444444-4444-4444-4444-444444444444	181649.00	18.1500	18.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-12 20:44:57.499529+00	\N	f	\N	\N	2026-04-12 18:44:57.499529+00	2026-04-12 18:44:57.499529+00
f7e3cfa3-4da6-4059-a571-776e962d93ce	XG-26-0206	e5555555-5555-5555-5555-555555555555	184982.00	18.2000	18.3300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-12 21:44:57.499529+00	https://example.com/proof-54.pdf	f	\N	\N	2026-04-12 19:44:57.499529+00	2026-04-12 19:44:57.499529+00
55b333c8-46f4-450a-865f-b826c2c07d5b	XG-26-0207	a1111111-1111-1111-1111-111111111111	188315.00	18.2500	18.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-12 20:44:57.499529+00	2026-04-12 20:44:57.499529+00
bf261047-c0a0-4de8-a178-0c5799edef19	XG-26-0208	b2222222-2222-2222-2222-222222222222	535512.00	0.0588	0.0629	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	t	2026-04-13 01:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-12 21:44:57.499529+00	2026-04-12 21:44:57.499529+00
864f1bda-2bea-4ef8-9286-9dae56cf8dd5	XG-26-0209	c3333333-3333-3333-3333-333333333333	194981.00	18.3500	18.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-13 00:44:57.499529+00	\N	f	\N	\N	2026-04-12 22:44:57.499529+00	2026-04-12 22:44:57.499529+00
bc7c5317-0209-4ee3-97a9-4ad53a5bd927	XG-26-0210	d4444444-4444-4444-4444-444444444444	198314.00	18.4000	18.6100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-13 01:44:57.499529+00	\N	f	\N	\N	2026-04-12 23:44:57.499529+00	2026-04-12 23:44:57.499529+00
29f99462-2012-461d-91a4-c2d7c788ee1c	XG-26-0211	e5555555-5555-5555-5555-555555555555	6647.00	18.4500	18.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-13 02:44:57.499529+00	https://example.com/proof-59.pdf	f	\N	\N	2026-04-13 00:44:57.499529+00	2026-04-13 00:44:57.499529+00
941a57c4-8cb1-444a-bdc5-81db33457048	XG-26-0212	a1111111-1111-1111-1111-111111111111	566620.00	0.0540	0.0599	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-13 01:44:57.499529+00	2026-04-13 01:44:57.499529+00
cd320df0-61b2-4b5b-b906-ccc26392ea47	XG-26-0213	b2222222-2222-2222-2222-222222222222	13313.00	17.0500	17.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-13 02:44:57.499529+00	2026-04-13 02:44:57.499529+00
9479df5c-00be-4df8-818d-1287f38f3bd0	XG-26-0214	c3333333-3333-3333-3333-333333333333	16646.00	17.1000	17.1900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-13 05:44:57.499529+00	\N	f	\N	\N	2026-04-13 03:44:57.499529+00	2026-04-13 03:44:57.499529+00
4c67299d-17d1-426f-b2e4-f4372190a23a	XG-26-0215	d4444444-4444-4444-4444-444444444444	19979.00	17.1500	17.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-13 06:44:57.499529+00	\N	f	\N	\N	2026-04-13 04:44:57.499529+00	2026-04-13 04:44:57.499529+00
7b346b80-2ff6-42e1-916a-7491515ef5ed	XG-26-0216	e5555555-5555-5555-5555-555555555555	597728.00	0.0552	0.0635	MXN	USD	pending	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	t	2026-04-13 09:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-13 05:44:57.499529+00	2026-04-13 05:44:57.499529+00
6dca6c0b-fef4-4cad-a2ff-c7a260703ac6	XG-26-0217	a1111111-1111-1111-1111-111111111111	26645.00	17.2500	17.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-13 06:44:57.499529+00	2026-04-13 06:44:57.499529+00
286046a2-829c-40ed-b4f1-dfea2540b3f4	XG-26-0218	b2222222-2222-2222-2222-222222222222	29978.00	17.3000	17.4700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-13 07:44:57.499529+00	2026-04-13 07:44:57.499529+00
9dad103d-0edd-437c-aaa1-baeb3dbb1f2e	XG-26-0219	c3333333-3333-3333-3333-333333333333	33311.00	17.3500	17.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-13 10:44:57.499529+00	\N	f	\N	\N	2026-04-13 08:44:57.499529+00	2026-04-13 08:44:57.499529+00
dd4bddca-237b-44d5-9991-86d03624edb4	XG-26-0220	d4444444-4444-4444-4444-444444444444	628836.00	0.0564	0.0598	MXN	USD	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-13 11:44:57.499529+00	\N	f	\N	\N	2026-04-13 09:44:57.499529+00	2026-04-13 09:44:57.499529+00
569bdbaa-83cd-4e39-90c8-5adea5bd3d39	XG-26-0221	e5555555-5555-5555-5555-555555555555	39977.00	17.4500	17.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-13 12:44:57.499529+00	https://example.com/proof-69.pdf	f	\N	\N	2026-04-13 10:44:57.499529+00	2026-04-13 10:44:57.499529+00
9aae1dac-dfb3-4399-b680-c1aab5e11a28	XG-26-0222	a1111111-1111-1111-1111-111111111111	43310.00	17.5000	17.5500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-13 11:44:57.499529+00	2026-04-13 11:44:57.499529+00
73450d92-580d-4b41-8b82-d6cd317ae9a9	XG-26-0223	b2222222-2222-2222-2222-222222222222	46643.00	17.5500	17.6200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-13 12:44:57.499529+00	2026-04-13 12:44:57.499529+00
af8176da-6228-440a-843b-5751e762de31	XG-26-0224	c3333333-3333-3333-3333-333333333333	659944.00	0.0576	0.0634	MXN	USD	pending	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	t	2026-04-13 17:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-13 13:44:57.499529+00	2026-04-13 13:44:57.499529+00
c858f0ef-bdd5-49b5-8b78-24b0818c0f30	XG-26-0225	d4444444-4444-4444-4444-444444444444	53309.00	17.6500	17.7600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-13 16:44:57.499529+00	\N	f	\N	\N	2026-04-13 14:44:57.499529+00	2026-04-13 14:44:57.499529+00
b1e3e098-c855-4755-9d88-1785318cb74d	XG-26-0226	e5555555-5555-5555-5555-555555555555	56642.00	17.7000	17.8300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-13 17:44:57.499529+00	https://example.com/proof-74.pdf	f	\N	\N	2026-04-13 15:44:57.499529+00	2026-04-13 15:44:57.499529+00
e20b3cf7-c519-4e91-9cc8-46c2b08d93ae	XG-26-0227	a1111111-1111-1111-1111-111111111111	59975.00	17.7500	17.9000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-13 16:44:57.499529+00	2026-04-13 16:44:57.499529+00
f5ea1d71-2e9a-47e2-b286-5f6bab877dbc	XG-26-0228	b2222222-2222-2222-2222-222222222222	691052.00	0.0588	0.0670	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-13 17:44:57.499529+00	2026-04-13 17:44:57.499529+00
13289db0-964a-4dc6-b0ff-d635ca1f1479	XG-26-0229	c3333333-3333-3333-3333-333333333333	66641.00	17.8500	18.0400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-13 20:44:57.499529+00	\N	f	\N	\N	2026-04-13 18:44:57.499529+00	2026-04-13 18:44:57.499529+00
fc6e7045-f0dc-463a-a5f8-a26c103712bc	XG-26-0230	d4444444-4444-4444-4444-444444444444	69974.00	17.9000	18.1100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-13 21:44:57.499529+00	\N	f	\N	\N	2026-04-13 19:44:57.499529+00	2026-04-13 19:44:57.499529+00
56e28675-60eb-4d64-b2a4-63fd7709be65	XG-26-0231	e5555555-5555-5555-5555-555555555555	73307.00	17.9500	18.1800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-13 22:44:57.499529+00	https://example.com/proof-79.pdf	f	\N	\N	2026-04-13 20:44:57.499529+00	2026-04-13 20:44:57.499529+00
8553988f-db0f-451e-869d-6bb094959dc0	XG-26-0232	a1111111-1111-1111-1111-111111111111	722160.00	0.0540	0.0567	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	t	2026-04-14 01:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-13 21:44:57.499529+00	2026-04-13 21:44:57.499529+00
4d55f728-6d15-4080-980e-991ee387af1c	XG-26-0233	b2222222-2222-2222-2222-222222222222	79973.00	18.0500	18.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-13 22:44:57.499529+00	2026-04-13 22:44:57.499529+00
217cb08d-a7a5-44c4-a72b-82a2850970ea	XG-26-0234	c3333333-3333-3333-3333-333333333333	83306.00	18.1000	18.1900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-14 01:44:57.499529+00	\N	f	\N	\N	2026-04-13 23:44:57.499529+00	2026-04-13 23:44:57.499529+00
457a15f0-0ff9-44b5-851c-4e9e6a5465de	XG-26-0235	d4444444-4444-4444-4444-444444444444	86639.00	18.1500	18.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-14 02:44:57.499529+00	\N	f	\N	\N	2026-04-14 00:44:57.499529+00	2026-04-14 00:44:57.499529+00
1c03693d-2562-4dd2-880a-94f723ff2ccb	XG-26-0236	e5555555-5555-5555-5555-555555555555	753268.00	0.0552	0.0602	MXN	USD	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-14 03:44:57.499529+00	https://example.com/proof-84.pdf	f	\N	\N	2026-04-14 01:44:57.499529+00	2026-04-14 01:44:57.499529+00
1c406c4b-d6c4-48c1-af13-b00978a2c421	XG-26-0237	a1111111-1111-1111-1111-111111111111	93305.00	18.2500	18.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-14 02:44:57.499529+00	2026-04-14 02:44:57.499529+00
8d4d4bc1-3695-406a-8608-4cb849e5bb47	XG-26-0238	b2222222-2222-2222-2222-222222222222	96638.00	18.3000	18.4700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-14 03:44:57.499529+00	2026-04-14 03:44:57.499529+00
93cb598b-768e-4ad4-9b5d-48cf1fbbaa0a	XG-26-0239	c3333333-3333-3333-3333-333333333333	99971.00	18.3500	18.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-14 06:44:57.499529+00	\N	f	\N	\N	2026-04-14 04:44:57.499529+00	2026-04-14 04:44:57.499529+00
06084b99-7ce8-489a-885b-1b1d29808e4e	XG-26-0240	d4444444-4444-4444-4444-444444444444	784376.00	0.0564	0.0637	MXN	USD	pending	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	t	2026-04-14 09:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-14 05:44:57.499529+00	2026-04-14 05:44:57.499529+00
663557b6-206f-49a9-9932-ddfe480aa34b	XG-26-0241	e5555555-5555-5555-5555-555555555555	106637.00	18.4500	18.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-14 08:44:57.499529+00	https://example.com/proof-89.pdf	f	\N	\N	2026-04-14 06:44:57.499529+00	2026-04-14 06:44:57.499529+00
2917ddb1-a23f-4364-96eb-d77ab25471dc	XG-26-0242	a1111111-1111-1111-1111-111111111111	109970.00	17.0000	17.0500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-14 07:44:57.499529+00	2026-04-14 07:44:57.499529+00
ef86c556-8b0b-4434-871c-d848ddbfe7ec	XG-26-0243	b2222222-2222-2222-2222-222222222222	113303.00	17.0500	17.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-14 08:44:57.499529+00	2026-04-14 08:44:57.499529+00
6d0dd0ae-f59e-498c-b40c-683bc46a5b02	XG-26-0244	c3333333-3333-3333-3333-333333333333	815484.00	0.0576	0.0599	MXN	USD	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-14 11:44:57.499529+00	\N	f	\N	\N	2026-04-14 09:44:57.499529+00	2026-04-14 09:44:57.499529+00
7282a11a-9f28-4f71-a209-04d6b3d17d00	XG-26-0245	d4444444-4444-4444-4444-444444444444	119969.00	17.1500	17.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-14 12:44:57.499529+00	\N	f	\N	\N	2026-04-14 10:44:57.499529+00	2026-04-14 10:44:57.499529+00
949d2ecf-a9d6-4ff2-ab14-8ba608875952	XG-26-0246	e5555555-5555-5555-5555-555555555555	123302.00	17.2000	17.3300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-14 13:44:57.499529+00	https://example.com/proof-94.pdf	f	\N	\N	2026-04-14 11:44:57.499529+00	2026-04-14 11:44:57.499529+00
8e945931-20c4-4f9d-8ddd-f4e0373e9771	XG-26-0247	a1111111-1111-1111-1111-111111111111	126635.00	17.2500	17.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-14 12:44:57.499529+00	2026-04-14 12:44:57.499529+00
5b81dfba-acf0-4e9d-848b-1e236ab746bf	XG-26-0248	b2222222-2222-2222-2222-222222222222	846592.00	0.0588	0.0635	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	t	2026-04-14 17:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-14 13:44:57.499529+00	2026-04-14 13:44:57.499529+00
6b62c60c-2e85-4195-9362-a3ca0b7998dd	XG-26-0249	c3333333-3333-3333-3333-333333333333	133301.00	17.3500	17.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-14 16:44:57.499529+00	\N	f	\N	\N	2026-04-14 14:44:57.499529+00	2026-04-14 14:44:57.499529+00
8048b967-f0b9-498f-ba1a-17321fbdd017	XG-26-0250	d4444444-4444-4444-4444-444444444444	136634.00	17.4000	17.6100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-14 17:44:57.499529+00	\N	f	\N	\N	2026-04-14 15:44:57.499529+00	2026-04-14 15:44:57.499529+00
45c0cbc1-5415-44c5-8e3d-da9b1d143cec	XG-26-0251	e5555555-5555-5555-5555-555555555555	139967.00	17.4500	17.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-14 18:44:57.499529+00	https://example.com/proof-99.pdf	f	\N	\N	2026-04-14 16:44:57.499529+00	2026-04-14 16:44:57.499529+00
19df5601-636e-4265-8eac-58ca5ccdb136	XG-26-0252	a1111111-1111-1111-1111-111111111111	877700.00	0.0540	0.0605	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-14 17:44:57.499529+00	2026-04-14 17:44:57.499529+00
ac569a76-b471-4ca3-88ad-c8c5fef5b0f5	XG-26-0253	b2222222-2222-2222-2222-222222222222	146633.00	17.5500	17.6200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-14 18:44:57.499529+00	2026-04-14 18:44:57.499529+00
badcfc9b-1f1b-450f-a74c-f371e94b6695	XG-26-0254	c3333333-3333-3333-3333-333333333333	149966.00	17.6000	17.6900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-14 21:44:57.499529+00	\N	f	\N	\N	2026-04-14 19:44:57.499529+00	2026-04-14 19:44:57.499529+00
6533f1f2-733c-4a05-b9c7-795a25d8c2a3	XG-26-0255	d4444444-4444-4444-4444-444444444444	153299.00	17.6500	17.7600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-14 22:44:57.499529+00	\N	f	\N	\N	2026-04-14 20:44:57.499529+00	2026-04-14 20:44:57.499529+00
edfc39d4-7c2e-47a5-87b1-c2acc4cb0fbd	XG-26-0256	e5555555-5555-5555-5555-555555555555	908808.00	0.0552	0.0569	MXN	USD	pending	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	t	2026-04-15 01:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-14 21:44:57.499529+00	2026-04-14 21:44:57.499529+00
98954ecf-cc18-4bd2-bd93-059f5683927f	XG-26-0257	a1111111-1111-1111-1111-111111111111	159965.00	17.7500	17.9000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-14 22:44:57.499529+00	2026-04-14 22:44:57.499529+00
c95ea0a1-c76a-4df1-b674-82319f3bfc81	XG-26-0258	b2222222-2222-2222-2222-222222222222	163298.00	17.8000	17.9700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-14 23:44:57.499529+00	2026-04-14 23:44:57.499529+00
0fc677bf-31c0-4b7e-9dca-8e0fc5178270	XG-26-0259	c3333333-3333-3333-3333-333333333333	166631.00	17.8500	18.0400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-15 02:44:57.499529+00	\N	f	\N	\N	2026-04-15 00:44:57.499529+00	2026-04-15 00:44:57.499529+00
d9d362f6-a6ea-46b8-9278-942972cf9580	XG-26-0260	d4444444-4444-4444-4444-444444444444	939916.00	0.0564	0.0603	MXN	USD	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-15 03:44:57.499529+00	\N	f	\N	\N	2026-04-15 01:44:57.499529+00	2026-04-15 01:44:57.499529+00
79c6485b-20dc-46f2-a84c-9960297c5ee8	XG-26-0261	e5555555-5555-5555-5555-555555555555	173297.00	17.9500	18.1800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-15 04:44:57.499529+00	https://example.com/proof-109.pdf	f	\N	\N	2026-04-15 02:44:57.499529+00	2026-04-15 02:44:57.499529+00
e6995f1c-27ef-4524-9e3e-e524cdf7a401	XG-26-0262	a1111111-1111-1111-1111-111111111111	176630.00	18.0000	18.0500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-15 03:44:57.499529+00	2026-04-15 03:44:57.499529+00
acb0cd04-053f-45c6-94ab-e83cbebc5d8f	XG-26-0263	b2222222-2222-2222-2222-222222222222	179963.00	18.0500	18.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-15 04:44:57.499529+00	2026-04-15 04:44:57.499529+00
9c3407d7-fe6c-4519-b09c-69b6510a6bcb	XG-26-0264	c3333333-3333-3333-3333-333333333333	971024.00	0.0576	0.0639	MXN	USD	pending	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	t	2026-04-15 09:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-15 05:44:57.499529+00	2026-04-15 05:44:57.499529+00
d88aedaa-973d-4e6c-9a3c-4e8910b773de	XG-26-0265	d4444444-4444-4444-4444-444444444444	186629.00	18.1500	18.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-15 08:44:57.499529+00	\N	f	\N	\N	2026-04-15 06:44:57.499529+00	2026-04-15 06:44:57.499529+00
60c6dbce-51ac-4832-a2ea-98af96407c8f	XG-26-0266	e5555555-5555-5555-5555-555555555555	189962.00	18.2000	18.3300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-15 09:44:57.499529+00	https://example.com/proof-114.pdf	f	\N	\N	2026-04-15 07:44:57.499529+00	2026-04-15 07:44:57.499529+00
62224daf-b41b-4aad-8ad7-c00c2a0b3432	XG-26-0267	a1111111-1111-1111-1111-111111111111	193295.00	18.2500	18.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-15 08:44:57.499529+00	2026-04-15 08:44:57.499529+00
05e6fa36-f44e-4e61-b06b-f795f4401b44	XG-26-0268	b2222222-2222-2222-2222-222222222222	102132.00	0.0588	0.0676	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-15 09:44:57.499529+00	2026-04-15 09:44:57.499529+00
73c4839a-2872-4743-a9c7-c24d021b78e6	XG-26-0269	c3333333-3333-3333-3333-333333333333	199961.00	18.3500	18.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-15 12:44:57.499529+00	\N	f	\N	\N	2026-04-15 10:44:57.499529+00	2026-04-15 10:44:57.499529+00
f012dd62-edf0-4f0c-ac42-8536b4f80ed8	XG-26-0270	d4444444-4444-4444-4444-444444444444	8294.00	18.4000	18.6100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-15 13:44:57.499529+00	\N	f	\N	\N	2026-04-15 11:44:57.499529+00	2026-04-15 11:44:57.499529+00
1b49a2e4-e1f8-404f-83b7-86a2ee73390f	XG-26-0271	e5555555-5555-5555-5555-555555555555	11627.00	18.4500	18.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-15 14:44:57.499529+00	https://example.com/proof-119.pdf	f	\N	\N	2026-04-15 12:44:57.499529+00	2026-04-15 12:44:57.499529+00
e188fac2-a14f-4d5d-a234-b7f7c8c0a3c1	XG-26-0272	a1111111-1111-1111-1111-111111111111	133240.00	0.0540	0.0572	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	t	2026-04-15 17:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-15 13:44:57.499529+00	2026-04-15 13:44:57.499529+00
772eb7e0-dff7-4bbb-8335-d258a1caa9cc	XG-26-0273	b2222222-2222-2222-2222-222222222222	18293.00	17.0500	17.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-15 14:44:57.499529+00	2026-04-15 14:44:57.499529+00
c86dbd99-9572-4656-8109-e7ccc21ea539	XG-26-0274	c3333333-3333-3333-3333-333333333333	21626.00	17.1000	17.1900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-15 17:44:57.499529+00	\N	f	\N	\N	2026-04-15 15:44:57.499529+00	2026-04-15 15:44:57.499529+00
2ed3681b-faf3-4edb-b42f-d10be67c8785	XG-26-0275	d4444444-4444-4444-4444-444444444444	24959.00	17.1500	17.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-15 18:44:57.499529+00	\N	f	\N	\N	2026-04-15 16:44:57.499529+00	2026-04-15 16:44:57.499529+00
59a09d2e-8be3-4770-85a7-78a605b0517e	XG-26-0276	e5555555-5555-5555-5555-555555555555	164348.00	0.0552	0.0607	MXN	USD	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-15 19:44:57.499529+00	https://example.com/proof-124.pdf	f	\N	\N	2026-04-15 17:44:57.499529+00	2026-04-15 17:44:57.499529+00
854e27b9-580d-44d6-9968-bbd90c49d567	XG-26-0277	a1111111-1111-1111-1111-111111111111	31625.00	17.2500	17.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-15 18:44:57.499529+00	2026-04-15 18:44:57.499529+00
2ac21e51-3a65-4220-96df-9e1a45220b47	XG-26-0278	b2222222-2222-2222-2222-222222222222	34958.00	17.3000	17.4700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-15 19:44:57.499529+00	2026-04-15 19:44:57.499529+00
ac7acb18-f9f0-4622-9a66-545d1e0d155f	XG-26-0279	c3333333-3333-3333-3333-333333333333	38291.00	17.3500	17.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-15 22:44:57.499529+00	\N	f	\N	\N	2026-04-15 20:44:57.499529+00	2026-04-15 20:44:57.499529+00
f655bffe-62d9-4c99-b0e6-9fe97b0a00a2	XG-26-0280	d4444444-4444-4444-4444-444444444444	195456.00	0.0564	0.0643	MXN	USD	pending	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	t	2026-04-16 01:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-15 21:44:57.499529+00	2026-04-15 21:44:57.499529+00
548a639a-314d-446e-9183-599848ba7513	XG-26-0281	e5555555-5555-5555-5555-555555555555	44957.00	17.4500	17.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-16 00:44:57.499529+00	https://example.com/proof-129.pdf	f	\N	\N	2026-04-15 22:44:57.499529+00	2026-04-15 22:44:57.499529+00
7eb96276-5c2f-4193-867b-6d78297b5d4e	XG-26-0282	a1111111-1111-1111-1111-111111111111	48290.00	17.5000	17.5500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-15 23:44:57.499529+00	2026-04-15 23:44:57.499529+00
2841bd22-45ec-4bfc-a646-8b87ccb45841	XG-26-0283	b2222222-2222-2222-2222-222222222222	51623.00	17.5500	17.6200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-16 00:44:57.499529+00	2026-04-16 00:44:57.499529+00
39afa9a5-6258-481b-adfb-cfdf57b60325	XG-26-0284	c3333333-3333-3333-3333-333333333333	226564.00	0.0576	0.0605	MXN	USD	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-16 03:44:57.499529+00	\N	f	\N	\N	2026-04-16 01:44:57.499529+00	2026-04-16 01:44:57.499529+00
99680f2a-087b-4b98-85a8-cd5e818bdc99	XG-26-0285	d4444444-4444-4444-4444-444444444444	58289.00	17.6500	17.7600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-16 04:44:57.499529+00	\N	f	\N	\N	2026-04-16 02:44:57.499529+00	2026-04-16 02:44:57.499529+00
ded9ef49-c06f-4ed6-a197-4cf649c1191e	XG-26-0286	e5555555-5555-5555-5555-555555555555	61622.00	17.7000	17.8300	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-16 05:44:57.499529+00	https://example.com/proof-134.pdf	f	\N	\N	2026-04-16 03:44:57.499529+00	2026-04-16 03:44:57.499529+00
fa098b02-d248-4eed-b1df-9ef5b548ac58	XG-26-0287	a1111111-1111-1111-1111-111111111111	64955.00	17.7500	17.9000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-16 04:44:57.499529+00	2026-04-16 04:44:57.499529+00
355a2fc6-e270-482f-96f8-c2e1b6805cad	XG-26-0288	b2222222-2222-2222-2222-222222222222	257672.00	0.0588	0.0641	MXN	USD	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	t	2026-04-16 09:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-16 05:44:57.499529+00	2026-04-16 05:44:57.499529+00
3b494867-5da2-44c1-8139-329de9d707f4	XG-26-0289	c3333333-3333-3333-3333-333333333333	71621.00	17.8500	18.0400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-16 08:44:57.499529+00	\N	f	\N	\N	2026-04-16 06:44:57.499529+00	2026-04-16 06:44:57.499529+00
1a802e6a-550d-4b0c-b5c9-5005b97ad6da	XG-26-0290	d4444444-4444-4444-4444-444444444444	74954.00	17.9000	18.1100	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-16 09:44:57.499529+00	\N	f	\N	\N	2026-04-16 07:44:57.499529+00	2026-04-16 07:44:57.499529+00
f35fbe5c-d317-430e-bbca-31650805b8da	XG-26-0291	e5555555-5555-5555-5555-555555555555	78287.00	17.9500	18.1800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-16 10:44:57.499529+00	https://example.com/proof-139.pdf	f	\N	\N	2026-04-16 08:44:57.499529+00	2026-04-16 08:44:57.499529+00
7f0bdd82-4e4d-4853-96d0-d64ece220014	XG-26-0292	a1111111-1111-1111-1111-111111111111	288780.00	0.0540	0.0610	MXN	USD	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-16 09:44:57.499529+00	2026-04-16 09:44:57.499529+00
99edd15d-45b7-40d6-bf71-512e8badcb56	XG-26-0293	b2222222-2222-2222-2222-222222222222	84953.00	18.0500	18.1200	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-16 10:44:57.499529+00	2026-04-16 10:44:57.499529+00
fa1ec611-252c-4496-87bf-94ca361fb8b6	XG-26-0294	c3333333-3333-3333-3333-333333333333	88286.00	18.1000	18.1900	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-16 13:44:57.499529+00	\N	f	\N	\N	2026-04-16 11:44:57.499529+00	2026-04-16 11:44:57.499529+00
cf88c2e5-66cd-461f-bea4-ad695095c10b	XG-26-0295	d4444444-4444-4444-4444-444444444444	91619.00	18.1500	18.2600	USD	MXN	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-16 14:44:57.499529+00	\N	f	\N	\N	2026-04-16 12:44:57.499529+00	2026-04-16 12:44:57.499529+00
8a7b941c-6166-4a1c-97ce-380ec03bc5cc	XG-26-0296	e5555555-5555-5555-5555-555555555555	319888.00	0.0552	0.0574	MXN	USD	pending	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	t	2026-04-16 17:44:57.499529+00	00000000-0000-0000-0000-000000000001	2026-04-16 13:44:57.499529+00	2026-04-16 13:44:57.499529+00
d8f0a34b-598d-4078-a16c-8de7188fdb80	XG-26-0297	a1111111-1111-1111-1111-111111111111	98285.00	18.2500	18.4000	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000002	\N	\N	\N	f	\N	\N	2026-04-16 14:44:57.499529+00	2026-04-16 14:44:57.499529+00
2357f262-9969-415f-af7e-66a3186e5afc	XG-26-0298	b2222222-2222-2222-2222-222222222222	101618.00	18.3000	18.4700	USD	MXN	pending	bb222222-2222-2222-2222-222222222222	\N	00000000-0000-0000-0000-000000000003	\N	\N	\N	f	\N	\N	2026-04-16 15:44:57.499529+00	2026-04-16 15:44:57.499529+00
37910d8e-dae1-49d8-888e-aaa0fbbb9d3d	XG-26-0299	c3333333-3333-3333-3333-333333333333	104951.00	18.3500	18.5400	USD	MXN	authorized	cc333333-3333-3333-3333-333333333333	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-16 18:44:57.499529+00	\N	f	\N	\N	2026-04-16 16:44:57.499529+00	2026-04-16 16:44:57.499529+00
d37c743e-8fd1-47f2-ae40-60331a861e7c	XG-26-0300	d4444444-4444-4444-4444-444444444444	350996.00	0.0564	0.0609	MXN	USD	authorized	dd444444-4444-4444-4444-444444444444	\N	00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	2026-04-16 19:44:57.499529+00	\N	f	\N	\N	2026-04-16 17:44:57.499529+00	2026-04-16 17:44:57.499529+00
db4ce108-8a2e-4b53-8a42-d4b2d076f56c	XG-26-0301	e5555555-5555-5555-5555-555555555555	111617.00	18.4500	18.6800	USD	MXN	completed	ee555555-5555-5555-5555-555555555555	\N	00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	2026-04-16 20:44:57.499529+00	https://example.com/proof-149.pdf	f	\N	\N	2026-04-16 18:44:57.499529+00	2026-04-16 18:44:57.499529+00
e957e5b9-0a91-4fee-8c21-c05ab622838d	XG-26-0302	a1111111-1111-1111-1111-111111111111	114950.00	17.0000	17.0500	USD	MXN	pending	aa111111-1111-1111-1111-111111111111	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-16 19:44:57.499529+00	2026-04-16 19:44:57.499529+00
4b70949b-fa2d-47ee-9ca0-51faa3c1ebda	XG-26-0303	a1111111-1111-1111-1111-111111111111	50000.00	\N	17.2350	USD	MXN	authorized	\N	\N	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	2026-04-14 19:44:57.757968+00	\N	f	\N	\N	2026-04-16 19:44:57.757968+00	2026-04-16 19:44:57.757968+00
09cd3168-4a4c-4ffd-8a35-9ec89b333538	XG-26-0304	a1111111-1111-1111-1111-111111111111	25000.00	\N	17.3100	USD	MXN	pending	\N	\N	00000000-0000-0000-0000-000000000001	\N	\N	\N	f	\N	\N	2026-04-16 19:44:57.757968+00	2026-04-16 19:44:57.757968+00
\.


--
-- Data for Name: local_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.local_users (id, email, password, full_name, role, created_at) FROM stdin;
2e385471-48fb-47c2-9de5-78828d086fc5	admin@xending.local	admin123	Admin Xending	admin	2026-04-16 19:29:47.738951+00
21b5480c-0968-4632-8c4c-87dd99d99814	broker@xending.local	broker123	Broker Xending	broker	2026-04-16 19:29:47.738951+00
2485ad96-4f11-4300-a2e7-58659aee7731	broker2@xending.local	broker123	Broker 2 Xending	broker	2026-04-16 19:29:47.738951+00
\.


--
-- Data for Name: pi_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pi_accounts (id, account_number, account_name, swift_code, bank_name, bank_address, currency_types, is_active, created_at, created_by, disabled_at, disabled_by, tenant_id) FROM stdin;
\.


--
-- Name: cs_expediente_folio_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cs_expediente_folio_seq', 1, false);


--
-- Name: fx_transaction_folio_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fx_transaction_folio_seq', 304, true);


--
-- PostgreSQL database dump complete
--
-- cs_companies: Broker solo ve sus empresas, Admin ve todas
ALTER TABLE cs_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON cs_companies
    FOR ALL USING (
        (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "broker_own_companies" ON cs_companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cs_companies_owners
            WHERE company_id = cs_companies.id
            AND user_id = auth.uid()
        )
    );

-- fx_transactions: Broker solo ve transacciones de sus empresas
ALTER TABLE fx_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_tx" ON fx_transactions
    FOR ALL USING (
        (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "broker_own_transactions" ON fx_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cs_companies_owners
            WHERE company_id = fx_transactions.company_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "broker_create_transactions" ON fx_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM cs_companies_owners
            WHERE company_id = fx_transactions.company_id
            AND user_id = auth.uid()
        )
    );

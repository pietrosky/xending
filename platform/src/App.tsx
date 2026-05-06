import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { AdminRoute } from './features/auth/AdminRoute';
import { CreditScoringLayout } from './features/credit-scoring/pages/CreditScoringLayout';
import { ApplicationDetailPage } from './features/credit-scoring/pages/ApplicationDetailPage';
import { NewApplicationPage } from './features/credit-scoring/pages/NewApplicationPage';
import { ApplicationsPage } from './features/credit-scoring/pages/ApplicationsPage';
import { TrendsPage } from './features/credit-scoring/pages/TrendsPage';
import { DecisionPage } from './features/credit-scoring/pages/DecisionPage';
import { ReportPage } from './features/credit-scoring/pages/ReportPage';
import { PortfolioPage } from './features/credit-scoring/pages/PortfolioPage';
import { PoliciesPage } from './features/credit-scoring/pages/PoliciesPage';
import { BenchmarksPage } from './features/credit-scoring/pages/BenchmarksPage';
import { MethodologyPage } from './features/credit-scoring/pages/MethodologyPage';
import { DataMapPage } from './features/credit-scoring/pages/DataMapPage';
import { FichasTecnicasPage } from './features/credit-scoring/pages/FichasTecnicasPage';
import { CompaniesPage } from './features/onboarding/pages/CompaniesPage';
import { CompanyCatalogPage } from './features/fx-transactions/pages/CompanyCatalogPage';
import { CompanyFormFXPage } from './features/fx-transactions/pages/CompanyFormFXPage';
import { TransactionCatalogPage } from './features/fx-transactions/pages/TransactionCatalogPage';
import { CreateTransactionPage } from './features/fx-transactions/pages/CreateTransactionPage';
import { EditTransactionPage } from './features/fx-transactions/pages/EditTransactionPage';
import { BrokerRedirect } from './features/auth/BrokerRedirect';
import { PaymentInstructionsPage } from './features/payment-instructions/pages/PaymentInstructionsPage';

export function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<CreditScoringLayout />}>
          {/* Default route — admin goes to dashboard, broker to FX companies */}
          <Route index element={<BrokerRedirect />} />

          {/* Admin-only routes */}
          <Route element={<AdminRoute />}>
            <Route path="companies" element={<CompaniesPage />} />
            {/*<Route path="applications" element={<ApplicationsPage />} />
            <Route path="applications/new" element={<NewApplicationPage />} />
            <Route path="applications/:id" element={<ApplicationDetailPage />} />
            <Route path="applications/:id/trends" element={<TrendsPage />} />
            <Route path="applications/:id/decision" element={<DecisionPage />} />
            <Route path="applications/:id/report" element={<ReportPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="policies" element={<PoliciesPage />} />
            <Route path="benchmarks" element={<BenchmarksPage />} />
            <Route path="methodology" element={<MethodologyPage />} />
            <Route path="mapa-datos" element={<DataMapPage />} />
            <Route path="fichas-tecnicas" element={<FichasTecnicasPage />} />*/}
          </Route>

          {/* FX routes — both roles */}
          <Route path="fx/companies" element={<CompanyCatalogPage />} />
          <Route path="fx/companies/new" element={<CompanyFormFXPage />} />
          <Route path="fx/companies/:id/edit" element={<CompanyFormFXPage />} />
          <Route path="fx/transactions" element={<TransactionCatalogPage />} />
          <Route path="fx/transactions/new" element={<CreateTransactionPage />} />
          <Route path="fx/transactions/:id/edit" element={<EditTransactionPage />} />

          {/* Payment Instructions — both roles */}
          <Route path="payment-instructions" element={<PaymentInstructionsPage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
import { Routes, Route, Navigate } from 'react-router-dom';
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

export function App() {
  return (
    <Routes>
      <Route path="/" element={<CreditScoringLayout />}>
        {/* Dashboard is the main page */}
        <Route index element={<ApplicationDetailPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/new" element={<NewApplicationPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        <Route path="applications/:id/trends" element={<TrendsPage />} />
        <Route path="applications/:id/decision" element={<DecisionPage />} />
        <Route path="applications/:id/report" element={<ReportPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
        <Route path="policies" element={<PoliciesPage />} />
        <Route path="benchmarks" element={<BenchmarksPage />} />
        <Route path="methodology" element={<MethodologyPage />} />
        {/* Catch old routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

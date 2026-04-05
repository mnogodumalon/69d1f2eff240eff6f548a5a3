import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import HochzeitsdetailsPage from '@/pages/HochzeitsdetailsPage';
import GaestelistePage from '@/pages/GaestelistePage';
import DienstleisterPage from '@/pages/DienstleisterPage';
import LocationsPage from '@/pages/LocationsPage';
import BudgetplanungPage from '@/pages/BudgetplanungPage';
import AufgabenToDosPage from '@/pages/AufgabenToDosPage';
import ZeitplanAblaufPage from '@/pages/ZeitplanAblaufPage';
import TischplanPage from '@/pages/TischplanPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
              <Route path="hochzeitsdetails" element={<HochzeitsdetailsPage />} />
              <Route path="gaesteliste" element={<GaestelistePage />} />
              <Route path="dienstleister" element={<DienstleisterPage />} />
              <Route path="locations" element={<LocationsPage />} />
              <Route path="budgetplanung" element={<BudgetplanungPage />} />
              <Route path="aufgaben-&-to-dos" element={<AufgabenToDosPage />} />
              <Route path="zeitplan-&-ablauf" element={<ZeitplanAblaufPage />} />
              <Route path="tischplan" element={<TischplanPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}

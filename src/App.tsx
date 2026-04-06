import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import LocationsPage from '@/pages/LocationsPage';
import TischplanPage from '@/pages/TischplanPage';
import AufgabenToDosPage from '@/pages/AufgabenToDosPage';
import BudgetplanungPage from '@/pages/BudgetplanungPage';
import ZeitplanAblaufPage from '@/pages/ZeitplanAblaufPage';
import HochzeitsdetailsPage from '@/pages/HochzeitsdetailsPage';
import DienstleisterPage from '@/pages/DienstleisterPage';
import GaestelistePage from '@/pages/GaestelistePage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="locations" element={<LocationsPage />} />
              <Route path="tischplan" element={<TischplanPage />} />
              <Route path="aufgaben-to-dos" element={<AufgabenToDosPage />} />
              <Route path="budgetplanung" element={<BudgetplanungPage />} />
              <Route path="zeitplan-ablauf" element={<ZeitplanAblaufPage />} />
              <Route path="hochzeitsdetails" element={<HochzeitsdetailsPage />} />
              <Route path="dienstleister" element={<DienstleisterPage />} />
              <Route path="gaesteliste" element={<GaestelistePage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Locations, Tischplan, AufgabenToDos, Budgetplanung, ZeitplanAblauf, Hochzeitsdetails, Dienstleister, Gaesteliste } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [locations, setLocations] = useState<Locations[]>([]);
  const [tischplan, setTischplan] = useState<Tischplan[]>([]);
  const [aufgabenToDos, setAufgabenToDos] = useState<AufgabenToDos[]>([]);
  const [budgetplanung, setBudgetplanung] = useState<Budgetplanung[]>([]);
  const [zeitplanAblauf, setZeitplanAblauf] = useState<ZeitplanAblauf[]>([]);
  const [hochzeitsdetails, setHochzeitsdetails] = useState<Hochzeitsdetails[]>([]);
  const [dienstleister, setDienstleister] = useState<Dienstleister[]>([]);
  const [gaesteliste, setGaesteliste] = useState<Gaesteliste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [locationsData, tischplanData, aufgabenToDosData, budgetplanungData, zeitplanAblaufData, hochzeitsdetailsData, dienstleisterData, gaestelisteData] = await Promise.all([
        LivingAppsService.getLocations(),
        LivingAppsService.getTischplan(),
        LivingAppsService.getAufgabenToDos(),
        LivingAppsService.getBudgetplanung(),
        LivingAppsService.getZeitplanAblauf(),
        LivingAppsService.getHochzeitsdetails(),
        LivingAppsService.getDienstleister(),
        LivingAppsService.getGaesteliste(),
      ]);
      setLocations(locationsData);
      setTischplan(tischplanData);
      setAufgabenToDos(aufgabenToDosData);
      setBudgetplanung(budgetplanungData);
      setZeitplanAblauf(zeitplanAblaufData);
      setHochzeitsdetails(hochzeitsdetailsData);
      setDienstleister(dienstleisterData);
      setGaesteliste(gaestelisteData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [locationsData, tischplanData, aufgabenToDosData, budgetplanungData, zeitplanAblaufData, hochzeitsdetailsData, dienstleisterData, gaestelisteData] = await Promise.all([
          LivingAppsService.getLocations(),
          LivingAppsService.getTischplan(),
          LivingAppsService.getAufgabenToDos(),
          LivingAppsService.getBudgetplanung(),
          LivingAppsService.getZeitplanAblauf(),
          LivingAppsService.getHochzeitsdetails(),
          LivingAppsService.getDienstleister(),
          LivingAppsService.getGaesteliste(),
        ]);
        setLocations(locationsData);
        setTischplan(tischplanData);
        setAufgabenToDos(aufgabenToDosData);
        setBudgetplanung(budgetplanungData);
        setZeitplanAblauf(zeitplanAblaufData);
        setHochzeitsdetails(hochzeitsdetailsData);
        setDienstleister(dienstleisterData);
        setGaesteliste(gaestelisteData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const locationsMap = useMemo(() => {
    const m = new Map<string, Locations>();
    locations.forEach(r => m.set(r.record_id, r));
    return m;
  }, [locations]);

  const dienstleisterMap = useMemo(() => {
    const m = new Map<string, Dienstleister>();
    dienstleister.forEach(r => m.set(r.record_id, r));
    return m;
  }, [dienstleister]);

  const gaestelisteMap = useMemo(() => {
    const m = new Map<string, Gaesteliste>();
    gaesteliste.forEach(r => m.set(r.record_id, r));
    return m;
  }, [gaesteliste]);

  return { locations, setLocations, tischplan, setTischplan, aufgabenToDos, setAufgabenToDos, budgetplanung, setBudgetplanung, zeitplanAblauf, setZeitplanAblauf, hochzeitsdetails, setHochzeitsdetails, dienstleister, setDienstleister, gaesteliste, setGaesteliste, loading, error, fetchAll, locationsMap, dienstleisterMap, gaestelisteMap };
}
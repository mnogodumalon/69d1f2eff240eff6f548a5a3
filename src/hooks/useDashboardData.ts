import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Hochzeitsdetails, Gaesteliste, Dienstleister, Locations, Budgetplanung, AufgabenToDos, ZeitplanAblauf, Tischplan } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [hochzeitsdetails, setHochzeitsdetails] = useState<Hochzeitsdetails[]>([]);
  const [gaesteliste, setGaesteliste] = useState<Gaesteliste[]>([]);
  const [dienstleister, setDienstleister] = useState<Dienstleister[]>([]);
  const [locations, setLocations] = useState<Locations[]>([]);
  const [budgetplanung, setBudgetplanung] = useState<Budgetplanung[]>([]);
  const [aufgabenToDos, setAufgabenToDos] = useState<AufgabenToDos[]>([]);
  const [zeitplanAblauf, setZeitplanAblauf] = useState<ZeitplanAblauf[]>([]);
  const [tischplan, setTischplan] = useState<Tischplan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [hochzeitsdetailsData, gaestelisteData, dienstleisterData, locationsData, budgetplanungData, aufgabenToDosData, zeitplanAblaufData, tischplanData] = await Promise.all([
        LivingAppsService.getHochzeitsdetails(),
        LivingAppsService.getGaesteliste(),
        LivingAppsService.getDienstleister(),
        LivingAppsService.getLocations(),
        LivingAppsService.getBudgetplanung(),
        LivingAppsService.getAufgabenToDos(),
        LivingAppsService.getZeitplanAblauf(),
        LivingAppsService.getTischplan(),
      ]);
      setHochzeitsdetails(hochzeitsdetailsData);
      setGaesteliste(gaestelisteData);
      setDienstleister(dienstleisterData);
      setLocations(locationsData);
      setBudgetplanung(budgetplanungData);
      setAufgabenToDos(aufgabenToDosData);
      setZeitplanAblauf(zeitplanAblaufData);
      setTischplan(tischplanData);
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
        const [hochzeitsdetailsData, gaestelisteData, dienstleisterData, locationsData, budgetplanungData, aufgabenToDosData, zeitplanAblaufData, tischplanData] = await Promise.all([
          LivingAppsService.getHochzeitsdetails(),
          LivingAppsService.getGaesteliste(),
          LivingAppsService.getDienstleister(),
          LivingAppsService.getLocations(),
          LivingAppsService.getBudgetplanung(),
          LivingAppsService.getAufgabenToDos(),
          LivingAppsService.getZeitplanAblauf(),
          LivingAppsService.getTischplan(),
        ]);
        setHochzeitsdetails(hochzeitsdetailsData);
        setGaesteliste(gaestelisteData);
        setDienstleister(dienstleisterData);
        setLocations(locationsData);
        setBudgetplanung(budgetplanungData);
        setAufgabenToDos(aufgabenToDosData);
        setZeitplanAblauf(zeitplanAblaufData);
        setTischplan(tischplanData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const gaestelisteMap = useMemo(() => {
    const m = new Map<string, Gaesteliste>();
    gaesteliste.forEach(r => m.set(r.record_id, r));
    return m;
  }, [gaesteliste]);

  const dienstleisterMap = useMemo(() => {
    const m = new Map<string, Dienstleister>();
    dienstleister.forEach(r => m.set(r.record_id, r));
    return m;
  }, [dienstleister]);

  const locationsMap = useMemo(() => {
    const m = new Map<string, Locations>();
    locations.forEach(r => m.set(r.record_id, r));
    return m;
  }, [locations]);

  return { hochzeitsdetails, setHochzeitsdetails, gaesteliste, setGaesteliste, dienstleister, setDienstleister, locations, setLocations, budgetplanung, setBudgetplanung, aufgabenToDos, setAufgabenToDos, zeitplanAblauf, setZeitplanAblauf, tischplan, setTischplan, loading, error, fetchAll, gaestelisteMap, dienstleisterMap, locationsMap };
}
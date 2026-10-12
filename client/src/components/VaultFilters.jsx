import { useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '../api/client';
import { SearchableSelect } from './SearchableSelect';

const STORAGE_KEY = 'ms-vault-selection';

function readSelection() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    return {
      projectId: parsed.projectId || '',
      microserviceId: parsed.microserviceId || '',
      environment: parsed.environment || '',
    };
  } catch {
    return { projectId: '', microserviceId: '', environment: '' };
  }
}

export function VaultFilters({ onSubmit, submitLabel, busy }) {
  const [projects, setProjects] = useState([]);
  const [microservices, setMicroservices] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [selection, setSelection] = useState(readSelection);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get('/projects'), api.get('/microservices')])
      .then(([projectResponse, microserviceResponse]) => {
        if (cancelled) return;
        setProjects(projectResponse.data.projects);
        setMicroservices(microserviceResponse.data.microservices);
      })
      .catch((error) => {
        if (!cancelled) setCatalogError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  }, [selection]);

  useEffect(() => {
    if (projects.length === 0) return;
    const projectOk = projects.some((project) => project.id === selection.projectId);
    const microserviceOk = microservices.some((item) => item.id === selection.microserviceId);
    if (projectOk && (microserviceOk || !selection.microserviceId)) return;
    setCatalogError('');
    setSelection({
      projectId: projectOk ? selection.projectId : '',
      microserviceId: projectOk && microserviceOk ? selection.microserviceId : '',
      environment: projectOk ? selection.environment : '',
    });
  }, [projects, microservices, selection.projectId, selection.microserviceId, selection.environment]);

  useEffect(() => {
    if (!selection.projectId || projects.length === 0) {
      setEnvironments([]);
      return;
    }
    if (!projects.some((project) => project.id === selection.projectId)) {
      setEnvironments([]);
      return;
    }
    let cancelled = false;
    api
      .get(`/projects/${selection.projectId}/environments`)
      .then((response) => {
        if (cancelled) return;
        const next = response.data.environments;
        setEnvironments(next);
        setSelection((current) => ({
          ...current,
          environment: next.includes(current.environment) ? current.environment : '',
        }));
      })
      .catch((error) => {
        if (!cancelled) setCatalogError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [selection.projectId, projects]);

  const microserviceOptions = useMemo(
    () =>
      microservices
        .filter((microservice) => !selection.projectId || microservice.projectId === selection.projectId)
        .map((microservice) => ({
          value: microservice.id,
          label: microservice.name,
          hint: microservice.projectName,
        })),
    [microservices, selection.projectId],
  );

  const ready = Boolean(selection.projectId && selection.microserviceId && selection.environment);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onSubmit(selection);
      }}
    >
      {catalogError && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{catalogError}</p>}
      {projects.length > 0 && microservices.length === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No microservices are loaded. Run <span className="font-mono">npm run seed</span> for fictional data, or import the workbook.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SearchableSelect
          label="Microservice"
          value={selection.microserviceId}
          placeholder="Search microservices"
          options={microserviceOptions}
          onChange={(microserviceId) => {
            const microservice = microservices.find((item) => item.id === microserviceId);
            setSelection((current) => ({
              ...current,
              microserviceId,
              projectId: microservice?.projectId || current.projectId,
              environment: microservice && microservice.projectId !== current.projectId ? '' : current.environment,
            }));
          }}
        />
        <SearchableSelect
          label="Project"
          value={selection.projectId}
          placeholder="Select a project"
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
          onChange={(projectId) => {
            const selected = microservices.find((item) => item.id === selection.microserviceId);
            setSelection((current) => ({
              ...current,
              projectId,
              microserviceId: selected && selected.projectId !== projectId ? '' : current.microserviceId,
              environment: '',
            }));
          }}
        />
        <SearchableSelect
          label="Environment"
          value={selection.environment}
          placeholder={selection.projectId ? 'Select an environment' : 'Choose a project first'}
          disabled={!selection.projectId}
          options={environments.map((environment) => ({ value: environment, label: environment }))}
          onChange={(environment) => setSelection((current) => ({ ...current, environment }))}
        />
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!ready || busy}
            className="h-11 w-full rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm shadow-teal-900/15 hover:bg-teal-800 disabled:opacity-50"
          >
            {busy ? 'Working…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

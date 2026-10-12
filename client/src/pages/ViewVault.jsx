import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { api, errorMessage } from '../api/client';
import { VaultFilters } from '../components/VaultFilters';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { formatTimestamp } from '../lib/format';

function entriesToJson(entries) {
  const object = {};
  for (const entry of entries) object[entry.key] = entry.value;
  return JSON.stringify(object, null, 2);
}

export function ViewVaultPage() {
  const [snapshots, setSnapshots] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');

  async function loadSnapshots(next) {
    setBusy(true);
    setError('');
    setNotice('');
    setCopied('');
    try {
      const params = {
        projectId: next.projectId,
        microserviceId: next.microserviceId,
        environment: next.environment,
      };
      const latest = await api.get('/vaults/resolve', { params });
      const versionResponse = await api.get(`/vaults/${latest.data.vault.id}/versions`);
      const history = await Promise.all(
        versionResponse.data.versions.map(async (version) => {
          if (version.versionNumber === latest.data.vault.version) return latest.data;
          const response = await api.get(`/vaults/${latest.data.vault.id}`, {
            params: { version: version.versionNumber },
          });
          return response.data;
        }),
      );
      setSnapshots(history);
    } catch (loadError) {
      setSnapshots([]);
      setError(errorMessage(loadError));
    } finally {
      setBusy(false);
    }
  }

  async function copyJson(json, label) {
    await navigator.clipboard.writeText(json);
    setCopied(label);
    const readable = label.startsWith('Current') ? 'current' : 'previous';
    setNotice(`Copied the ${readable} vault.`);
  }

  const current = snapshots[0];

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-800">Browse</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">View Vault</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Search a microservice to see the current vault and every previous version as JSON you can copy.
        </p>
      </div>
      <Card>
        <CardContent className="pt-5">
          <VaultFilters submitLabel="Search Vault" busy={busy} onSubmit={(next) => loadSnapshots(next)} />
        </CardContent>
      </Card>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{notice}</p>}
      {current && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xl font-bold tracking-tight text-slate-950">{current.vault.microservice.name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{current.vault.project.name}</Badge>
                <Badge>{current.vault.environment}</Badge>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              {snapshots.length} {snapshots.length === 1 ? 'version' : 'versions'}
            </p>
          </div>
          {snapshots.map((snapshot, index) => {
            const json = entriesToJson(snapshot.entries);
            const label = index === 0 ? 'Current' : 'Previous';
            const copyKey = `${label}-${snapshot.vault.version}`;
            const copiedThis = copied === copyKey;
            return (
              <section key={snapshot.vault.version} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${index === 0 ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {label}
                    </span>
                    <Badge>v{snapshot.vault.version}</Badge>
                    <span className="text-xs text-slate-500">{formatTimestamp(snapshot.vault.versionCreatedAt)}</span>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    onClick={() => copyJson(json, copyKey)}
                  >
                    {copiedThis ? <Check className="h-4 w-4 text-teal-700" /> : <Copy className="h-4 w-4" />}
                    {copiedThis ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap break-all bg-[#0c1424] p-5 font-mono text-[13px] leading-6 text-slate-100">
                  {json}
                </pre>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

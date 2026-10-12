import { useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { api, errorMessage } from '../api/client';
import { VaultFilters } from '../components/VaultFilters';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { formatValue } from '../lib/format';

const actionClass = {
  added: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  updated: 'border-amber-200 bg-amber-50 text-amber-900',
  unchanged: 'border-slate-200 bg-slate-50 text-slate-600',
};

export function UpdateVaultPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragOver, setDragOver] = useState(false);

  function rememberFile(next) {
    setFile(next);
    setPreview(null);
    setNotice('');
    setError('');
  }

  async function downloadTemplate() {
    const response = await api.get('/templates/vault.xlsx', { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vault-update-template.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function runPreview(nextSelection, nextFile) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const form = new FormData();
      form.append('file', nextFile);
      form.append('projectId', nextSelection.projectId);
      form.append('microserviceId', nextSelection.microserviceId);
      form.append('environment', nextSelection.environment);
      const response = await api.post('/vaults/preview-update', form);
      setPreview(response.data);
    } catch (previewError) {
      setPreview(null);
      setError(errorMessage(previewError));
    } finally {
      setBusy(false);
    }
  }

  async function confirmUpdate() {
    if (!preview || !file) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('vaultId', preview.vaultId);
      form.append('baseVersion', String(preview.baseVersion));
      form.append('previewToken', preview.previewToken);
      const response = await api.post('/vaults/update', form);
      setNotice(response.data.message);
      setPreview(null);
      setFile(null);
      setConfirmOpen(false);
    } catch (updateError) {
      setConfirmOpen(false);
      setPreview(null);
      setError(errorMessage(updateError));
    } finally {
      setBusy(false);
    }
  }

  const visibleChanges = (preview?.changes || []).filter((change) => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return true;
    return change.key.toLowerCase().includes(needle) || formatValue(change.uploadedValue).toLowerCase().includes(needle);
  });

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-800">Publish</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Update Vault</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Upload a Key and Value spreadsheet. Only those keys change. Every other key stays in the vault, and nothing is deleted.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={downloadTemplate}>
          <Download className="h-4 w-4" />
          Download Excel template
        </Button>
      </div>
      <Card>
        <CardContent className="space-y-5 pt-5">
          <VaultFilters
            submitLabel="Preview changes"
            busy={busy}
            onSubmit={(next) => {
              if (!file) {
                setError('Choose an Excel file before previewing changes.');
                return;
              }
              runPreview(next, file);
            }}
          />
          <div
            className={`rounded-2xl border border-dashed px-4 py-10 text-center transition ${dragOver ? 'border-teal-600 bg-teal-50' : 'border-slate-300 bg-slate-50/80'}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const dropped = event.dataTransfer.files?.[0];
              if (dropped) rememberFile(dropped);
            }}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <Upload className="h-5 w-5 text-teal-700" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-800">Drop an .xlsx or .xls file here, or choose one.</p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
              <FileSpreadsheet className="h-4 w-4 text-teal-700" />
              {file ? file.name : 'Choose file'}
              <input
                className="sr-only"
                type="file"
                accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => rememberFile(event.target.files?.[0] || null)}
              />
            </label>
          </div>
        </CardContent>
      </Card>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{notice}</p>}
      {preview && (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">Added {preview.summary.added}</Badge>
                <Badge className="border-amber-200 bg-amber-50 text-amber-900">Updated {preview.summary.updated}</Badge>
                <Badge>Unchanged {preview.summary.unchanged}</Badge>
                <Badge>Kept {preview.summary.preserved}</Badge>
              </div>
              <Button type="button" disabled={!preview.hasChanges || busy} onClick={() => setConfirmOpen(true)}>
                Update Vault
              </Button>
            </div>
            <p className="text-sm text-slate-600">
              {preview.summary.preserved} existing {preview.summary.preserved === 1 ? 'key is' : 'keys are'} absent from this file and will be kept.
              {!preview.hasChanges && ' Nothing changed, so confirming will not create a version.'}
            </p>
            <Input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter preview rows" />
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Current value</TableHead>
                    <TableHead>Uploaded value</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleChanges.map((change) => (
                    <TableRow key={change.key}>
                      <TableCell className="font-mono text-xs font-medium text-slate-900">{change.key}</TableCell>
                      <TableCell>
                        <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-slate-700">
                          {change.hasCurrent ? formatValue(change.currentValue) : '—'}
                        </pre>
                      </TableCell>
                      <TableCell>
                        <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-slate-700">
                          {formatValue(change.uploadedValue)}
                        </pre>
                      </TableCell>
                      <TableCell>
                        <Badge className={actionClass[change.action]}>{change.action}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Create a new vault version?"
        description="The uploaded keys will be added or replaced. Keys that are not in the file stay as they are. This does not delete anything. If someone else updated the vault after this preview, you will need to preview again."
        confirmLabel="Update Vault"
        busy={busy}
        onConfirm={confirmUpdate}
        onOpenChange={setConfirmOpen}
      >
        {preview && (
          <p className="mt-4 text-sm text-slate-700">
            Version {preview.baseVersion} becomes version {preview.baseVersion + 1}, with {preview.summary.added} added and {preview.summary.updated} updated.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

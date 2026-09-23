import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LeadForm } from "./components/LeadForm";
import { LeadTable } from "./components/LeadTable";
import {
  createLead,
  deleteLead,
  fetchLeadStats,
  fetchLeads,
  LEAD_STATUSES,
  updateLead,
  updateLeadStatus,
  type Lead,
  type LeadInput,
  type LeadListMeta,
  type LeadStats,
  type LeadStatus,
} from "./api/leads";

const PAGE_SIZE = 8;
const PIPELINE_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Won",
];
interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}
function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            x
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
const EMPTY_META: LeadListMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
};
function useLeads(params: {
  search: string;
  status: LeadStatus | "";
  page: number;
  limit: number;
}) {
  const { search, status, page, limit } = params;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meta, setMeta] = useState<LeadListMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLeads({ search, status, page, limit })
      .then((response) => {
        if (cancelled) return;
        setLeads(response.data);
        setMeta(response.meta);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load leads");
        setLeads([]);
        setMeta(EMPTY_META);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, status, page, limit, reloadToken]);
  return { leads, meta, loading, error, refresh };
}
interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}
export default function App() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const { leads, meta, loading, error, refresh } = useLeads({
    search,
    status,
    page,
    limit: PAGE_SIZE,
  });
  const notify = useCallback(
    (type: Toast["type"], message: string) =>
      setToast({ id: Date.now(), type, message }),
    [],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const loadStats = useCallback(() => {
    fetchLeadStats()
      .then((response) => setStats(response.data))
      .catch(() => setStats(null));
  }, []);
  useEffect(() => {
    loadStats();
  }, [loadStats, leads]);
  useEffect(() => {
    if (page > meta.totalPages) setPage(meta.totalPages);
  }, [meta.totalPages, page]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const reload = useCallback(() => {
    refresh();
    loadStats();
  }, [refresh, loadStats]);
  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };
  const handleSubmit = async (values: LeadInput) => {
    setMutationLoading(true);
    try {
      if (editing) {
        await updateLead(editing.id, values);
        notify("success", "Lead updated successfully");
      } else {
        await createLead(values);
        notify("success", "Lead created successfully");
        setPage(1);
      }
      closeForm();
      reload();
    } finally {
      setMutationLoading(false);
    }
  };
  const handleStatusChange = async (lead: Lead, nextStatus: LeadStatus) => {
    setBusyId(lead.id);
    setMutationLoading(true);
    try {
      await updateLeadStatus(lead.id, nextStatus);
      notify("success", `${lead.name} moved to ${nextStatus}`);
      reload();
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : "Could not update status",
      );
    } finally {
      setBusyId(null);
      setMutationLoading(false);
    }
  };
  const handleDelete = async (lead: Lead) => {
    if (!window.confirm(`Delete ${lead.name}? This cannot be undone.`)) return;
    setBusyId(lead.id);
    setMutationLoading(true);
    try {
      await deleteLead(lead.id);
      notify("success", "Lead deleted");
      reload();
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : "Could not delete lead",
      );
    } finally {
      setBusyId(null);
      setMutationLoading(false);
    }
  };
  return (
    <div className="app">
      {mutationLoading && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-overlay__panel">
            <span className="spinner" aria-hidden="true" />
            <span>Saving changes...</span>
          </div>
        </div>
      )}
      <header className="topbar">
        <div>
          <h1>Lead Tracker</h1>
          <p className="muted">
            Create, qualify and track your sales pipeline.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          + New Lead
        </button>
      </header>
      <section className="stats" aria-label="Pipeline summary">
        <article className="stat stat--total">
          <span className="stat__label">Total leads</span>
          <span className="stat__value">{stats?.total ?? 0}</span>
        </article>
        {PIPELINE_STATUSES.map((pipelineStatus) => (
          <article key={pipelineStatus} className="stat">
            <span className="stat__label">{pipelineStatus}</span>
            <span className="stat__value">
              {stats?.byStatus?.[pipelineStatus] ?? 0}
            </span>
          </article>
        ))}
      </section>
      <section className="panel">
        <div className="toolbar">
          <input
            className="input search"
            type="search"
            placeholder="Search by name, email or phone..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label="Search leads"
          />
          <select
            className="input"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as LeadStatus | "");
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        {error && <div className="alert alert--error">{error}</div>}
        <LeadTable
          leads={leads}
          loading={loading}
          busyId={busyId}
          onStatusChange={handleStatusChange}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
        <footer className="panel__footer">
          <span className="muted">
            {meta.total} lead{meta.total === 1 ? "" : "s"}
            {search ? ` matching "${search}"` : ""}
          </span>
          {meta.totalPages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button
                type="button"
                className="btn"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span className="muted">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                className="btn"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </footer>
      </section>
      {formOpen && (
        <Modal title={editing ? "Edit lead" : "New lead"} onClose={closeForm}>
          <LeadForm
            initial={editing}
            onCancel={closeForm}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}
      {toast && (
        <div
          className={`toast toast--${toast.type}`}
          role="status"
          key={toast.id}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

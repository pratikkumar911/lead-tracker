import { LEAD_STATUSES, type Lead, type LeadStatus } from "../api/leads";
interface LeadTableProps {
  leads: Lead[];
  loading: boolean;
  busyId: string | null;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
export function LeadTable({
  leads,
  loading,
  busyId,
  onStatusChange,
  onEdit,
  onDelete,
}: LeadTableProps) {
  if (loading) return <div className="empty">Loading leads...</div>;
  if (leads.length === 0)
    return (
      <div className="empty">
        <strong>No leads found.</strong>
        <span>Try a different search, or create your first lead.</span>
      </div>
    );
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Created At</th>
            <th className="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td className="cell-name">{lead.name}</td>
              <td>
                <a href={`mailto:${lead.email}`}>{lead.email}</a>
              </td>
              <td className="cell-muted">{lead.phone}</td>
              <td>
                <select
                  aria-label={`Status for ${lead.name}`}
                  className={`status-select status-select--${lead.status.toLowerCase()}`}
                  value={lead.status}
                  disabled={busyId === lead.id}
                  onChange={(event) =>
                    onStatusChange(lead, event.target.value as LeadStatus)
                  }
                >
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td className="cell-muted">{formatDate(lead.createdAt)}</td>
              <td className="right">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => onEdit(lead)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => onDelete(lead)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

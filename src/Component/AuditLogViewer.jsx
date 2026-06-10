import React, { useCallback, useEffect, useMemo, useState } from "react";
import StateNotice from "./ui/StateNotice.jsx";
import { api } from "../utils/api.js";

// ─── constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const formatDate = (ts) =>
  ts
    ? new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

const toDateInputVal = (date) => date.toISOString().slice(0, 10);

// ─── CSV export ──────────────────────────────────────────────────────────────
const exportCSV = (logs) => {
  const header = ["ID", "User", "User ID", "Action", "Requisition ID", "Timestamp"];
  const rows = logs.map((l) => [
    l.id,
    l.staffName ?? l.staff_name ?? "",
    l.user_id ?? "",
    (l.action ?? "").replace(/,/g, ";"),
    l.requisition_id ?? "",
    l.timestamp ? new Date(l.timestamp).toISOString() : "",
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: `audit-log-${Date.now()}.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
};

// ─── component ───────────────────────────────────────────────────────────────
const AuditLogViewer = () => {
  const [logs, setLogs]           = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState("");

  // ── filters ───────────────────────────────────────────────────────────
  const [search, setSearch]     = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");

  // ── pagination ────────────────────────────────────────────────────────
  const [pageSize, setPageSize]       = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // ── fetch ─────────────────────────────────────────────────────────────
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.getAuditLogs();
      const all = Array.isArray(data) ? data : (data?.logs ?? []);
      // Sort newest first
      all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLogs(all);
    } catch (err) {
      setError(err.message || "Failed to load audit logs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // ── filter logic ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = logs;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          (l.staffName ?? l.staff_name ?? "").toLowerCase().includes(q) ||
          (l.action ?? "").toLowerCase().includes(q) ||
          String(l.requisition_id ?? "").includes(q) ||
          String(l.user_id ?? "").includes(q)
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((l) => l.timestamp && new Date(l.timestamp) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((l) => l.timestamp && new Date(l.timestamp) <= to);
    }

    return result;
  }, [logs, search, dateFrom, dateTo]);

  // reset to page 1 whenever filters change
  useEffect(() => { setCurrentPage(1); }, [search, dateFrom, dateTo, pageSize]);

  // ── pagination math ───────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const pageStart  = (safePage - 1) * pageSize;
  const pageLogs   = filtered.slice(pageStart, pageStart + pageSize);

  // ── quick date shortcuts ──────────────────────────────────────────────
  const setLastNDays = (n) => {
    const to   = new Date();
    const from = new Date();
    from.setDate(from.getDate() - n + 1);
    setDateFrom(toDateInputVal(from));
    setDateTo(toDateInputVal(to));
  };

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  // ── render ────────────────────────────────────────────────────────────
  if (isLoading) return <StateNotice>Loading audit log…</StateNotice>;
  if (error) return (
    <StateNotice tone="error">
      {error}{" "}
      <button className="btn btn-secondary btn-sm" onClick={loadLogs}>Retry</button>
    </StateNotice>
  );

  const hasFilters = search || dateFrom || dateTo;

  return (
    <div className="audit-shell">

      <div className="audit-header">
        <h2 className="audit-header__title">Audit Log</h2>
        <span className="audit-header__count">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          {hasFilters && <> (filtered from {logs.length})</>}
        </span>
      </div>

      {/* ── Controls ──────────────────────────────────────────────────── */}
      <div className="audit-controls">

        {/* Search */}
        <div className="audit-search-wrap">
          <svg className="audit-search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className="audit-search"
            placeholder="Search by user, action, or requisition ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search audit log"
          />
        </div>

        {/* Date range */}
        <div className="audit-date-range">
          <label className="audit-date-label" htmlFor="audit-from">From</label>
          <input
            id="audit-from"
            type="date"
            className="audit-date-input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo || undefined}
          />
          <label className="audit-date-label" htmlFor="audit-to">To</label>
          <input
            id="audit-to"
            type="date"
            className="audit-date-input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
          />
        </div>

        {/* Quick shortcuts */}
        <div className="audit-shortcuts">
          <button type="button" className="btn btn-secondary btn-xs" onClick={() => setLastNDays(7)}>Last 7 days</button>
          <button type="button" className="btn btn-secondary btn-xs" onClick={() => setLastNDays(30)}>Last 30 days</button>
          {hasFilters && (
            <button type="button" className="btn btn-secondary btn-xs" onClick={clearFilters}>Clear filters</button>
          )}
        </div>

        {/* Page size + export */}
        <div className="audit-tools">
          <label className="audit-pagesize-label" htmlFor="audit-pagesize">Show</label>
          <select
            id="audit-pagesize"
            className="audit-pagesize"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      {pageLogs.length === 0 ? (
        <StateNotice>No audit entries match your filters.</StateNotice>
      ) : (
        <>
          <div className="audit-table-wrap">
            <table className="audit-table" aria-label="Audit log entries">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">User</th>
                  <th scope="col">Action</th>
                  <th scope="col">Requisition</th>
                  <th scope="col">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {pageLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="audit-table__id">{log.id}</td>
                    <td>
                      <span className="audit-table__user">
                        {log.staffName ?? log.staff_name ?? `User ${log.user_id}`}
                      </span>
                    </td>
                    <td>
                      <span className={`audit-action audit-action--${(log.action ?? "").toLowerCase().replace(/\s+/g, "-")}`}>
                        {log.action ?? "—"}
                      </span>
                    </td>
                    <td>
                      {log.requisition_id ? (
                        <span className="audit-table__req-id">#{log.requisition_id}</span>
                      ) : (
                        <span className="audit-table__na">—</span>
                      )}
                    </td>
                    <td className="audit-table__ts">{formatDate(log.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────────────────────────── */}
          <div className="audit-pagination" role="navigation" aria-label="Pagination">
            <span className="audit-pagination__info">
              {pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}
            </span>

            <div className="audit-pagination__controls">
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                aria-label="First page"
              >
                «
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label="Previous page"
              >
                ‹
              </button>

              {/* Page number pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === "…" ? (
                    <span key={`ellipsis-${idx}`} className="audit-pagination__ellipsis">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`btn btn-xs${p === safePage ? " btn-primary" : " btn-secondary"}`}
                      onClick={() => setCurrentPage(p)}
                      aria-current={p === safePage ? "page" : undefined}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label="Next page"
              >
                ›
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                aria-label="Last page"
              >
                »
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditLogViewer;

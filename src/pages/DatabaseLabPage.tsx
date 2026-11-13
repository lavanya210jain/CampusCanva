import { useEffect, useState } from "react";
import { request } from "../services/liveApi";
import { isMockMode } from "../services/api";
type Report = { title: string; sql: string; rows: Record<string, unknown>[] };
export function DatabaseLabPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (isMockMode) {
      setError("Start the MySQL version to run these SQL reports.");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    request<Report[]>("/reports")
      .then((data) => {
        if (active) setReports(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <div className="space-y-6 pb-12 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-indigo-600 font-semibold text-xs uppercase">
            Live MySQL reports
          </p>
          <h1 className="text-3xl font-extrabold">Database Lab</h1>
        </div>
        <button
          onClick={() => setRevision((v) => v + 1)}
          className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm"
        >
          Refresh reports
        </button>
      </div>
      <p className="text-sm text-slate-600">
        These results come from SQL executed by the backend. Expand a query to
        explain its joins, aggregates, views and subqueries during your
        presentation.
      </p>
      {loading && <p role="status">Running SQL queries…</p>}
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      {reports.map((r) => (
        <section
          key={r.title}
          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 min-w-0 space-y-4"
        >
          <h2 className="font-bold">{r.title}</h2>
          <details>
            <summary className="text-sm text-indigo-700 cursor-pointer">
              Show executed SQL
            </summary>
            <pre className="mt-3 p-4 bg-slate-950 text-slate-100 rounded-xl text-xs overflow-x-auto">
              {r.sql};
            </pre>
          </details>
          {r.rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr>
                    {Object.keys(r.rows[0]).map((k) => (
                      <th
                        key={k}
                        className="p-2 bg-slate-50 border-b border-slate-200 whitespace-nowrap"
                      >
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row, i) => (
                    <tr key={i}>
                      {Object.entries(row).map(([k, value]) => (
                        <td
                          key={k}
                          className="p-2 border-b border-slate-100 max-w-64 break-words"
                        >
                          {value === null ? "NULL" : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No rows match this query yet.
            </p>
          )}
          <p className="text-xs text-slate-400">
            {r.rows.length} rows returned
          </p>
        </section>
      ))}
    </div>
  );
}

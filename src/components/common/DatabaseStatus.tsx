import { useEffect, useState } from "react";
import { isMockMode } from "../../services/api";
import { sessionApi } from "../../services/liveApi";
export function DatabaseStatus() {
  const [status, setStatus] = useState("Checking MySQL connection…");
  const [ok, setOk] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (isMockMode) {
      setStatus("Practice mode · browser storage only");
      return;
    }
    let active = true;
    sessionApi
      .health()
      .then(() => {
        if (active) {
          setStatus("MySQL connected · changes are saved in the database");
          setOk(true);
        }
      })
      .catch(() => {
        if (active) {
          setStatus(
            "MySQL/API unavailable. Start MySQL, run npm run db:setup, then npm run dev.",
          );
          setOk(false);
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <div
      role="status"
      className={`text-xs rounded-xl border p-3 my-4 ${ok ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800"}`}
    >
      {status}{" "}
      {!ok && !isMockMode && (
        <button
          onClick={() => setAttempt((a) => a + 1)}
          className="ml-2 underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

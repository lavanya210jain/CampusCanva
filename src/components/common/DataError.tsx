export function DataError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 p-4 text-sm"
    >
      {message}{" "}
      <button
        className="ml-2 font-semibold underline"
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
    </div>
  );
}

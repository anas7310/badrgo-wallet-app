interface LoaderProps {
  fullPage?: boolean;
  message?: string;
}

export function Loader({ fullPage = false, message = 'Loading...' }: LoaderProps) {
  if (fullPage) {
    return (
      <div className="full-page-loader">
        <span className="spinner" />
        {message && <p className="text-muted" style={{ fontSize: 13, fontWeight: 500 }}>{message}</p>}
      </div>
    );
  }

  return (
    <div className="loading-state">
      <span className="spinner" />
      {message && <span>{message}</span>}
    </div>
  );
}

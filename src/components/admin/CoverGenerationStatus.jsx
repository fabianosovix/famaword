export default function CoverGenerationStatus({ loading, progress, error }) {
  if (error) return <p role="alert" className="mt-3 break-words text-sm text-destructive">{error}</p>;
  if (!loading) return null;
  return <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">{progress}</p>;
}
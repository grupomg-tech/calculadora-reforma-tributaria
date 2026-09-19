import { Link, useLocation } from "react-router-dom";
import { interpolate, useI18n } from "@/i18n";

const NotFound = () => {
  const location = useLocation();
  const t = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{interpolate(t.notFound.message, { path: location.pathname })}</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          {t.notFound.back}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

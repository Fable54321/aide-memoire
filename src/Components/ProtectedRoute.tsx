import { useAuth } from "../Contexts/AuthContext";
import { useEffect } from "react";
import type { JSX } from "react";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {


const PORTAL_LOGIN_URL = "https://vegibec-portail.com/login"

  const { user, loading, setIsAuthorized } = useAuth();

  const hasAccess = !!user?.appAccess?.some((app) => app.slug === "ventes");

  useEffect(() => {
    if (loading) return;

    if (!user || !hasAccess) {
      alert("Vous n'avez pas les permissions nécessaires pour accéder à cette application.");
      const returnTo = encodeURIComponent(window.location.href);
      window.location.replace(`${PORTAL_LOGIN_URL}?returnTo=${returnTo}`);
      return;
    }

    setIsAuthorized(true);
  }, [user, loading, hasAccess, setIsAuthorized, PORTAL_LOGIN_URL]);

  if (loading) return <div>Chargement...</div>;

  if (!user || !hasAccess) return null;

  return children;
};



export default ProtectedRoute;
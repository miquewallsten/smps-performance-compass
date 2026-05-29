import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { FileQuestion } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center smps-fade-up">
        <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-display text-4xl font-bold mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">Página no encontrada</p>
        <a href="/" className="px-5 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-[opacity,transform] duration-150 active:scale-[0.98]">
          Volver al Inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";

// Set browser tab title
document.title = "SMPS";

// Remove loading spinner when app mounts
const removeLoadingSpinner = () => {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    // Add fade-out class to trigger CSS transition
    spinner.classList.add('fade-out');
    // Remove spinner from DOM after transition completes
    setTimeout(() => {
      if (spinner.parentNode) {
        spinner.parentNode.removeChild(spinner);
      }
    }, 300); // Match the CSS transition duration
  }
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - reduce refetch frequency
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch when user switches tabs
      refetchOnReconnect: false, // Don't refetch on reconnect
    },
  },
});

const root = createRoot(document.getElementById("root")!);

root.render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);

// Remove loading spinner after React app mounts
removeLoadingSpinner();

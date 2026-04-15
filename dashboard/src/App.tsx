import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./router/AppRouter";
import { SSEProvider } from "./contexts/SSEContext";
import { ToastViewport } from "./components/ui/ToastViewport";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SSEProvider>
        <BrowserRouter>
          <AppRouter />
          <ToastViewport />
        </BrowserRouter>
      </SSEProvider>
    </QueryClientProvider>
  );
}

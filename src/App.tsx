import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import RegisterVisitor from "@/pages/RegisterVisitor";
import Scanner from "@/pages/Scanner";
import Visitors from "@/pages/Visitors";
import Statistics from "@/pages/Statistics";
import DigitalCard from "@/pages/DigitalCard";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            }
          />
          <Route
            path="/register"
            element={
              <AppLayout>
                <RegisterVisitor />
              </AppLayout>
            }
          />
          <Route
            path="/scanner"
            element={
              <AppLayout>
                <Scanner />
              </AppLayout>
            }
          />
          <Route
            path="/visitors"
            element={
              <AppLayout>
                <Visitors />
              </AppLayout>
            }
          />
          <Route
            path="/statistics"
            element={
              <AppLayout>
                <Statistics />
              </AppLayout>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

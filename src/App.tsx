import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import RegisterVisitor from "@/pages/RegisterVisitor";
import Scanner from "@/pages/Scanner";
import Visitors from "@/pages/Visitors";
import Statistics from "@/pages/Statistics";
import DigitalCard from "@/pages/DigitalCard";
import Programs from "@/pages/Programs";
import ProgramAttendance from "@/pages/ProgramAttendance";
import ProgramReport from "@/pages/ProgramReport";
import RegistrationForm from "@/pages/RegistrationForm";
import Login from "@/pages/Login";
import UserManagement from "@/pages/UserManagement";
import AccessControl from "@/pages/AccessControl";
import RestaurantEntry from "@/pages/RestaurantEntry";
import RestaurantMenu from "@/pages/RestaurantMenu";
import RestaurantOrders from "@/pages/RestaurantOrders";
import RestaurantProducts from "@/pages/RestaurantProducts";
import RestaurantAnalytics from "@/pages/RestaurantAnalytics";
import RestaurantManualOrder from "@/pages/RestaurantManualOrder";
import OrderTracking from "@/pages/OrderTracking";
import LibraryBooks from "@/pages/LibraryBooks";
import LibraryEntry from "@/pages/LibraryEntry";
import LibraryLoans from "@/pages/LibraryLoans";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/card/:visitorId" element={<DigitalCard />} />
            <Route path="/formulaire" element={<RegistrationForm />} />

            {/* All authenticated: Dashboard */}
            <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />

            {/* Admin + Director */}
            <Route path="/register" element={<ProtectedRoute allowedRoles={["admin","american_center","american_corner_gitega","coordinator","program_manager"]}><AppLayout><RegisterVisitor /></AppLayout></ProtectedRoute>} />
            <Route path="/visitors" element={<ProtectedRoute><AppLayout><Visitors /></AppLayout></ProtectedRoute>} />
            <Route path="/statistics" element={<ProtectedRoute allowedRoles={["admin","american_center","american_corner_gitega","coordinator","program_manager"]}><AppLayout><Statistics /></AppLayout></ProtectedRoute>} />
            {/* All authenticated: Scanner */}
            <Route path="/scanner" element={<ProtectedRoute><AppLayout><Scanner /></AppLayout></ProtectedRoute>} />

            {/* All: Programs (role controls actions inside) */}
            <Route path="/programs" element={<ProtectedRoute><AppLayout><Programs /></AppLayout></ProtectedRoute>} />
            <Route path="/program-attendance" element={<ProtectedRoute><AppLayout><ProgramAttendance /></AppLayout></ProtectedRoute>} />
            <Route path="/program-report" element={<ProtectedRoute><AppLayout><ProgramReport /></AppLayout></ProtectedRoute>} />

            {/* Admin only */}
            <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><AppLayout><UserManagement /></AppLayout></ProtectedRoute>} />
            <Route path="/access-control" element={<ProtectedRoute allowedRoles={["admin"]}><AppLayout><AccessControl /></AppLayout></ProtectedRoute>} />

            {/* Restaurant - public entry */}
            <Route path="/restaurant" element={<RestaurantEntry />} />
            <Route path="/restaurant/menu/:visitorId" element={<RestaurantMenu />} />
            <Route path="/track/:orderCode" element={<OrderTracking />} />

            {/* Restaurant - staff */}
            <Route path="/restaurant/orders" element={<ProtectedRoute allowedRoles={["admin","american_center","american_corner_gitega","coordinator","program_manager"]}><AppLayout><RestaurantOrders /></AppLayout></ProtectedRoute>} />
            <Route path="/restaurant/products" element={<ProtectedRoute allowedRoles={["admin","american_center","american_corner_gitega","coordinator","program_manager"]}><AppLayout><RestaurantProducts /></AppLayout></ProtectedRoute>} />
            <Route path="/restaurant/analytics" element={<ProtectedRoute allowedRoles={["admin","american_center","american_corner_gitega","coordinator","program_manager"]}><AppLayout><RestaurantAnalytics /></AppLayout></ProtectedRoute>} />
            <Route path="/restaurant/manual-order" element={<ProtectedRoute allowedRoles={["admin","american_center","american_corner_gitega","coordinator","program_manager"]}><AppLayout><RestaurantManualOrder /></AppLayout></ProtectedRoute>} />

            {/* Library */}
            <Route path="/library/books" element={<ProtectedRoute><AppLayout><LibraryBooks /></AppLayout></ProtectedRoute>} />
            <Route path="/library/entry" element={<ProtectedRoute><AppLayout><LibraryEntry /></AppLayout></ProtectedRoute>} />
            <Route path="/library/loans" element={<ProtectedRoute><AppLayout><LibraryLoans /></AppLayout></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

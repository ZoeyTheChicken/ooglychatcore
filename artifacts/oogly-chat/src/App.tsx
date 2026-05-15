import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Register from "@/pages/register";
import ChatView from "@/pages/chat";
import Settings from "@/pages/settings";
import Appeal from "@/pages/appeal";

import AdminStats from "@/pages/admin/stats";
import AdminUsers from "@/pages/admin/users";
import AdminBans from "@/pages/admin/bans";
import AdminMutes from "@/pages/admin/mutes";
import AdminAppeals from "@/pages/admin/appeals";
import AdminAnnouncements from "@/pages/admin/announcements";
import AdminLogs from "@/pages/admin/logs";
import AdminTroll from "@/pages/admin/troll";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const { user, isLoading, isAdmin, isOwner } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-background text-primary">Initializing cockpit...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !isAdmin && !isOwner) {
    return <Redirect to="/" />;
  }

  return <Component {...rest} />;
}

function AdminRedirect() {
  return <Redirect to="/admin/stats" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/">
        <ProtectedRoute component={ChatView} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path="/appeal">
        <ProtectedRoute component={Appeal} />
      </Route>

      <Route path="/admin">
        <ProtectedRoute component={AdminRedirect} adminOnly />
      </Route>
      <Route path="/admin/stats">
        <ProtectedRoute component={AdminStats} adminOnly />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={AdminUsers} adminOnly />
      </Route>
      <Route path="/admin/bans">
        <ProtectedRoute component={AdminBans} adminOnly />
      </Route>
      <Route path="/admin/mutes">
        <ProtectedRoute component={AdminMutes} adminOnly />
      </Route>
      <Route path="/admin/appeals">
        <ProtectedRoute component={AdminAppeals} adminOnly />
      </Route>
      <Route path="/admin/announcements">
        <ProtectedRoute component={AdminAnnouncements} adminOnly />
      </Route>
      <Route path="/admin/logs">
        <ProtectedRoute component={AdminLogs} adminOnly />
      </Route>
      <Route path="/admin/troll">
        <ProtectedRoute component={AdminTroll} adminOnly />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

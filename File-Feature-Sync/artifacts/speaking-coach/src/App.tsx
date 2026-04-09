import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth";
import { Layout } from "@/components/layout";
import { Home } from "@/pages/home";
import { RecordSession } from "@/pages/record";
import { Sessions } from "@/pages/sessions";
import { SessionDetail } from "@/pages/session-detail";
import { Progress } from "@/pages/progress";
import { Leaderboard } from "@/pages/leaderboard";
import { LoginPage } from "@/pages/login";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Layout><Home /></Layout>} />
      <Route path="/record" component={() => <Layout><RecordSession /></Layout>} />
      <Route path="/sessions" component={() => <Layout><Sessions /></Layout>} />
      <Route path="/sessions/:id" component={() => <Layout><SessionDetail /></Layout>} />
      <Route path="/progress" component={() => <Layout><Progress /></Layout>} />
      <Route path="/leaderboard" component={() => <Layout><Leaderboard /></Layout>} />
      <Route path="/login" component={LoginPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

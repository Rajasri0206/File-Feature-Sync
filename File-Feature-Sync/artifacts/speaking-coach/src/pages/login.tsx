import { useState } from "react";
import { useRegisterUser, useLoginUser } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { useLocation } from "wouter";
import { PlayCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "", username: "", password: "", role: "student", purpose: "general",
  });

  const loginMutation = useLoginUser();
  const registerMutation = useRegisterUser();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const result = await loginMutation.mutateAsync({ data: loginForm });
      login(result);
      toast({ title: `Welcome back, ${result.username}!` });
      setLocation("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setLoginError("Invalid email or password. Please try again.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    if (registerForm.password.length < 6) {
      setRegisterError("Password must be at least 6 characters.");
      return;
    }
    try {
      const result = await registerMutation.mutateAsync({ data: registerForm });
      login(result);
      toast({ title: `Welcome to EchoCoach, ${result.username}! 🎤` });
      setLocation("/");
    } catch (err: unknown) {
      setRegisterError("Registration failed. Email or username may already be in use.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-background to-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <PlayCircle className="w-9 h-9 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">EchoCoach</h1>
          <p className="text-muted-foreground mt-2">Your AI-powered speaking skills coach</p>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="border-border/60 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle>Sign In</CardTitle>
                <CardDescription>Enter your credentials to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  {loginError && (
                    <Alert variant="destructive">
                      <AlertDescription>{loginError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Sign In
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="border-border/60 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Join to start tracking your progress</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  {registerError && (
                    <Alert variant="destructive">
                      <AlertDescription>{registerError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Username</Label>
                      <Input
                        placeholder="speakerpro"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm((p) => ({ ...p, username: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="Min 6 characters"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Role</Label>
                      <Select
                        value={registerForm.role}
                        onValueChange={(v) => setRegisterForm((p) => ({ ...p, role: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Goal</Label>
                      <Select
                        value={registerForm.purpose}
                        onValueChange={(v) => setRegisterForm((p) => ({ ...p, purpose: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="interview">Interview Prep</SelectItem>
                          <SelectItem value="public_speaking">Public Speaking</SelectItem>
                          <SelectItem value="casual">Casual Chat</SelectItem>
                          <SelectItem value="storytelling">Storytelling</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Create Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground">
          Want to try first?{" "}
          <a href="/" className="text-primary hover:underline font-medium">
            Continue as demo user
          </a>
        </p>
      </div>
    </div>
  );
}

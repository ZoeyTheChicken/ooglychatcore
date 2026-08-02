import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      const response = await fetch('https://chatapi.zoeyaviation.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.status === 403 && data.banned) {
        localStorage.setItem('banInfo', JSON.stringify({
          reason: data.reason,
          expiresAt: data.expiresAt,
        }));
        window.location.href = '/banned';
        return;
      }

      if (response.ok) {
        login(data.token, data.user);
        window.location.href = '/';
        return;
      }

      toast({
        variant: "destructive",
        title: "Login failed",
        description: data.error || "Invalid username or password",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "There was a critical login error, you are either BANNED, or something is wrong with the Oogly Chat server connection.",
      });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 oogly-app-shell">
      <div className="hidden lg:flex flex-col justify-between p-12 oogly-auth-panel text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <MessageCircle className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">Oogly Chat</span>
        </div>
        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">Your space to talk, react, and stay connected.</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            A polished community chat with live presence, reactions, and built-in safety tools for school-friendly conversations.
          </p>
        </div>
        <p className="text-xs text-white/40">© Oogly Chat</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-md border-border/60 shadow-xl shadow-primary/5 bg-card/90 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
            <CardDescription>Sign in to continue to Oogly Chat</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" className="rounded-xl h-11" data-testid="input-username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" className="rounded-xl h-11" data-testid="input-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full rounded-xl h-11 font-semibold">
                  Login
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary font-medium hover:underline" data-testid="link-register">
                Register here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

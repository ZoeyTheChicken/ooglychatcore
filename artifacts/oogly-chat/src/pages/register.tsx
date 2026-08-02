import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { checkUsernameFilter } from "@/lib/swear-filter";
import { MessageCircle } from "lucide-react";

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username cannot exceed 32 characters")
    .refine((name) => !checkUsernameFilter(name), {
      message: "That username is not allowed",
    }),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Register() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerMutation = useRegister();

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          login(data.token, data.user);
          setLocation("/");
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Registration failed",
            description: error.message || "Could not create account",
          });
        },
      }
    );
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
          <h2 className="text-3xl font-bold leading-tight">Create your account in seconds.</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Pick a username, join the room, and start chatting with moderation that runs locally and in the cloud.
          </p>
        </div>
        <p className="text-xs text-white/40">© Oogly Chat</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-md border-border/60 shadow-xl shadow-primary/5 bg-card/90 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Join Oogly Chat</CardTitle>
            <CardDescription>Create a new account</CardDescription>
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
                        <Input placeholder="Choose a username" className="rounded-xl h-11" data-testid="input-register-username" {...field} />
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
                        <Input type="password" placeholder="Choose a password" className="rounded-xl h-11" data-testid="input-register-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={registerMutation.isPending} data-testid="button-submit-register">
                  {registerMutation.isPending ? "Creating…" : "Register"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-login">
                Login here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

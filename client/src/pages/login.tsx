import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { setUser } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      console.log('Attempting login with credentials:', { username: data.username });
      
      try {
        const user = await apiRequest('POST', '/api/auth/login', data);
        console.log('Login successful, user data received:', { id: user.id, username: user.username, role: user.role });
        setUser(user);
        
        toast({
          title: "Login successful",
          description: `Welcome back, ${user.name}!`,
        });
  
        if (user.role === "manager") {
          setLocation("/");
        } else {
          setLocation("/my-leads");
        }
      } catch (apiError) {
        console.error('Login API error:', apiError);
        throw new Error(apiError instanceof Error ? apiError.message : "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Please check your credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const fillDemo = (username: string, password: string) => {
    form.setValue("username", username);
    form.setValue("password", password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">Squire</CardTitle>
          <div className="flex justify-center my-6">
            <img src="https://i.imgur.com/UX6uPj3.png" alt="Squire Logo" className="h-36 w-auto" />
          </div>
          <CardDescription className="text-center">
            Enter your credentials to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Demo Accounts Box */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-semibold text-amber-800 mb-3">
              🎯 Try a demo account
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-900">Manager Account</p>
                  <p className="text-xs text-amber-700">username: <span className="font-mono">admin</span> · password: <span className="font-mono">admin123</span></p>
                </div>
                <button
                  type="button"
                  onClick={() => fillDemo("admin", "admin123")}
                  className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-1 rounded font-medium transition-colors"
                >
                  Use this
                </button>
              </div>
              <div className="border-t border-amber-200 pt-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-900">Agent Account</p>
                  <p className="text-xs text-amber-700">username: <span className="font-mono">emily.j</span> · password: <span className="font-mono">emily123</span></p>
                </div>
                <button
                  type="button"
                  onClick={() => fillDemo("emily.j", "emily123")}
                  className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-1 rounded font-medium transition-colors"
                >
                  Use this
                </button>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" {...field} />
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-muted-foreground text-center w-full">
            <p>
              Please contact your administrator for account credentials
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

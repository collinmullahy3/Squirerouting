import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Schema for profile form
const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Must be a valid email address"),
  phone: z.string().optional(),
  currentPassword: z.string().min(1, "Current password is required for changes"),
  newPassword: z.string().min(6, "New password must be at least 6 characters").optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
});

// Add validation to make sure passwords match
const formSchema = profileFormSchema.refine(
  (data) => !data.newPassword || data.newPassword === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }
);

type ProfileFormValues = z.infer<typeof formSchema>;

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Form setup
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // On form submit
  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    try {
      // This would be a real API call in a production app
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An error occurred updating your profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "An error occurred during logout",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect via auth provider
  }

  return (
    <div className="flex-1 relative overflow-y-auto focus:outline-none">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Page header */}
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold text-slate-800">My Profile</h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Button variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Profile Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                  <AvatarFallback className="text-xl">
                    {user?.name?.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold">{user?.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{user?.email}</p>
                <Badge variant="outline" className="mt-2">
                  {user?.role === "manager" ? "Manager" : "Agent"}
                </Badge>
              </CardContent>
            </Card>

            {/* Edit Profile Form */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Update your profile information</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-6" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Change Password</h4>
                      <p className="text-sm text-muted-foreground">
                        Enter your current password to set a new one
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Your current password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="New password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

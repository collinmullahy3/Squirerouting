import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "./queryClient";

interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: "manager" | "agent" | "landlord" | "renter" | "admin";
  phone?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps): React.ReactNode => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_, setLocation] = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('Attempting to fetch user data from /api/auth/me');
        // Use a retry mechanism for fetching the user to handle race conditions with session setup
        let retries = 0;
        const maxRetries = 3;
        let userData = null;
        
        while (retries < maxRetries) {
          try {
            userData = await apiRequest('GET', '/api/auth/me');
            console.log("User authenticated:", userData.username);
            break;
          } catch (err) {
            if (err instanceof Error && err.message.includes('401')) {
              // Wait a bit before trying again
              console.log(`Authentication retry attempt ${retries + 1}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, 800));
              retries++;
            } else {
              // Other error status
              console.log(`Unexpected error: ${err}`);
              break;
            }
          }
        }
        
        if (userData) {
          setUser(userData);
        } else {
          setUser(null);
          console.log("User not authenticated");
          // If not authenticated and not on login page, redirect
          if (window.location.pathname !== "/login") {
            console.log('Not authenticated - redirecting to login');
            setLocation("/login");
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setUser(null);
        if (window.location.pathname !== "/login") {
          setLocation("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [setLocation]);

  // Effect to handle routing based on user role
  useEffect(() => {
    if (!isLoading && user) {
      const path = window.location.pathname;
      
      // If on login page but already authenticated, redirect to dashboard
      if (path === "/login") {
        if (user.role === "manager") {
          setLocation("/");
        } else {
          setLocation("/my-leads");
        }
        return;
      }
      
      // Role-based route protection
      if (user.role === "manager") {
        // Managers shouldn't access agent-specific pages
        if (path === "/my-leads" || path === "/my-performance") {
          setLocation("/");
        }
      } else if (user.role === "agent") {
        // Agents shouldn't access manager-specific pages
        if (path === "/" || path === "/lead-groups" || path === "/agents" || path === "/performance" || path === "/email-settings") {
          setLocation("/my-leads");
        }
      }
    }
  }, [isLoading, user, setLocation]);

  const logout = async () => {
    try {
      console.log('Logging out user...');
      // Call the server logout endpoint
      await apiRequest('POST', '/api/auth/logout');
      
      // Clear client-side state
      setUser(null);
      // Clear any cached data
      queryClient.clear();
      console.log('Redirecting to login page after logout');
      setLocation("/login");
    } catch (error) {
      console.error('Logout error:', error);
      // Even if server logout fails, clear local state
      setUser(null);
      queryClient.clear();
      setLocation("/login");
    }
  };

  return (
    <AuthContext.Provider value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        setUser,
        logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

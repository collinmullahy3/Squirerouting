import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { queryClient } from "./queryClient";

interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: "manager" | "agent";
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
        // Use a retry mechanism for fetching the user to handle race conditions with session setup
        let retries = 0;
        const maxRetries = 3;
        let userData = null;
        
        while (retries < maxRetries) {
          const response = await fetch("/api/auth/me", {
            credentials: "include",
          });
          
          if (response.ok) {
            userData = await response.json();
            console.log("User authenticated:", userData.username);
            break;
          } else if (response.status === 401) {
            // Wait a bit before trying again
            console.log(`Authentication retry attempt ${retries + 1}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, 800));
            retries++;
          } else {
            // Other error status
            break;
          }
        }
        
        if (userData) {
          setUser(userData);
        } else {
          setUser(null);
          console.log("User not authenticated");
          // If not authenticated and not on login page, redirect
          if (window.location.pathname !== "/login") {
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
        if (path === "/" || path === "/agent-groups" || path === "/performance" || path === "/routing-rules" || path === "/email-settings") {
          setLocation("/my-leads");
        }
      }
    }
  }, [isLoading, user, setLocation]);

  const logout = () => {
    setUser(null);
    // Clear any cached data
    queryClient.clear();
    setLocation("/login");
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

import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isMobile = useMobile();

  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [isMobile]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Mobile sidebar toggle button */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="p-4 border-r border-slate-200 text-slate-500 focus:outline-none focus:bg-slate-100 focus:text-slate-600 fixed top-0 left-0 z-40"
        >
          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 transform z-30 transition duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isMobile ? "md:translate-x-0" : "",
          className
        )}
      >
        <div className="flex flex-col w-64 h-full">
          <div className="flex flex-col h-0 flex-1 bg-slate-800">
            <div className="flex items-center h-20 flex-shrink-0 px-4 bg-slate-900">
              <div className="flex items-center gap-3">
                <img src="/squire-logo.png" alt="Squire Logo" className="h-10 w-auto bg-white rounded-full p-1" />
                <h1 className="text-2xl font-bold text-white">Squire</h1>
              </div>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {/* Manager Navigation Items */}
                {user?.role === "manager" && (
                  <>
                    <NavItem href="/" icon="home" active={location === "/"}>
                      Dashboard
                    </NavItem>
                    <NavItem href="/leads" icon="inbox" active={location === "/leads" || location.startsWith("/leads/")}>
                      All Leads
                    </NavItem>
                    <NavItem href="/agent-groups" icon="users" active={location === "/agent-groups"}>
                      Agent Groups
                    </NavItem>
                    <NavItem href="/agents" icon="user-plus" active={location === "/agents"}>
                      Agents
                    </NavItem>
                    <NavItem href="/performance" icon="bar-chart-2" active={location === "/performance"}>
                      Performance
                    </NavItem>
                    <NavItem href="/routing-rules" icon="settings" active={location === "/routing-rules"}>
                      Routing Rules
                    </NavItem>
                    <NavItem href="/email-settings" icon="mail" active={location === "/email-settings"}>
                      Email Settings
                    </NavItem>
                  </>
                )}
                
                {/* Agent Navigation Items */}
                {user?.role === "agent" && (
                  <>
                    <NavItem href="/my-leads" icon="inbox" active={location === "/my-leads"}>
                      My Leads
                    </NavItem>
                    <NavItem href="/my-performance" icon="bar-chart-2" active={location === "/my-performance"}>
                      My Performance
                    </NavItem>
                  </>
                )}
                
                {/* Common Navigation Items */}
                <div className="pt-4 mt-4 border-t border-slate-700">
                  <NavItem href="/profile" icon="user" active={location === "/profile"}>
                    Profile
                  </NavItem>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay to close sidebar on mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}

interface NavItemProps {
  href: string;
  icon: string;
  children: React.ReactNode;
  active?: boolean;
}

function NavItem({ href, icon, children, active = false }: NavItemProps) {
  return (
    <Link 
      href={href}
      className={cn(
        "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
        active
          ? "bg-slate-900 text-white sidebar-item-active"
          : "text-slate-300 hover:bg-slate-700 hover:text-white sidebar-item"
      )}
    >
      <NavIcon name={icon} active={active} className="mr-3 h-6 w-6" />
      {children}
    </Link>
  );
}

interface NavIconProps {
  name: string;
  active?: boolean;
  className?: string;
}

function NavIcon({ name, active = false, className }: NavIconProps) {
  const iconClass = cn(
    className,
    active ? "text-white sidebar-icon-active" : "text-slate-400 group-hover:text-slate-300 sidebar-icon"
  );

  switch (name) {
    case "home":
      return (
        <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "users":
      return (
        <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "bar-chart-2":
      return (
        <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "settings":
      return (
        <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "user":
      return (
        <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "inbox":
      return (
        <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "mail":
      return (
        <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "log-out":
      return (
        <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      );
    case "user-plus":
      return (
        <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      );
    case "send":
      return (
        <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      );
    default:
      return null;
  }
}

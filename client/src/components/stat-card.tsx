import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  linkText?: string;
  href?: string;
  color?: "primary" | "success" | "warning" | "danger";
}

export default function StatCard({ title, value, icon, linkText, href, color = "primary" }: StatCardProps) {
  return (
    <Card className="bg-white overflow-hidden shadow rounded-lg">
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${getIconBgClass(color)}`}>
            {renderIcon(icon, color)}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-slate-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-slate-900">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      {href && linkText && (
        <div className="bg-slate-50 px-4 py-4 sm:px-6">
          <div className="text-sm">
            <Link href={href} className="font-medium text-primary-600 hover:text-primary-500">
              {linkText}
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

function getIconBgClass(color: string): string {
  switch (color) {
    case "primary":
      return "bg-primary-100 text-primary-600 stat-card-icon-primary";
    case "success":
      return "bg-green-100 text-green-600 stat-card-icon-success";
    case "warning":
      return "bg-amber-100 text-amber-600 stat-card-icon-warning";
    case "danger":
      return "bg-red-100 text-red-600";
    default:
      return "bg-primary-100 text-primary-600 stat-card-icon-primary";
  }
}

function renderIcon(name: string, color: string) {
  switch (name) {
    case "user":
      return (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "check-circle":
      return (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "clock":
      return (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "users":
      return (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "chart":
      return (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    default:
      return (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
  }
}

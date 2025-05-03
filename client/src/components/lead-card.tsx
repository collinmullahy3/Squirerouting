import { Badge } from "@/components/ui/badge";

interface LeadCardProps {
  lead: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    price?: number | string;
    zipCode?: string;
    address?: string;
    propertyUrl?: string;
    thumbnailUrl?: string;
    status: string;
    receivedAt: string;
    assignedAgent?: {
      id: number;
      name: string;
    };
  };
  showActions?: boolean;
  onStatusUpdate?: (lead: any) => void;
}

export default function LeadCard({ lead, showActions = false, onStatusUpdate }: LeadCardProps) {
  return (
    <li className="block hover:bg-slate-50">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-primary-600 truncate">
            {lead.name}
          </p>
          <div className="ml-2 flex-shrink-0 flex">
            <Badge className={`
              ${lead.status === 'pending' ? 'status-badge-pending' : ''}
              ${lead.status === 'assigned' ? 'status-badge-assigned' : ''}
              ${lead.status === 'contacted' ? 'status-badge-contacted' : ''}
              ${lead.status === 'not_interested' ? 'status-badge-not-interested' : ''}
              ${lead.status === 'closed' ? 'status-badge-closed' : ''}
            `}>
              {lead.status === 'pending' ? 'Pending' : ''}
              {lead.status === 'assigned' ? 'Assigned' : ''}
              {lead.status === 'contacted' ? 'Contacted' : ''}
              {lead.status === 'not_interested' ? 'Not Interested' : ''}
              {lead.status === 'closed' ? 'Closed' : ''}
            </Badge>
          </div>
        </div>
        <div className="mt-2 sm:flex sm:justify-between">
          <div className="sm:flex">
            <p className="flex items-center text-sm text-slate-500">
              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {lead.email}
            </p>
            <p className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0 sm:ml-6">
              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {lead.phone || "No phone number"}
            </p>
          </div>
          <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>
              Received <time dateTime={lead.receivedAt}>{new Date(lead.receivedAt).toLocaleDateString()}</time>
            </p>
          </div>
        </div>
        <div className="mt-2 sm:flex sm:justify-between">
          <div className="sm:flex">
            <p className="flex items-center text-sm text-slate-500">
              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {lead.address || (lead.zipCode ? `ZIP: ${lead.zipCode}` : "No address provided")}
            </p>
          </div>
          <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>
              {lead.price ? (
                typeof lead.price === 'number' 
                  ? `$${lead.price.toLocaleString()}`
                  : `$${parseFloat(lead.price as string).toLocaleString()}`
              ) : "No price specified"}
            </p>
          </div>
        </div>
        {lead.assignedAgent && (
          <div className="mt-2 text-sm text-slate-500">
            <span className="font-medium">Assigned to:</span> {lead.assignedAgent.name}
          </div>
        )}
        
        {lead.propertyUrl && (
          <div className="mt-3 border-t pt-3">
            <div className="flex items-start">
              {lead.thumbnailUrl && (
                <div className="flex-shrink-0 mr-3">
                  <img 
                    src={lead.thumbnailUrl} 
                    alt="Property" 
                    className="h-16 w-16 object-cover rounded"
                    onError={(e) => {
                      // Hide image on error
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Property Link:</p>
                <a 
                  href={lead.propertyUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-800 hover:underline break-all"
                >
                  {lead.propertyUrl}
                </a>
              </div>
            </div>
          </div>
        )}
        {showActions && onStatusUpdate && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onStatusUpdate(lead)}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200"
            >
              Update Status
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

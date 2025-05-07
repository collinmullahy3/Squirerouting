import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Apartment } from "@shared/schema";
import { 
  Loader2, 
  MapPin, 
  DollarSign, 
  BedDouble, 
  Bath, 
  Calendar, 
  Square, 
  User,
  ArrowLeft,
  Mail,
  Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

export default function ApartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: apartment, isLoading, error } = useQuery<Apartment>({
    queryKey: [`/api/apartments/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/apartments/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch apartment details");
      }
      return response.json();
    },
  });

  const handleContactLandlord = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to contact the landlord.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }

    // Here you could implement a contact form or messaging system
    toast({
      title: "Contact Request Sent",
      description: "The landlord has been notified of your interest.",
    });
  };

  const formatPrice = (price?: number | string) => {
    if (!price) return "$0";
    
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(numericPrice);
  };

  const isOwner = user && apartment?.userId === user.id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isOwner || isAdmin;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={() => setLocation("/apartments")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to listings
      </Button>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">
          <p>Error loading apartment details. Please try again later.</p>
        </div>
      ) : apartment ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                {apartment.imageUrl ? (
                  <img 
                    src={apartment.imageUrl as string} 
                    alt={apartment.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center">
                    <Square className="h-12 w-12 mb-2" />
                    <span>No image available</span>
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <h1 className="text-3xl font-bold mb-2">{apartment.title}</h1>
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4 mr-1" />
                  <p>{apartment.address}, {apartment.city}, {apartment.state} {apartment.zip}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-center">
                    <DollarSign className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-bold">{formatPrice(apartment.price)}</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-center">
                    <BedDouble className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-sm text-muted-foreground">Bedrooms</p>
                    <p className="font-bold">{apartment.bedrooms}</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-center">
                    <Bath className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-sm text-muted-foreground">Bathrooms</p>
                    <p className="font-bold">{apartment.bathrooms}</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-center">
                    <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-sm text-muted-foreground">Available From</p>
                    <p className="font-bold">
                      {apartment.availableFrom 
                        ? new Date(apartment.availableFrom).toLocaleDateString() 
                        : 'Now'}
                    </p>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4">Description</h2>
                  <p className="whitespace-pre-line">{apartment.description}</p>
                </div>
                
                {apartment.features && apartment.features.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    
                    <div>
                      <h2 className="text-xl font-bold mb-4">Features</h2>
                      <ul className="grid grid-cols-2 gap-2">
                        {apartment.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-primary mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                
                {canEdit && (
                  <>
                    <Separator className="my-6" />
                    
                    <div className="flex gap-4">
                      <Button 
                        onClick={() => setLocation(`/apartments/${apartment.id}/edit`)}
                      >
                        Edit Listing
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this listing?")) {
                            // Implement delete functionality
                            fetch(`/api/apartments/${apartment.id}`, {
                              method: 'DELETE'
                            })
                            .then(response => {
                              if (response.ok) {
                                toast({
                                  title: "Success",
                                  description: "Apartment listing deleted successfully"
                                });
                                setLocation("/apartments");
                              } else {
                                throw new Error("Failed to delete listing");
                              }
                            })
                            .catch(error => {
                              toast({
                                title: "Error",
                                description: error.message,
                                variant: "destructive"
                              });
                            });
                          }
                        }}
                      >
                        Delete Listing
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Get in touch about this property</CardDescription>
              </CardHeader>
              <CardContent>
                {apartment.owner ? (
                  <div>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="bg-primary/10 rounded-full p-2">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{apartment.owner.name}</p>
                        <p className="text-sm text-muted-foreground">Property Owner</p>
                      </div>
                    </div>
                    
                    {apartment.owner.email && (
                      <div className="flex items-start gap-3 mb-4">
                        <div className="bg-primary/10 rounded-full p-2">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{apartment.owner.email}</p>
                          <p className="text-sm text-muted-foreground">Email</p>
                        </div>
                      </div>
                    )}
                    
                    {apartment.owner.phone && (
                      <div className="flex items-start gap-3 mb-6">
                        <div className="bg-primary/10 rounded-full p-2">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{apartment.owner.phone}</p>
                          <p className="text-sm text-muted-foreground">Phone</p>
                        </div>
                      </div>
                    )}
                    
                    <Button className="w-full" onClick={handleContactLandlord}>
                      Contact Landlord
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Contact information not available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Property Type</span>
                    <span className="font-medium">{apartment.propertyType || 'Apartment'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Square Feet</span>
                    <span className="font-medium">{apartment.squareFeet || 'N/A'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Year Built</span>
                    <span className="font-medium">{apartment.yearBuilt || 'N/A'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Parking</span>
                    <span className="font-medium">{apartment.parking || 'N/A'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Pet Policy</span>
                    <span className="font-medium">{apartment.petPolicy || 'N/A'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Laundry</span>
                    <span className="font-medium">{apartment.laundry || 'N/A'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Listed On</span>
                    <span className="font-medium">
                      {new Date(apartment.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-lg">Apartment not found.</p>
          <Button 
            className="mt-4" 
            onClick={() => setLocation("/apartments")}
          >
            Browse Listings
          </Button>
        </div>
      )}
    </div>
  );
}
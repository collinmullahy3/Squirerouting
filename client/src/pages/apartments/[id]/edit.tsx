import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ApartmentInsert, Apartment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form schema based on ApartmentInsert type
const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  address: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(5, "Valid ZIP code is required"),
  bedrooms: z.coerce.number().min(0, "Bedrooms must be 0 or more"),
  bathrooms: z.coerce.number().min(0, "Bathrooms must be 0 or more"),
  imageUrl: z.string().optional(),
  availableFrom: z.string().optional(),
  squareFeet: z.coerce.number().optional(),
  yearBuilt: z.coerce.number().optional(),
  propertyType: z.string().optional(),
  parking: z.string().optional(),
  petPolicy: z.string().optional(),
  laundry: z.string().optional(),
  features: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditApartmentPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");

  // Initialize react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      address: "",
      city: "",
      state: "",
      zip: "",
      bedrooms: 0,
      bathrooms: 0,
      imageUrl: "",
      availableFrom: "",
      squareFeet: undefined,
      yearBuilt: undefined,
      propertyType: "Apartment",
      parking: "",
      petPolicy: "",
      laundry: "",
      features: [],
    },
  });

  // Fetch apartment data
  const { 
    data: apartment, 
    isLoading: isLoadingApartment, 
    error: apartmentError 
  } = useQuery<Apartment>({
    queryKey: [`/api/apartments/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/apartments/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch apartment details");
      }
      return response.json();
    },
  });

  // Populate form when apartment data is loaded
  useEffect(() => {
    if (apartment) {
      // Convert availableFrom date to YYYY-MM-DD format for input[type="date"]
      let formattedDate = apartment.availableFrom 
        ? new Date(apartment.availableFrom).toISOString().split('T')[0]
        : '';
      
      form.reset({
        title: apartment.title,
        description: apartment.description,
        price: apartment.price,
        address: apartment.address,
        city: apartment.city,
        state: apartment.state,
        zip: apartment.zip,
        bedrooms: apartment.bedrooms,
        bathrooms: apartment.bathrooms,
        imageUrl: apartment.imageUrl || '',
        availableFrom: formattedDate,
        squareFeet: apartment.squareFeet,
        yearBuilt: apartment.yearBuilt,
        propertyType: apartment.propertyType || 'Apartment',
        parking: apartment.parking || '',
        petPolicy: apartment.petPolicy || '',
        laundry: apartment.laundry || '',
        features: apartment.features || [],
      });
      
      setFeatures(apartment.features || []);
    }
  }, [apartment, form]);

  // Check permission
  const canEdit = user && apartment && (user.id === apartment.userId || user.role === 'admin');

  // Redirect if not logged in or doesn't have permission
  useEffect(() => {
    if (user === null) {
      toast({
        title: "Authentication Required",
        description: "Please log in to edit property listings.",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }

    if (apartment && user && !canEdit) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit this listing.",
        variant: "destructive",
      });
      setLocation(`/apartments/${id}`);
    }
  }, [user, apartment, canEdit, id, setLocation, toast]);

  // Add feature to the list
  const addFeature = () => {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      const updatedFeatures = [...features, newFeature.trim()];
      setFeatures(updatedFeatures);
      form.setValue("features", updatedFeatures);
      setNewFeature("");
    }
  };

  // Remove feature from the list
  const removeFeature = (index: number) => {
    const updatedFeatures = features.filter((_, i) => i !== index);
    setFeatures(updatedFeatures);
    form.setValue("features", updatedFeatures);
  };

  // Handle form submission
  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return await apiRequest("PUT", `/api/apartments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apartments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/apartments/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/my/apartments"] });
      toast({
        title: "Success!",
        description: "The property listing has been updated.",
      });
      setLocation(`/apartments/${id}`);
    },
    onError: (error) => {
      console.error("Error updating apartment:", error);
      toast({
        title: "Error",
        description: "Failed to update property listing. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateMutation.mutate(data);
  };

  // Show loading state
  if (isLoadingApartment || user === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error state
  if (apartmentError) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500 mb-4">Error loading apartment data. Please try again later.</p>
        <Button onClick={() => setLocation("/apartments")}>Back to listings</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={() => setLocation(`/apartments/${id}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to listing
      </Button>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-6">Edit Property Listing</h1>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Modern Loft in Downtown" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Rent ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the property in detail..." 
                      className="min-h-32"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator />
            
            <h2 className="text-xl font-semibold">Location Information</h2>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, Apt 4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="San Francisco" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="CA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="94103" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            <h2 className="text-xl font-semibold">Property Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="squareFeet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Square Feet</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="propertyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Apartment">Apartment</SelectItem>
                        <SelectItem value="House">House</SelectItem>
                        <SelectItem value="Condo">Condo</SelectItem>
                        <SelectItem value="Townhouse">Townhouse</SelectItem>
                        <SelectItem value="Studio">Studio</SelectItem>
                        <SelectItem value="Loft">Loft</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="yearBuilt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Built</FormLabel>
                    <FormControl>
                      <Input type="number" min="1900" max={new Date().getFullYear()} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="availableFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="parking"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parking</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parking option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Not Specified</SelectItem>
                        <SelectItem value="Street Parking">Street Parking</SelectItem>
                        <SelectItem value="Garage">Garage</SelectItem>
                        <SelectItem value="Driveway">Driveway</SelectItem>
                        <SelectItem value="Covered">Covered</SelectItem>
                        <SelectItem value="Not Available">Not Available</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="laundry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Laundry</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select laundry option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Not Specified</SelectItem>
                        <SelectItem value="In Unit">In Unit</SelectItem>
                        <SelectItem value="In Building">In Building</SelectItem>
                        <SelectItem value="Hookups Only">Hookups Only</SelectItem>
                        <SelectItem value="Not Available">Not Available</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="petPolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet Policy</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pet policy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Not Specified</SelectItem>
                        <SelectItem value="No Pets">No Pets</SelectItem>
                        <SelectItem value="Cats Allowed">Cats Allowed</SelectItem>
                        <SelectItem value="Small Dogs Allowed">Small Dogs Allowed</SelectItem>
                        <SelectItem value="All Pets Allowed">All Pets Allowed</SelectItem>
                        <SelectItem value="Case by Case">Case by Case</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            <h2 className="text-xl font-semibold">Features & Media</h2>
            
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.jpg" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter a URL for the property's primary image
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Property Features</FormLabel>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="e.g., Dishwasher, Balcony"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                />
                <Button type="button" onClick={addFeature}>Add</Button>
              </div>
              
              {features.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center bg-muted px-3 py-1 rounded-full">
                      <span className="mr-1">{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 rounded-full"
                        onClick={() => removeFeature(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No features added yet.</p>
              )}
            </div>
            
            <div className="pt-6 flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(`/apartments/${id}`)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
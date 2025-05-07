import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Apartment } from "@shared/schema";
import { useLocation } from "wouter";
import { Loader2, MapPin, DollarSign, BedDouble, Bath, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function ApartmentsPage() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    bedrooms: "",
    city: "",
    zip: "",
  });

  // Fetch apartments with filters
  const {
    data: apartments,
    isLoading,
    error,
  } = useQuery<Apartment[]>({
    queryKey: ["/api/apartments", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.minPrice) params.append("minPrice", filters.minPrice);
      if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
      if (filters.bedrooms) params.append("bedrooms", filters.bedrooms);
      if (filters.city) params.append("city", filters.city);
      if (filters.zip) params.append("zip", filters.zip);

      const response = await fetch(`/api/apartments?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch apartments");
      }
      return response.json();
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Available Apartments</h1>
        <Button onClick={() => setLocation("/apartments/create")}>List Your Property</Button>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">Filter Properties</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Min Price</label>
            <Input
              type="number"
              placeholder="Min Price"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange("minPrice", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Price</label>
            <Input
              type="number"
              placeholder="Max Price"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bedrooms</label>
            <Select
              value={filters.bedrooms}
              onValueChange={(value) => handleFilterChange("bedrooms", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                <SelectItem value="0">Studio</SelectItem>
                <SelectItem value="1">1 Bedroom</SelectItem>
                <SelectItem value="2">2 Bedrooms</SelectItem>
                <SelectItem value="3">3 Bedrooms</SelectItem>
                <SelectItem value="4">4+ Bedrooms</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <Input
              placeholder="City"
              value={filters.city}
              onChange={(e) => handleFilterChange("city", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ZIP Code</label>
            <Input
              placeholder="ZIP Code"
              value={filters.zip}
              onChange={(e) => handleFilterChange("zip", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Results Section */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">
          <p>Error loading apartments. Please try again later.</p>
        </div>
      ) : apartments && apartments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apartments.map((apartment) => (
            <Card key={apartment.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                {apartment.imageUrl ? (
                  <img 
                    src={apartment.imageUrl} 
                    alt={apartment.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 dark:text-gray-500">No image available</div>
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold">{apartment.title}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {apartment.address}, {apartment.city}, {apartment.state} {apartment.zip}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-1 text-primary font-bold text-lg">
                    <DollarSign className="h-5 w-5" />
                    {formatPrice(apartment.price)}
                    <span className="text-sm font-normal">/month</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1" title="Bedrooms">
                      <BedDouble className="h-4 w-4 text-gray-500" />
                      <span>{apartment.bedrooms}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Bathrooms">
                      <Bath className="h-4 w-4 text-gray-500" />
                      <span>{apartment.bathrooms}</span>
                    </div>
                  </div>
                </div>
                <Separator className="my-2" />
                <p className="text-sm line-clamp-2">{apartment.description}</p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation(`/apartments/${apartment.id}`)}
                >
                  <Eye className="h-4 w-4 mr-1" /> View Details
                </Button>
                <div className="text-sm text-gray-500 flex items-center">
                  {new Date(apartment.createdAt).toLocaleDateString()}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-lg">No apartments matching your criteria.</p>
          <p className="text-gray-500 mt-2">Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Apartment } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { 
  BedDouble, 
  Bath, 
  MapPin, 
  Search, 
  Plus,
  Loader2,
  Filter,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

export default function ApartmentsIndex() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [bedrooms, setBedrooms] = useState<string>("any");
  const [bathrooms, setBathrooms] = useState<string>("any");
  const [propertyType, setPropertyType] = useState<string>("any");

  // Fetch apartments
  const { data: apartments, isLoading, error } = useQuery<Apartment[]>({
    queryKey: ["/api/apartments"],
    queryFn: async () => {
      const response = await fetch("/api/apartments");
      if (!response.ok) {
        throw new Error("Failed to fetch apartments");
      }
      return response.json();
    },
  });

  // Filter apartments based on search and filters
  const filteredApartments = apartments?.filter(apartment => {
    const matchesSearch = 
      searchTerm === "" || 
      apartment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.zip.toLowerCase().includes(searchTerm.toLowerCase());
    
    const price = typeof apartment.price === 'string' ? parseFloat(apartment.price) : apartment.price;
    const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
    
    const matchesBedrooms = 
      bedrooms === "any" || 
      (bedrooms === "4+" && apartment.bedrooms >= 4) ||
      (apartment.bedrooms.toString() === bedrooms);
    
    const bedroomsValue = typeof apartment.bathrooms === 'number' 
      ? apartment.bathrooms
      : parseFloat(apartment.bathrooms as string);
    
    const matchesBathrooms = 
      bathrooms === "any" || 
      (bathrooms === "3+" && bedroomsValue >= 3) ||
      (bedroomsValue.toString() === bathrooms);
    
    const matchesPropertyType = 
      propertyType === "any" || 
      apartment.propertyType === propertyType;
    
    return matchesSearch && matchesPrice && matchesBedrooms && matchesBathrooms && matchesPropertyType;
  });

  // Format price with dollar sign and comma separators
  const formatPrice = (price: string | number) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(numericPrice);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setPriceRange([0, 10000]);
    setBedrooms("any");
    setBathrooms("any");
    setPropertyType("any");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Apartment Listings</h1>
        
        {user && ['admin', 'landlord', 'manager'].includes(user.role) && (
          <Button onClick={() => setLocation("/apartments/create")}>
            <Plus className="mr-2 h-4 w-4" />
            List New Property
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by location, title, description..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle>Filter Properties</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-6">
                <div className="space-y-2">
                  <Label>Price Range (monthly)</Label>
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>{formatPrice(priceRange[0])}</span>
                    <span>{formatPrice(priceRange[1])}</span>
                  </div>
                  <Slider
                    defaultValue={priceRange}
                    min={0}
                    max={10000}
                    step={100}
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Select value={bedrooms} onValueChange={setBedrooms}>
                    <SelectTrigger id="bedrooms">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="0">Studio</SelectItem>
                      <SelectItem value="1">1 Bedroom</SelectItem>
                      <SelectItem value="2">2 Bedrooms</SelectItem>
                      <SelectItem value="3">3 Bedrooms</SelectItem>
                      <SelectItem value="4+">4+ Bedrooms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Select value={bathrooms} onValueChange={setBathrooms}>
                    <SelectTrigger id="bathrooms">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1">1 Bathroom</SelectItem>
                      <SelectItem value="1.5">1.5 Bathrooms</SelectItem>
                      <SelectItem value="2">2 Bathrooms</SelectItem>
                      <SelectItem value="2.5">2.5 Bathrooms</SelectItem>
                      <SelectItem value="3+">3+ Bathrooms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger id="propertyType">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="Apartment">Apartment</SelectItem>
                      <SelectItem value="House">House</SelectItem>
                      <SelectItem value="Condo">Condo</SelectItem>
                      <SelectItem value="Townhouse">Townhouse</SelectItem>
                      <SelectItem value="Studio">Studio</SelectItem>
                      <SelectItem value="Loft">Loft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DrawerFooter>
                <Button onClick={resetFilters} variant="outline">Reset Filters</Button>
                <DrawerClose asChild>
                  <Button>Apply Filters</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-500 mb-4">Error loading apartment listings.</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      ) : filteredApartments && filteredApartments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApartments.map((apartment) => (
            <Card 
              key={apartment.id} 
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation(`/apartments/${apartment.id}`)}
            >
              <div className="aspect-[16/9] bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                {apartment.imageUrl ? (
                  <img 
                    src={apartment.imageUrl as string} 
                    alt={apartment.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 dark:text-gray-500">No image available</div>
                )}
              </div>
              
              <CardContent className="p-4">
                <div className="mb-2">
                  <p className="text-xl font-bold">{apartment.title}</p>
                  <p className="text-2xl font-semibold text-primary">
                    {formatPrice(apartment.price)}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </p>
                </div>
                
                <div className="flex items-center text-muted-foreground mb-3">
                  <MapPin className="h-4 w-4 mr-1" />
                  <p className="text-sm truncate">{apartment.address}, {apartment.city}</p>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{apartment.description}</p>
              </CardContent>
              
              <CardFooter className="px-4 py-3 border-t bg-gray-50 dark:bg-gray-800 flex justify-between">
                <div className="flex items-center">
                  <BedDouble className="h-4 w-4 mr-1" />
                  <span className="text-sm">{apartment.bedrooms} {apartment.bedrooms === 1 ? 'Bed' : 'Beds'}</span>
                </div>
                <div className="flex items-center">
                  <Bath className="h-4 w-4 mr-1" />
                  <span className="text-sm">{apartment.bathrooms} {apartment.bathrooms === 1 ? 'Bath' : 'Baths'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm">{apartment.propertyType || 'Apartment'}</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-lg mb-4">No properties found matching your criteria.</p>
          {(searchTerm || bedrooms !== "any" || bathrooms !== "any" || propertyType !== "any" || priceRange[0] > 0 || priceRange[1] < 10000) && (
            <Button onClick={resetFilters}>Clear Filters</Button>
          )}
        </div>
      )}
    </div>
  );
}
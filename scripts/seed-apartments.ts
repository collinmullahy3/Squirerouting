import { db } from '../db';
import { apartments } from '../shared/schema';

async function seedApartments() {
  try {
    console.log('Seeding apartments data...');
    
    // Check if there are already apartments in the database
    const existingApartments = await db.select().from(apartments);
    
    if (existingApartments.length > 0) {
      console.log(`Found ${existingApartments.length} existing apartments. Skipping seeding.`);
      process.exit(0);
      return;
    }
    
    // Manager user ID - typically you would find this from the database
    // For now, we're using ID 6 which corresponds to manager1 based on logs
    const managerId = 6; 
    
    // Sample apartment data
    const apartmentData = [
      {
        title: "Luxury Downtown Apartment",
        description: "Beautiful modern apartment in the heart of downtown with stunning city views. Featuring hardwood floors, stainless steel appliances, and an open floor plan. Walking distance to shops, restaurants, and public transportation.",
        price: 2400.00,
        address: "123 Main Street",
        city: "New York",
        state: "NY",
        zip: "10001",
        bedrooms: 2,
        bathrooms: 2.0,
        squareFeet: 1200,
        available: true,
        availableFrom: new Date("2025-06-01"),
        petFriendly: true,
        furnished: false,
        parking: true,
        airConditioning: true,
        userId: managerId
      },
      {
        title: "Cozy Studio in Historic District",
        description: "Charming studio apartment in a historic building. Recently renovated with modern amenities while preserving vintage charm. High ceilings, large windows, and efficient layout.",
        price: 1500.00,
        address: "456 Park Avenue",
        city: "Boston",
        state: "MA",
        zip: "02108",
        bedrooms: 0,
        bathrooms: 1.0,
        squareFeet: 550,
        available: true,
        availableFrom: new Date("2025-05-15"),
        petFriendly: false,
        furnished: true,
        parking: false,
        airConditioning: true,
        userId: managerId
      },
      {
        title: "Spacious Family Home",
        description: "Large family home with plenty of space for everyone. Features include a fenced backyard, updated kitchen, and finished basement. Located in a quiet neighborhood with excellent schools nearby.",
        price: 3200.00,
        address: "789 Oak Drive",
        city: "Chicago",
        state: "IL",
        zip: "60611",
        bedrooms: 4,
        bathrooms: 2.5,
        squareFeet: 2200,
        available: true,
        availableFrom: new Date("2025-07-01"),
        petFriendly: true,
        furnished: false,
        parking: true,
        airConditioning: true,
        userId: managerId
      },
      {
        title: "Modern Loft Apartment",
        description: "Stylish loft with exposed brick walls and high ceilings. Open concept layout with industrial finishes. Includes in-unit laundry and smart home features.",
        price: 2800.00,
        address: "101 Warehouse Way",
        city: "San Francisco",
        state: "CA",
        zip: "94105",
        bedrooms: 1,
        bathrooms: 1.5,
        squareFeet: 950,
        available: true,
        availableFrom: new Date("2025-05-20"),
        petFriendly: true,
        furnished: false,
        parking: false,
        airConditioning: true,
        userId: managerId
      },
      {
        title: "Beachfront Condo",
        description: "Beautiful condo with ocean views and direct beach access. Fully renovated with premium finishes. Community amenities include pool, fitness center, and 24-hour security.",
        price: 3500.00,
        address: "222 Shoreline Drive",
        city: "Miami",
        state: "FL",
        zip: "33139",
        bedrooms: 2,
        bathrooms: 2.0,
        squareFeet: 1100,
        available: true,
        availableFrom: new Date("2025-06-15"),
        petFriendly: false,
        furnished: true,
        parking: true,
        airConditioning: true,
        userId: managerId
      }
    ];
    
    // Insert apartment data
    for (const apartment of apartmentData) {
      await db.insert(apartments).values(apartment);
    }
    
    console.log(`Successfully seeded ${apartmentData.length} apartments`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding apartments:', error);
    process.exit(1);
  }
}

seedApartments();
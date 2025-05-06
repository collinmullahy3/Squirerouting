import fetch from 'node-fetch';

// Create a new lead to test routing
const testLead = {
  name: 'Test Renter',
  email: 'test.renter@example.com', 
  phone: '555-123-4567',
  price: 2000,
  zipCode: '11215', // Brooklyn
  address: '123 Test St',
  source: 'Zillow',
  propertyUrl: 'https://www.zillow.com/test-property',
  unitNumber: '2B',
  bedCount: 2,
  neighborhood: 'Park Slope'
};

fetch('http://localhost:5000/api/simulate-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'agent@example.com',
    subject: 'Test Lead for Routing Algorithm',
    htmlContent: `
      <p>New inquiry from: ${testLead.name}</p>
      <p>Email: ${testLead.email}</p>
      <p>Phone: ${testLead.phone}</p>
      <p>Interested in: ${testLead.address}, Unit ${testLead.unitNumber}</p>
      <p>Neighborhood: ${testLead.neighborhood}</p>
      <p>Price: $${testLead.price}</p>
      <p>Bed Count: ${testLead.bedCount}</p>
      <p>Zip Code: ${testLead.zipCode}</p>
      <p>Source: ${testLead.source}</p>
      <p>Property URL: ${testLead.propertyUrl}</p>
    `,
    textContent: `
      New inquiry from: ${testLead.name}
      Email: ${testLead.email}
      Phone: ${testLead.phone}
      Interested in: ${testLead.address}, Unit ${testLead.unitNumber}
      Neighborhood: ${testLead.neighborhood}
      Price: $${testLead.price}
      Bed Count: ${testLead.bedCount}
      Zip Code: ${testLead.zipCode}
      Source: ${testLead.source}
      Property URL: ${testLead.propertyUrl}
    `
  })
})
.then(response => response.json())
.then(data => {
  console.log('Response:', data);
})
.catch(error => {
  console.error('Error:', error);
});

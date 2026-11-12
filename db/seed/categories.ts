/**
 * Category taxonomy: 30 parents. Duplicate children are removed
 * (Accountants and Tax Services live only under Accounting & Tax Services).
 * Children whose slug would collide with a parent are renamed: "Snow Removal" -> "Snow Removal Services",
 * "Insurance" (under Banking & Finance) -> "Insurance Services", "Marketing" (under News & Media) -> "Media Marketing".
 * `icon` is a lucide-react icon name rendered by components/category-icon.tsx.
 */
export const TAXONOMY: { name: string; icon: string; featured?: boolean; children: string[] }[] = [
  { name: "Snow Removal", icon: "Snowflake", children: ["Snow Removal Services"] },
  { name: "Furniture", icon: "Sofa", children: ["Furniture Assembly"] },
  { name: "Laundromats", icon: "WashingMachine", children: ["Laundry"] },
  {
    name: "Restaurants & Nightlife",
    icon: "UtensilsCrossed",
    children: ["Specialty and Miscellaneous Food Stores", "Food Retail", "Cafe", "Clubs", "Delivery", "Bakeries", "Other Restaurants & Nightlife"],
  },
  {
    name: "Beauty & Spa",
    icon: "Sparkles",
    children: ["Barber", "Beauty Products", "Hair Salon", "Nail Salons", "Tattoo Shops", "Other Beauty & Spa"],
  },
  {
    name: "Accounting & Tax Services",
    icon: "Calculator",
    children: ["Payroll Services", "Tax Services", "Accountants", "Other Accounting Services"],
  },
  {
    name: "Arts, Culture & Entertainment",
    icon: "Palette",
    children: [
      "Arcades", "Museums", "Art Galleries", "Casinos", "Botanical Gardens", "Cinema", "Social Clubs", "Music",
      "Haunted Houses", "Parks and Horticulture", "Lottery", "Other Arts, Culture & Entertainment Services",
    ],
  },
  {
    name: "Auto Sales & Service",
    icon: "Car",
    featured: true,
    children: [
      "Auto Electric Services", "Auto Parts & Supplies", "Auto Repairs", "Auto Upholstery", "Auto Customization",
      "Car Dealers", "Vehicle Wash", "Gas Stations", "Oil Change Stations", "Tires", "Towing", "Other Auto Sales & Service",
    ],
  },
  {
    name: "Banking & Finance",
    icon: "Landmark",
    featured: true,
    children: [
      "Banks & Credit Unions", "Financing Services", "Currency Exchange", "Debt Relief Services", "Financial Advising",
      "Insurance Services", "Other Banking & Finance",
    ],
  },
  {
    name: "Business Services",
    icon: "Briefcase",
    featured: true,
    children: [
      "Business Consultants", "Business Financing", "Business Marketing and Advertising", "Employment Agency", "Pawn Shops",
      "Other Business Services",
    ],
  },
  {
    name: "Dentists & Orthodontists",
    icon: "Smile",
    children: [
      "Cosmetic Dentists", "General Dentistry", "Oral Surgeons", "Orthodontists", "Pediatric Dentists", "Periodontists",
      "Other Dentists & Orthodontists",
    ],
  },
  {
    name: "Education",
    icon: "GraduationCap",
    children: [
      "Colleges & Universities", "Dance Schools", "Art Classes", "Private Schools", "Driving Schools", "Language Schools",
      "Cooking Schools", "Other Special Schools", "Private Tutors", "Other Education Institutes",
    ],
  },
  {
    name: "Health & Wellness",
    icon: "HeartPulse",
    featured: true,
    children: [
      "Counseling & Mental Health", "Pharmacies", "Hospitals", "Diagnostic Services", "Laboratories", "Physicians",
      "Dermatologists", "Homeopathic", "Orthopedists", "Herbal Shops", "Home Health Care", "Massage Therapy",
      "Cosmetic Surgery", "Other Medical Services",
    ],
  },
  {
    name: "Home Improvement & Contractors",
    icon: "Hammer",
    featured: true,
    children: [
      "Landscaping & Gardening", "Remodeling", "General Contractors", "Garage Door", "Plumbers", "Handyman", "Roofers",
      "Locksmith", "Flooring", "HVAC", "Home & Office Cleaning Services", "Electricians & Electronic Repairs",
      "Glass & Mirror Repair", "Windows & Doors", "Painters", "Tiling", "Stair & Railing Contractors", "Foundation Repair",
      "Blinds & Shades", "Junk Removal & Hauling", "Damage Restoration", "Pool Maintenance & Construction", "Pest Control",
      "Spray Service", "Carpenter Services", "Deck Repair Service", "Door Services", "Kitchen Remodeling", "Patio Covers",
      "Home Decor", "Other Home & Office Services",
    ],
  },
  {
    name: "Insurance",
    icon: "ShieldCheck",
    children: ["Life Insurance", "Health Insurance", "Disability Insurance", "Auto Insurance", "Property Insurance", "Other Insurance Providers"],
  },
  {
    name: "Internet & IT Services",
    icon: "Wifi",
    featured: true,
    children: [
      "Internet Service Providers (ISPs)", "Security Services", "Networking & IT Services", "Software Design & Development",
      "Software Integration Services", "Computer Repair Services", "Other Internet & IT Services",
    ],
  },
  {
    name: "Legal Services",
    icon: "Scale",
    featured: true,
    children: ["Lawyers", "Business Legal Consultants", "Notary Public", "Other Legal Services"],
  },
  { name: "Lodging & Travel", icon: "Hotel", children: ["Hotels", "Tour and Travel", "Other Lodging & Travel"] },
  {
    name: "Marketing & Advertising",
    icon: "Megaphone",
    children: ["Social Media Advertising", "Digital Marketing Services", "Local Marketing", "PPC Marketing Agency", "Other Marketing Services"],
  },
  {
    name: "News & Media",
    icon: "Newspaper",
    children: ["Public Relations", "Media Marketing", "Entertainment and Media", "Cultural Affairs", "Other Media Services"],
  },
  {
    name: "Shopping & Retail",
    icon: "ShoppingBag",
    featured: true,
    children: [
      "Jewelry", "Clothing Apparel", "Accessories", "Gift Shops", "Cosmetics & Beauty Supply", "Retail Stores", "Shoe Stores",
      "Cards & Stationery", "Luggage", "Mobile Phones Accessories", "Other Shopping & Retail",
    ],
  },
  {
    name: "Sports & Recreation",
    icon: "Trophy",
    children: [
      "Sports Clubs", "Golf Courses", "Country Clubs", "Sports Facility", "Sports Teams", "Sports & Leisure",
      "Gyms & Sports Clubs", "Sports & Outdoors", "Other Sports & Recreation",
    ],
  },
  {
    name: "Transportation",
    icon: "Truck",
    children: [
      "Automobile & Truck Rental", "Airport Parking", "Airport Shuttles", "Movers", "Packers and Storage",
      "Freight Forwarding Services", "Taxi Services", "Other Transportation Services",
    ],
  },
  {
    name: "Utilities",
    icon: "Zap",
    children: [
      "Public Utilities & Environment", "Cable", "Internet", "Electricity Suppliers", "Natural Gas Suppliers",
      "Water Suppliers", "Other Utilities & Services",
    ],
  },
  { name: "Solar Services", icon: "Sun", children: ["Solar Panel Installation", "Infrared Installation"] },
  { name: "Appliance Repair", icon: "Wrench", children: ["Whirlpool Repairs", "Appliance Repair Services"] },
  {
    name: "Real Estate",
    icon: "Building2",
    featured: true,
    children: [
      "Commercial Real Estate Attorney", "Real Estate Agent", "Real Estate & Removals", "Residential Real Estate Attorney",
      "Real Estate Attorney", "Real Estate Management", "Other Real Estate",
    ],
  },
  {
    name: "Wedding, Events & Meetings",
    icon: "PartyPopper",
    featured: true,
    children: [
      "Clubs & Venues", "Event and Wedding Planning", "Catering", "Photographer", "Event Theme Planner", "Party Planner",
      "Session Photography", "Video/Film Production", "Other Events & Meetings",
    ],
  },
  {
    name: "Community Organizations",
    icon: "Users",
    children: ["Community Centers", "Community Gardens", "Community Service/Non-Profit", "Church", "Other Community Organizations"],
  },
  {
    name: "Pet Services",
    icon: "PawPrint",
    children: ["Pet Trainer", "Pet Boarding", "Pet Shops", "Pet Food", "Pet Supplies", "Pet Groomers", "Other Pet Services"],
  },
];

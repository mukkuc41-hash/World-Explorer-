export interface GeographyHierarchy {
  [continent: string]: {
    [country: string]: string[];
  };
}

export const TRAVEL_GEOGRAPHY: GeographyHierarchy = {
  "Asia": {
    "India": ["Rajasthan", "Kerala", "Goa", "Himachal Pradesh", "Uttar Pradesh", "Maharashtra", "Karnataka", "Tamil Nadu", "West Bengal", "Punjab", "Gujarat", "Uttarakhand"],
    "Japan": ["Tokyo", "Kyoto", "Osaka", "Hokkaido", "Okinawa", "Nara", "Fukuoka", "Miyagi", "Kanagawa", "Hiroshima"],
    "China": ["Beijing", "Shanghai", "Sichuan", "Yunnan", "Guangdong", "Fujian", "Hunan", "Shaanxi", "Zhejiang", "Jiangsu"],
    "Thailand": ["Bangkok", "Phuket", "Chiang Mai", "Krabi", "Chon Buri", "Surat Thani", "Phang Nga", "Mae Hong Son"],
    "South Korea": ["Seoul", "Busan", "Jeju", "Gyeonggi", "Gangwon", "Incheon", "Gyeongsang"],
    "Vietnam": ["Hanoi", "Ho Chi Minh City", "Da Nang", "Quang Nam", "Lao Cai", "Lam Dong", "Kien Giang"],
    "Indonesia": ["Bali", "Jakarta", "West Java", "Central Java", "East Java", "Yogyakarta", "Lombok"],
    "Malaysia": ["Kuala Lumpur", "Penang", "Selangor", "Sabah", "Sarawak", "Pahang", "Melaka"],
    "Singapore": ["Central Region", "East Region", "North Region", "North-East Region", "West Region"]
  },
  "Europe": {
    "France": ["Île-de-France", "Provence", "French Riviera", "Brittany", "Normandy", "Loire Valley", "Alsace", "Occitanie", "Corsica"],
    "Italy": ["Tuscany", "Sicily", "Lombardy", "Veneto", "Amalfi Coast", "Lazio", "Campania", "Piedmont", "Puglia", "Sardinia", "Emilia-Romagna"],
    "Spain": ["Catalonia", "Andalusia", "Madrid", "Balearic Islands", "Valencia", "Galicia", "Basque Country", "Canary Islands", "Castile and León"],
    "Germany": ["Bavaria", "Berlin", "Saxony", "Hamburg", "Baden-Württemberg", "Hesse", "Rhineland-Palatinate", "Lower Saxony"],
    "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland", "Greater London", "Highlands"],
    "Greece": ["Attica", "Central Macedonia", "Crete", "South Aegean", "Ionian Islands", "Peloponnese", "Thessaly"],
    "Portugal": ["Lisbon", "Porto", "Algarve", "Madeira", "Azores", "Alentejo", "Central Portugal"],
    "Switzerland": ["Zurich", "Geneva", "Bern", "Vaud", "Lucerne", "Ticino", "Grisons"],
    "Netherlands": ["North Holland", "South Holland", "Utrecht", "North Brabant", "Gelderland"],
    "Austria": ["Vienna", "Salzburg", "Tyrol", "Styria", "Upper Austria"]
  },
  "Africa": {
    "Egypt": ["Cairo", "Giza", "Luxor", "Red Sea", "Alexandria", "Aswan", "South Sinai", "Matrouh"],
    "South Africa": ["Western Cape", "Gauteng", "KwaZulu-Natal", "Eastern Cape", "Mpumalanga", "Free State", "Limpopo", "North West"],
    "Morocco": ["Marrakesh-Safi", "Casablanca-Settat", "Fes-Meknes", "Tanger-Tetouan-Al Hoceima", "Rabat-Sale-Kenitra", "Souss-Massa"],
    "Kenya": ["Nairobi", "Mombasa", "Rift Valley", "Central", "Coast", "Eastern", "Nyanza"],
    "Nigeria": ["Lagos", "Abuja (FCT)", "Kano", "Rivers", "Enugu", "Oyo", "Delta", "Kaduna"],
    "Tanzania": ["Zanzibar", "Dar es Salaam", "Arusha", "Kilimanjaro", "Manyara", "Pwani"],
    "Mauritius": ["Port Louis", "Black River", "Flacq", "Pamplemousses", "Plaines Wilhems"],
    "Seychelles": ["Mahé", "Praslin", "La Digue"]
  },
  "North America": {
    "USA": ["California", "New York", "Florida", "Hawaii", "Texas", "Washington", "Illinois", "Nevada", "Arizona", "Colorado", "Oregon", "Massachusetts"],
    "Canada": ["Ontario", "Quebec", "British Columbia", "Alberta", "Nova Scotia", "Manitoba", "Saskatchewan", "New Brunswick"],
    "Mexico": ["Quintana Roo", "Jalisco", "Oaxaca", "Mexico City", "Baja California", "Yucatan", "Guerrero", "Guanajuato"],
    "Costa Rica": ["San Jose", "Alajuela", "Guanacaste", "Puntarenas", "Limon", "Heredia"],
    "Jamaica": ["Kingston", "Saint Ann", "Saint James", "Westmoreland"],
    "Dominican Republic": ["Santo Domingo", "La Altagracia", "Puerto Plata", "Samaná"]
  },
  "South America": {
    "Brazil": ["Rio de Janeiro", "São Paulo", "Bahia", "Amazonas", "Minas Gerais", "Pernambuco", "Santa Catarina", "Paraná", "Ceará"],
    "Argentina": ["Buenos Aires", "Patagonia", "Mendoza", "Salta", "Córdoba", "Santa Cruz", "Tierra del Fuego", "Jujuy"],
    "Peru": ["Cusco", "Lima", "Arequipa", "Ica", "La Libertad", "Puno", "Ancash"],
    "Chile": ["Santiago", "Valparaiso", "Magallanes", "Antofagasta", "Los Lagos", "Atacama"],
    "Colombia": ["Bogotá", "Antioquia", "Bolívar", "Valle del Cauca", "Quindío"],
    "Ecuador": ["Pichincha", "Guayas", "Galápagos", "Azuay"]
  },
  "Oceania": {
    "Australia": ["New South Wales", "Queensland", "Victoria", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "ACT"],
    "New Zealand": ["Auckland", "Canterbury", "Otago", "Wellington", "Bay of Plenty", "Waikato", "Northland", "Taranaki"],
    "Fiji": ["Viti Levu", "Vanua Levu", "Taveuni", "Mamanuca Islands"],
    "Papua New Guinea": ["National Capital District", "Central", "Morobe", "Madang"]
  },
  "Antarctica": {
    "Ross Dependency": ["McMurdo Station", "Scott Base"],
    "Antarctic Peninsula": ["Hope Bay", "Petermann Island", "Deception Island"],
    "Adélie Land": ["Dumont d'Urville Station"],
    "Queen Maud Land": ["Troll Station", "Tor Station"]
  }
};

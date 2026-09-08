import { StateCodeMap } from '../types';

export const INDIAN_STATES: StateCodeMap[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export const COMMON_HSN_CODES = [
  // Technology & Electronics (Chapter 84 & 85)
  { code: '8471', description: 'Automatic data processing machines, computers, servers & storage units', defaultGst: 18 },
  { code: '8473', description: 'Parts and accessories of computers, laptops and calculating machines', defaultGst: 18 },
  { code: '8517', description: 'Smartphones, telecom apparatus & networking routers/switches', defaultGst: 18 },
  { code: '8528', description: 'Monitors, projectors, flat-panel TVs and visual display equipment', defaultGst: 18 },
  { code: '8504', description: 'Electrical transformers, static converters (UPS, inverters) & inductors', defaultGst: 18 },
  { code: '8544', description: 'Insulated wires, optical cables and electrical conductors', defaultGst: 18 },
  { code: '8443', description: 'Printers, copiers, fax machines and multi-function printer units', defaultGst: 18 },
  { code: '8523', description: 'Discs, solid-state non-volatile storage cards, smart cards & media', defaultGst: 18 },
  { code: '8536', description: 'Electrical apparatus for switching, protecting circuits, plugs & sockets', defaultGst: 18 },

  // Services (SAC Chapter 99)
  { code: '9983', description: 'IT software development, cloud hosting, tech consulting & graphic design', defaultGst: 18 },
  { code: '9982', description: 'Legal, accounting, auditing, taxation and statutory bookkeeping services', defaultGst: 18 },
  { code: '9954', description: 'General construction, civil engineering and fitting-out services', defaultGst: 18 },
  { code: '9963', description: 'Restaurant, catering, food & beverage hospitality services', defaultGst: 5 },
  { code: '9965', description: 'Freight transportation, GTA road cargo & logistics supply chain services', defaultGst: 5 },
  { code: '9967', description: 'Cargo handling, storage & warehousing support services', defaultGst: 18 },
  { code: '9971', description: 'Financial, banking, insurance intermediation & credit rating services', defaultGst: 18 },
  { code: '9972', description: 'Real estate services involving commercial renting, leasing & brokerage', defaultGst: 18 },
  { code: '9984', description: 'Telecommunications, broadband, mobile telephony & satellite services', defaultGst: 18 },
  { code: '9985', description: 'Support services (security guards, office administration, call centers)', defaultGst: 18 },
  { code: '9986', description: 'Agricultural, mining, petroleum and utility support services', defaultGst: 18 },
  { code: '9987', description: 'Maintenance, repair and installation of machinery, computers & equipment', defaultGst: 18 },
  { code: '9991', description: 'Public administration and other government services', defaultGst: 18 },
  { code: '9992', description: 'Education, vocational training and coaching institution services', defaultGst: 18 },
  { code: '9993', description: 'Human healthcare, diagnostic pathology and social care services', defaultGst: 0 },
  { code: '9995', description: 'Membership organizations, trade unions & business association services', defaultGst: 18 },
  { code: '9996', description: 'Recreational, sports, amusement, cinema and cultural event services', defaultGst: 18 },

  // Manufacturing, Chemicals & Pharma (Chapter 28 - 40)
  { code: '3004', description: 'Medicaments and therapeutic pharmaceutical formulations', defaultGst: 12 },
  { code: '3006', description: 'Pharmaceutical goods (first-aid boxes, dental cements, sterile sutures)', defaultGst: 12 },
  { code: '3304', description: 'Beauty, cosmetic skincare preparations, sunscreens and makeup', defaultGst: 18 },
  { code: '3401', description: 'Soap, organic surface-active cleaning products and medicated bars', defaultGst: 18 },
  { code: '3402', description: 'Organic detergents, dishwashing bars, fabric wash solutions', defaultGst: 18 },
  { code: '3923', description: 'Articles for the conveyance or packing of goods, of plastics (boxes, bags)', defaultGst: 18 },
  { code: '3926', description: 'Other articles of plastics and polymers for industrial or domestic use', defaultGst: 18 },
  { code: '4011', description: 'New pneumatic rubber tyres for cars, trucks, motorcycles & cycles', defaultGst: 28 },

  // Paper, Stationery & Packaging (Chapter 48)
  { code: '4820', description: 'Registers, account books, notebooks, receipt books & stationery', defaultGst: 12 },
  { code: '4819', description: 'Cartons, boxes, cases and packaging containers of corrugated paper', defaultGst: 18 },
  { code: '4802', description: 'Uncoated writing or printing paper, photocopying paper reams', defaultGst: 12 },

  // Textiles, Garments & Apparel (Chapter 50 - 63)
  { code: '5208', description: 'Woven fabrics of cotton, containing 85% or more cotton', defaultGst: 5 },
  { code: '6109', description: 'T-shirts, singlets, polo shirts and vests, knitted or crocheted', defaultGst: 5 },
  { code: '6203', description: 'Men suits, formal blazers, trousers, overalls and shorts', defaultGst: 12 },
  { code: '6204', description: 'Women suits, dresses, skirts, trousers and formal wear', defaultGst: 12 },
  { code: '6403', description: 'Footwear with outer soles of rubber/plastic and leather uppers', defaultGst: 18 },
  { code: '6404', description: 'Footwear with outer soles of rubber/plastic and textile material uppers', defaultGst: 12 },

  // Food Products & FMCG (Chapter 01 - 24)
  { code: '0402', description: 'Milk and cream, concentrated, condensed or sweetened powders', defaultGst: 5 },
  { code: '0406', description: 'Cheese, paneer and curd products in retail containers', defaultGst: 5 },
  { code: '0901', description: 'Coffee beans, roasted, decaffeinated and coffee husks', defaultGst: 5 },
  { code: '0902', description: 'Tea, flavored or black/green packaged tea leaves', defaultGst: 5 },
  { code: '1006', description: 'Rice, semi-milled or wholly milled, polished or glazed (branded)', defaultGst: 5 },
  { code: '1101', description: 'Wheat or meslin flour (Atta / Maida in unit containers)', defaultGst: 5 },
  { code: '1507', description: 'Soybean oil, refined cooking oil and edible vegetable fractions', defaultGst: 5 },
  { code: '1905', description: 'Bread, pastry, cakes, sweet biscuits, wafers and bakery wares', defaultGst: 18 },
  { code: '2106', description: 'Food preparations not elsewhere specified (protein powder, health mixes)', defaultGst: 18 },
  { code: '2201', description: 'Packaged drinking waters, mineral water and aerated carbonated waters', defaultGst: 18 },

  // Metals, Construction & Furniture (Chapter 72 - 94)
  { code: '7214', description: 'Bars and rods of iron or non-alloy steel (TMT construction bars)', defaultGst: 18 },
  { code: '7308', description: 'Structures and parts of structures of iron or steel (bridges, roofing)', defaultGst: 18 },
  { code: '7604', description: 'Aluminum bars, architectural rods and profile sections', defaultGst: 18 },
  { code: '8708', description: 'Parts and accessories of motor vehicles and automotive assemblies', defaultGst: 28 },
  { code: '9403', description: 'Office and domestic furniture, workstations, cabinets and steel fixtures', defaultGst: 18 },
  { code: '9405', description: 'Lamps, LED lighting fittings, light fixtures and illuminated signs', defaultGst: 18 },
];

export const STANDARD_UNITS = [
  'PCS', 'NOS', 'BOX', 'KGS', 'GMS', 'LTR', 'ML', 'MTR', 'SQF', 'SQM', 'SET', 'PAC', 'BAG', 'DOZ', 'HRS', 'DAY', 'MON'
];

export const STATE_CODE_LIST = INDIAN_STATES;

export const HSN_MASTER_LIST = COMMON_HSN_CODES.map(item => ({
  code: item.code,
  description: item.description,
  gstRate: item.defaultGst
}));



const roles = {
  admin: ["super_admin", "admin"],
  write: ["super_admin", "admin", "manager", "accountant"],
  finance: ["super_admin", "admin", "manager", "accountant"],
  read: ["super_admin", "admin", "manager", "accountant"],
};

const f = (name, label, type = "text", extra = {}) => ({
  name,
  label,
  type,
  ...extra,
});
const select = (name, label, options, extra = {}) =>
  f(name, label, "select", {
    options: options.map((v) => ({
      label: String(v).replaceAll("_", " "),
      value: v,
    })),
    ...extra,
  });
const ref = (name, label, resource, extra = {}) =>
  f(name, label, "select", { ref: resource, ...extra });
const status = (extra = {}) =>
  select("status", "Status", ["active", "inactive"], {
    defaultValue: "active",
    ...extra,
  });

export const resources = {
  companies: {
    key: "companies",
    title: "Company Settings & Profile",
    singular: "Company",
    endpoint: "/companies",
    fields: [
      f("logo", "Logo", "file", { accept: "image/png,image/jpeg,image/webp" }),
      f("name", "Company Name", "text", { required: true }),
      f("code", "Company Code", "text", { required: true }),
      f("email", "Official Email", "email", {
        placeholder: "bhumicontainerservice@gmail.com",
      }),
      f("phone", "Official Phone / Helpline", "text", {
        placeholder: "+91 98840 08698",
      }),
      f("address", "Official Registered Address", "textarea", {
        placeholder:
          "Plot No 25, 1st Floor, Shree Ram Nagar, Second Street, Puzhal",
      }),
      f("city", "City", "text", { placeholder: "Chennai" }),
      f("state", "State", "text", { placeholder: "Tamil Nadu" }),
      f("gstNumber", "GST Number"),
      f("panNumber", "PAN Number"),
      status(),
    ],
    searchKeys: ["name", "code", "city", "gstNumber", "panNumber"],
    filterKeys: ["status"],
    roles: ["super_admin", "admin"],
    canCreate: ["super_admin"],
    canEdit: ["super_admin", "admin"],
    canDelete: ["super_admin"],
  },
  users: {
    key: "users",
    title: "Users",
    singular: "User",
    endpoint: "/users",
    fields: [
      f("name", "Name", "text", { required: true }),
      f("email", "Email", "email", { required: true }),
      f("phone", "Phone"),
      f("password", "Password", "password", {
        placeholder: "Leave blank to keep current password",
      }),
      f("profileImage", "Profile Image", "file", {
        accept: "image/png,image/jpeg,image/webp",
      }),
      select(
        "role",
        "Role",
        ["super_admin", "admin", "manager", "accountant"],
        { required: true },
      ),
      ref("companyId", "Company", "companies"),
      status(),
    ],
    searchKeys: ["name", "email", "role", "phone"],
    filterKeys: ["companyId", "role", "status"],
    roles: ["super_admin", "admin"],
    canCreate: ["super_admin", "admin"],
    canEdit: ["super_admin", "admin"],
    canDelete: ["super_admin", "admin"],
  },
  drivers: {
    key: "drivers",
    title: "Drivers",
    singular: "Driver",
    endpoint: "/drivers",
    fields: [
      f("name", "Full Name", "text", {
        required: true,
        placeholder: "Enter driver name",
      }),
      f("phone", "Mobile Number", "text", {
        required: true,
        placeholder: "10 digit mobile",
      }),
      f("alternatePhone", "Alternate Mobile", "text", {
        placeholder: "Alternate mobile number",
      }),
      ref("assignedVehicleId", "Assigned Vehicle", "vehicles", {
        placeholder: "-- Select Vehicle --",
      }),
      f("address", "Current Address", "textarea", {
        placeholder: "Current address...",
      }),
      // Identity & License
      f("licenseNumber", "License Number", "text", {
        section: "Identity & License",
        placeholder: "Enter license number",
      }),
      f("licenseExpiryDate", "License Expiry", "date"),
      f("aadhaarNumber", "Aadhar Number", "text", {
        placeholder: "12-digit Aadhar number",
      }),
      // Payroll & Employment
      f("monthlySalary", "Monthly Salary", "number", {
        required: true,
        section: "Payroll & Employment",
        placeholder: "0.00",
        defaultValue: 10000,
      }),
      select(
        "dutyStatus",
        "Duty Status",
        ["On Duty", "Off Duty", "On Leave", "Resigned"],
        { required: true, defaultValue: "On Duty" },
      ),
      f("dateOfJoining", "Joining Date", "date"),
      // Documents & Photos
      f("photo", "Photo", "file", {
        section: "Documents & Photos",
        accept: "image/*",
      }),
      f("licenseScan", "License Scan", "file", {
        accept: "application/pdf,image/*",
      }),
      f("aadharScan", "Aadhar Scan", "file", {
        accept: "application/pdf,image/*",
      }),
      f("notes", "Notes", "textarea", {
        placeholder: "Any background notes...",
      }),
    ],
    searchKeys: [
      "name",
      "phone",
      "alternatePhone",
      "licenseNumber",
      "aadhaarNumber",
    ],
    filterKeys: ["dutyStatus", "status"],
    roles: roles.read,
    canCreate: roles.write,
    canEdit: roles.write,
    canDelete: roles.write,
  },
  vehicles: {
    key: "vehicles",
    title: "Vehicles",
    singular: "Vehicle",
    endpoint: "/vehicles",
    fields: [
      select(
        "ownerType",
        "Vehicle Ownership",
        [
          { label: "🏢 Company Fleet (Own Truck)", value: "own" },
          { label: "🚚 Market Lorry (Broker Truck)", value: "market" },
        ],
        { defaultValue: "own" },
      ),
      f("vehicleNumber", "Vehicle Number", "text", {
        required: true,
        placeholder: "MH01AB1234",
      }),
      f("brokerName", "Broker / Transporter Name", "text", {
        placeholder: "e.g. SYNDIKET TRP",
      }),
      f("ownerPhone", "Broker / Owner Mobile", "text", {
        placeholder: "10-digit mobile number",
      }),
      f("vehicleName", "Vehicle Name", "text", {
        required: false,
        placeholder: "e.g. Tata 407",
      }),
      select(
        "vehicleType",
        "Vehicle Type",
        [
          "Truck",
          "Container",
          "Trailer",
          "Tanker",
          "Open Body",
          "Other Commercial",
        ],
        { required: true },
      ),
      f("model", "Model", "text", { placeholder: "e.g. 2022" }),
      f("chassisNumber", "Chassis Number", "text", {
        placeholder: "Chassis Number",
      }),
      f("engineNumber", "Engine Number", "text", {
        placeholder: "Engine Number",
      }),
      f("ownerName", "Owner Name", "text", { placeholder: "Owner Name" }),
      f("payloadCapacity", "Capacity (Ton)", "number", {
        placeholder: "Capacity in Tons",
      }),
      select("fuelType", "Fuel Type", [
        "Diesel",
        "Petrol",
        "CNG",
        "Electric",
        "Other",
      ]),
      // Document Expiry Dates
      f("insuranceExpiryDate", "Insurance Expiry", "date", {
        section: "Document Expiry Dates",
      }),
      f("pucExpiryDate", "PUC Expiry", "date"),
      f("permitExpiryDate", "Permit Expiry", "date"),
      f("fitnessExpiryDate", "Fitness Expiry", "date"),
      select("status", "Status", ["Active", "Inactive", "Under Maintenance"], {
        required: true,
        defaultValue: "Active",
      }),
      f("rcDocument", "RC Document", "file", {
        accept: "application/pdf,image/*",
        helperText: "PDF, JPG, PNG (max 5MB)",
      }),
      f("notes", "Notes", "textarea", { placeholder: "Any notes..." }),
    ],
    searchKeys: [
      "vehicleNumber",
      "vehicleName",
      "vehicleType",
      "model",
      "chassisNumber",
      "engineNumber",
      "ownerName",
      "brokerName",
      "ownerPhone",
    ],
    filterKeys: ["ownerType", "vehicleType", "fuelType", "status"],
    roles: roles.read,
    canCreate: roles.write,
    canEdit: roles.write,
    canDelete: roles.admin,
  },
  vendors: {
    key: "vendors",
    title: "Brokers",
    singular: "Broker",
    endpoint: "/vendors",
    fields: [
      f("vendorName", "Broker / Firm Name", "text", {
        required: true,
        placeholder: "e.g. Syndiket Trp / Tarun Logistics / Anshu Cargo",
      }),
      f("phone", "Broker Mobile", "text", {
        required: true,
        placeholder: "10-digit mobile number",
      }),
      f("city", "City / Base Hub", "text", {
        placeholder: "e.g. Chennai / Panvel / Bhiwandi",
      }),
      f("state", "State", "text", {
        placeholder: "e.g. Tamil Nadu / Maharashtra",
      }),
      f("address", "Office Address", "textarea", {
        placeholder: "Broker office or yard address...",
      }),
      status(),
      f("remarks", "Remarks / Notes", "textarea", {
        placeholder: "Broker notes and terms...",
      }),
    ],
    searchKeys: [
      "vendorCode",
      "vendorName",
      "vendorType",
      "phone",
      "city",
    ],
    filterKeys: ["vendorType", "status"],
    roles: roles.read,
    canCreate: roles.write,
    canEdit: roles.write,
    canDelete: roles.write,
  },
  fuels: {
    key: "fuels",
    title: "Fuel",
    singular: "Fuel Entry",
    endpoint: "/fuels",
    fields: [
      ref("vehicleId", "Vehicle", "vehicles", { required: true }),
      ref("driverId", "Driver", "drivers"),
      f("fuelDate", "Fuel Date", "date", { required: true }),
      select("fuelType", "Fuel Type", ["diesel", "petrol", "cng", "other"], {
        required: true,
      }),
      f("quantity", "Quantity (Liters)", "number", { required: true }),
      f("ratePerLiter", "Rate / Liter (₹)", "number", { required: true }),
      f("odometerReading", "Odometer Reading (KM)", "number", {
        hint: "Mileage (KM/L)",
        helperText: "Odometer reading at fuel station for KM/L fuel audit",
      }),
      f(
        "fuelStationVendor",
        "Petrol Pump / Station Name (पेट्रोल पंप)",
        "text",
        {
          hint: "e.g. Indian Oil / HPCL / BPCL / Reliance / Nayara",
          helperText: "Name of the petrol pump where fuel was filled",
        },
      ),
      ref("tripId", "Trip / Challan (रूट व ट्रिप)", "trips", {
        hint: "Optional link to current trip",
      }),
      f("receiptNumber", "Receipt / Slip Number (पर्ची नंबर)"),
      select("paymentMode", "Payment Mode (भुगतान माध्यम)", [
        "cash",
        "credit",
        "card",
        "upi",
        "company_account",
      ]),
      f("notes", "Notes (रिमार्क्स)", "textarea"),
    ],
    searchKeys: ["fuelType", "fuelStationVendor", "receiptNumber", "notes"],
    filterKeys: ["fuelType", "paymentMode"],
    roles: roles.read,
    canCreate: roles.write,
    canEdit: roles.write,
    canDelete: roles.write,
    dateKey: "fuelDate",
  },
  tyres: {
    key: "tyres",
    title: "Tyres",
    singular: "Tyre",
    endpoint: "/tyres",
    fields: [
      f("tyreNumber", "Tyre Number", "text", { required: true }),
      f("brand", "Brand", "text", { required: true }),
      f("tyreSize", "Tyre Size", "text", { required: true }),
      select("tyreType", "Tyre Type", ["new", "used", "retreaded"]),
      f("purchaseDate", "Purchase Date", "date"),
      f("purchasePrice", "Purchase Price", "number"),
      select("status", "Status", [
        "in_stock",
        "fitted",
        "removed",
        "repair",
        "retread",
        "scrapped",
      ]),
      ref("vehicleId", "Vehicle", "vehicles"),
      select("position", "Axle Position", [
        "front_left",
        "front_right",
        "rear_left",
        "rear_right",
        "rear_inner_left",
        "rear_outer_left",
        "rear_inner_right",
        "rear_outer_right",
        "spare",
      ]),
      f("fittingDate", "Fitting Date", "date"),
      f("fittingOdometer", "Fitting Odometer", "number"),
      f("remarks", "Remarks", "textarea"),
    ],
    searchKeys: ["tyreNumber", "brand", "tyreSize", "position"],
    filterKeys: ["tyreType", "status"],
    roles: roles.read,
    canCreate: roles.write,
    canEdit: roles.write,
    canDelete: roles.write,
    dateKey: "purchaseDate",
  },
  maintenances: {
    key: "maintenances",
    title: "Maintenance",
    singular: "Maintenance",
    endpoint: "/maintenances",
    fields: [
      ref("vehicleId", "Vehicle", "vehicles", { required: true }),
      f("maintenanceDate", "Maintenance Date", "date", { required: true }),
      f("odometerReading", "Odometer Reading (KM)", "number", {
        required: true,
        placeholder: "Current speedometer KM",
        helperText:
          "Mandatory: Enter vehicle speedometer reading at time of service",
      }),
      select(
        "serviceType",
        "Service Type",
        [
          "general_service",
          "engine_oil",
          "engine_service",
          "brake_service",
          "clutch_work",
          "battery",
          "suspension",
          "electrical",
          "body_work",
          "tyre_work",
          "repair",
          "other",
        ],
        { required: true },
      ),
      f("description", "Work Description", "textarea", {
        placeholder: "Describe the repairs, oil grade, parts replaced, etc.",
      }),
      f("partsCost", "Parts Cost (₹)", "number", { placeholder: "0" }),
      f("labourCost", "Labour / Mechanic Cost (₹)", "number", {
        placeholder: "0",
      }),
      f("totalCost", "Total Service Cost (₹)", "number", {
        autoCalculated: true,
        placeholder: "0",
        helperText: "Auto-calculated: Parts Cost + Labour Cost",
      }),
      f("nextServiceDate", "Next Due Service Date", "date"),
      f("nextServiceOdometer", "Next Service Odometer (KM)", "number", {
        placeholder: "e.g. Current Odometer + 10,000 KM",
      }),
      select("paymentMode", "Payment Mode", [
        "cash",
        "credit",
        "card",
        "upi",
        "company_account",
      ]),
      f("invoiceNumber", "Garage Bill / Memo No", "text", {
        placeholder: "e.g. Garage Bill / Invoice No (BILL-4821)",
        helperText: "External bill or cash memo number issued by the garage/workshop",
      }),
      select("status", "Status", ["completed", "pending", "cancelled"]),
      f("remarks", "Remarks", "textarea"),
    ],
    searchKeys: [
      "serviceType",
      "description",
      "invoiceNumber",
    ],
    filterKeys: ["serviceType", "paymentMode", "status"],
    roles: roles.read,
    canCreate: roles.write,
    canEdit: roles.write,
    canDelete: roles.write,
    dateKey: "maintenanceDate",
  },
  "vehicle-documents": {
    key: "vehicle-documents",
    title: "Vehicle Documents",
    singular: "Vehicle Document",
    endpoint: "/vehicle-documents",
    fields: [
      ref("vehicleId", "Vehicle", "vehicles", { required: true }),
      select(
        "documentType",
        "Document Type",
        [
          "rc",
          "insurance",
          "fitness",
          "permit",
          "puc",
          "national_permit",
          "other",
        ],
        { required: true },
      ),
      f("documentNumber", "Document Number", "text", { required: true }),
      f("issueDate", "Issue Date", "date"),
      f("expiryDate", "Expiry Date", "date", { required: true }),
      f("issuingAuthority", "Issuing Authority"),
      f("documentFile", "Document File", "file", {
        accept: "image/png,image/jpeg,image/webp,application/pdf",
      }),
      select("status", "Status", ["active", "expired", "cancelled"], {
        defaultValue: "active",
      }),
      f("remarks", "Remarks", "textarea"),
    ],
    searchKeys: ["documentNumber", "documentType", "issuingAuthority"],
    filterKeys: ["documentType", "status"],
    roles: roles.read,
    canCreate: roles.write,
    canEdit: roles.write,
    canDelete: roles.write,
    dateKey: "expiryDate",
  },
  "customer-invoices": {
    key: "customer-invoices",
    title: "Customer Hisab (Party AC)",
    singular: "Party AC Entry",
    endpoint: "/customer-invoices",
    fields: [
      f("invoiceDate", "DATE", "date", { required: true }),
      ref("vehicleId", "LORRY NO", "vehicles", { required: true }),
      f("customerName", "PARTY NAME", "text", {
        required: true,
        placeholder: "e.g. PCC LOGISTICS / RELIANCE / FASTWAY",
      }),
      f("containerSize", "SS", "text", { placeholder: "20F, 22F, 40F, 32S" }),
      f("fromLocation", "FROM", "text", {
        placeholder: "e.g. CHENNAI / SRICITY / PONDICHERY",
      }),
      f("toLocation", "TO", "text", {
        placeholder: "e.g. PUNE / BHIWANDI / MUMBAI",
      }),
      f("freightRate", "RATE (₹)", "number", {
        required: true,
        helperText: "Total agreed freight charges (₹)",
      }),
      f("advanceReceived", "ADV (₹)", "number", {
        helperText: "Advance freight received from customer",
      }),
      f("bankAccountName", "AC (Bank)", "text", {
        placeholder: "e.g. AXIS, PNB, UNION",
      }),
      f("advanceDate", "A DATE", "date"),
      f("munshiyanaML", "M.L (₹)", "number", {
        placeholder: "0",
        helperText: "Munshiyana / brokerage deduction",
      }),
      f("tdsAmount", "TDS (₹)", "number", { placeholder: "0" }),
      f("outstandingAmount", "BALANCE (₹)", "number", {
        readOnly: true,
        helperText: "Auto: RATE - ADV - M.L - TDS",
      }),
      f("hammali", "HIMAL (₹)", "number", { placeholder: "0" }),
      f("otherCharges", "EXTRA (₹)", "number", { placeholder: "0" }),
      f("paidAmount", "PAID (₹)", "number"),
      f("paymentDate", "P DATE", "date"),
      f("debitAmount", "DEBIT (₹)", "number", {
        placeholder: "0",
        advanced: true,
      }),
      f("kundi", "KUNDI (₹)", "number", { placeholder: "0", advanced: true }),
      f("invoiceNumber", "Bill / Invoice No", "text", {
        advanced: true,
        placeholder: "Auto-generated",
      }),
      select("paymentStatus", "Payment Status", ["unpaid", "partial", "paid"], {
        advanced: true,
      }),
      select("status", "Status", ["draft", "issued", "cancelled"], {
        advanced: true,
      }),
      f("remarks", "REMARK", "textarea", { advanced: true }),
    ],
    searchKeys: [
      "customerName",
      "fromLocation",
      "toLocation",
      "bankAccountName",
      "invoiceNumber",
    ],
    filterKeys: ["paymentStatus", "status"],
    roles: roles.read,
    canCreate: roles.write,
    canEdit: roles.write,
    canDelete: roles.finance,
    dateKey: "invoiceDate",
  },
  "vendor-bills": {
    key: "vendor-bills",
    title: "Market Lorry AC",
    singular: "Market Lorry Entry",
    endpoint: "/vendor-bills",
    fields: [
      f("billDate", "DATE", "date", { required: true }),
      ref("vehicleId", "LORRY NO", "vehicles", {
        required: true,
        placeholder: "Select Lorry No (or + Add)",
      }),
      f("partyName", "PARTY NAME", "text", {
        placeholder: "e.g. Western Carriers / Reliance / Maersk",
      }),
      ref("vendorId", "BROKER / OWNER", "vendors", {
        required: true,
        placeholder: "Select Broker / Owner (or SELF)",
      }),
      f("containerSize", "CC", "text", { placeholder: "20F, 32S, 40F" }),
      f("fromLocation", "FROM", "text", {
        placeholder: "e.g. Chennai Port / Sricity",
      }),
      f("toLocation", "TO", "text", {
        placeholder: "e.g. Bhiwandi / Jalgaon / Pune",
      }),
      f("deliveryDate", "DELIVERY", "date"),
      f("podDate", "POD", "text", {
        placeholder: "e.g. 21/01/2026 or Delivered",
      }),
      f("hireRate", "RATE (₹)", "number", {
        required: true,
        helperText: "Market Lorry Total Freight Rate (₹)",
      }),
      f("advanceDiesel", "ADV DIESEL (₹)", "number", {
        helperText: "Diesel Slip / Fuel Amount (e.g. 12000)",
      }),
      f("advanceCash", "ADV CASH (₹)", "number", {
        helperText: "Cash / Bank Advance (e.g. 15700)",
      }),
      f("paidAmount", "ADV (₹)", "number", {
        helperText: "Total Advance = Diesel + Cash (Auto or Direct)",
      }),
      f("advanceDate", "ADV DATI", "date"),
      f("outstandingAmount", "BALANCE (₹)", "number", {
        readOnly: true,
        helperText: "Auto: RATE - ADV",
      }),
      f("billNumber", "Bill / Voucher No", "text", {
        advanced: true,
        placeholder: "Auto-generated",
      }),
      select("paymentStatus", "Payment Status", ["unpaid", "partial", "paid"], {
        advanced: true,
      }),
      select("status", "Bill Status", ["draft", "issued", "cancelled"], {
        advanced: true,
      }),
      f("remarks", "REMARKS", "textarea", { advanced: true }),
    ],
    searchKeys: [
      "vehicleNumber",
      "partyName",
      "containerSize",
      "fromLocation",
      "toLocation",
      "billNumber",
    ],
    filterKeys: ["paymentStatus", "status"],
    roles: roles.read,
    canCreate: roles.write,
    canEdit: roles.write,
    canDelete: roles.finance,
    dateKey: "billDate",
  },
  expenses: {
    key: "expenses",
    title: "Driver Expenses",
    singular: "Driver Expense",
    endpoint: "/expenses",
    fields: [
      f("expenseNumber", "Expense Number", "text", { required: true }),
      f("expenseDate", "Expense Date", "date", { required: true }),
      ref("driverId", "Driver (Search / Select)", "drivers", {
        required: true,
      }),
      ref("vehicleId", "Vehicle / Truck Number", "vehicles", {
        required: true,
      }),
      ref("tripId", "Trip Number (Optional)", "trips"),
      select(
        "category",
        "Expense Category",
        [
          "diesel",
          "toll",
          "driver_bata",
          "urea",
          "rto_police",
          "loading_hammali",
          "weighbridge",
          "puncture_repair",
          "parking",
          "enroute_maintenance",
          "driver_advance",
          "office_rent",
          "tea_refreshment",
          "miscellaneous",
          "other",
        ],
        { required: true },
      ),
      f("amount", "Expense Amount (₹)", "number", { required: true }),
      select(
        "paymentMode",
        "Paid Via",
        [
          "cash",
          "upi",
          "bank_transfer",
          "driver_advance_adjusted",
          "fuel_card",
          "cheque",
          "other",
        ],
        { required: true },
      ),
      f("description", "Description / Kharcha Details", "textarea"),
      f("receiptNumber", "Bill / Slip / Receipt No."),
      f("vendorName", "Pump / Dhabha / Broker Name"),
      f("attachment", "Attachment / Bill Photo"),
      select("status", "Status", ["active", "cancelled"], {
        defaultValue: "active",
      }),
      f("remarks", "Remarks", "textarea"),
    ],
    searchKeys: [
      "expenseNumber",
      "category",
      "description",
      "referenceNumber",
      "vendorName",
      "receiptNumber",
    ],
    filterKeys: ["category", "paymentMode", "status"],
    roles: roles.finance,
    canCreate: roles.finance,
    canEdit: roles.finance,
    canDelete: roles.finance,
    dateKey: "expenseDate",
  },
  trips: {
    key: "trips",
    title: "Trips",
    singular: "Trip",
    endpoint: "/trips",
    fields: [
      f("tripNumber", "Trip / Challan Number", "text", { required: true }),
      f("containerNumber", "Container Number", "text", {
        placeholder: "e.g. MSKU-582194-0",
        helperText: "Assigned marine container number",
      }),
      select("containerSize", "Container Size / Type (साइज)", [
        "20_ft",
        "40_ft",
        "40_ft_hc",
        "45_ft",
        "open_top",
        "flat_rack",
        "other",
      ]),
      f("customsSealNumber", "Customs Bottle Seal No", "text", {
        placeholder: "e.g. BOTTLE-892184",
      }),
      f("shippingLine", "Shipping Line / Carrier", "text", {
        placeholder: "e.g. Maersk / MSC / Hapag",
      }),
      ref("vehicleId", "Vehicle / Truck No. (गाड़ी नंबर)", "vehicles", {
        required: true,
      }),
      ref("driverId", "Driver Name & Mobile (ड्राइवर नाम)", "drivers", {
        required: true,
      }),
      f("dispatchDate", "Dispatch / Loading Date (रवानगी तारीख)", "date", {
        required: true,
      }),
      f("transitDays", "Transit Duration (Days / सफ़र के दिन)", "number", {
        placeholder: "e.g. 2, 3, 5 days",
      }),
      f(
        "expectedDeliveryDate",
        "Expected Delivery Date (संभावित पहुँच तारीख)",
        "date",
      ),
      f("fromCity", "Loading Point / From (कहाँ से / लोडिंग पॉइंट)", "text", {
        required: true,
        placeholder: "e.g. Chennai Port / Puzhal Yard / Mumbai",
      }),
      f("toCity", "Unloading Point / To (कहाँ तक / अनलोडिंग पॉइंट)", "text", {
        required: true,
        placeholder: "e.g. Sri City / Bangalore / Pune",
      }),
      f("tripStartDate", "Trip Start", "date", { advanced: true }),
      f("deliveryDate", "Delivery Date", "date", { advanced: true }),
      f("startingOdometer", "Starting Odometer", "number", { advanced: true }),
      f("endingOdometer", "Ending Odometer", "number", { advanced: true }),
      f("partyName", "Customer / Party Name (पार्टी का नाम)", "text", {
        placeholder: "e.g. V-Trans / TCI Freight",
      }),
      select("ownerType", "Lorry Ownership (गाड़ी का प्रकार)", [
        "owned",
        "market",
      ]),
      f("ownerName", "Lorry Owner / Transporter Name", "text", {
        placeholder: "e.g. BHUMI CONTAINER SERVICE / Transporter",
      }),
      f("rate", "Total Trip Freight / भाड़ा (₹)", "number", {
        placeholder: "0",
      }),
      f("advanceAmount", "Advance Paid to Driver (एडवांस ₹)", "number", {
        placeholder: "0",
      }),
      f("advanceDate", "Advance Payment Date (एडवांस तारीख)", "date", {
        advanced: true,
      }),
      f("balanceAmount", "Balance Freight Payable (बाकी भाड़ा ₹)", "number", {
        placeholder: "0",
      }),
      f("podDate", "POD / Bilty Date (पावती तारीख)", "date", {
        advanced: true,
      }),
      select(
        "status",
        "Status",
        [
          "planned",
          "dispatched",
          "in_transit",
          "delivered",
          "completed",
          "cancelled",
        ],
        { advanced: true },
      ),
    ],
    searchKeys: [
      "tripNumber",
      "containerNumber",
      "customsSealNumber",
      "shippingLine",
      "fromCity",
      "toCity",
      "status",
    ],
    filterKeys: ["status"],
    roles: ["super_admin", "admin", "manager", "accountant", "driver"],
    canCreate: ["super_admin", "admin", "manager"],
    canEdit: ["super_admin", "admin", "manager"],
    canDelete: ["super_admin", "admin", "manager"],
    dateKey: "dispatchDate",
    rowActions: [
      {
        label: "Lorry Settlement",
        icon: "Banknote",
        hrefTemplate:
          "/driver-trip-settlements?autoOpenAdd=true&tripId={_id}&vehicleId={vehicleId}&driverId={driverId}",
      },
    ],
  },

  "driver-trip-settlements": {
    key: "driver-trip-settlements",
    title: "Company Lorry Hisab",
    singular: "Company Lorry Entry",
    endpoint: "/driver-trip-settlements",
    fields: [
      f("settlementDate", "DATE", "date", { required: true }),
      ref("vehicleId", "LORRY NO", "vehicles", { required: true }),
      f("driverPhone", "DRIVER NO", "text", {
        placeholder: "Driver mobile number",
      }),
      ref("driverId", "DRIVER NAME", "drivers", { required: true }),
      f("partyName", "PARTY NAME", "text", {
        placeholder: "e.g. TCI SRICITY / VANAYA TRP",
      }),
      f("containerSize", "MC", "text", { placeholder: "22F, 20F, 40F, 32S" }),
      f("fromLocation", "FROM", "text", {
        placeholder: "e.g. BHIWANDI / SRICITY",
      }),
      f("toLocation", "TO", "text", {
        placeholder: "e.g. PONDICHERY / AHMADABAD",
      }),
      f("deliveryDate", "DELIVERY", "date"),
      f("podDate", "POD", "text", {
        placeholder: "e.g. 22/08/2026 or Delivered",
      }),
      f("startKm", "SKM", "number", {
        placeholder: "0",
        helperText: "Starting odometer KM",
      }),
      f("returnKm", "RKM", "number", {
        placeholder: "0",
        helperText: "Return odometer KM",
      }),
      f("totalKm", "TKM", "number", {
        readOnly: true,
        helperText: "Auto: RKM - SKM",
      }),
      f("rs", "RS", "number", {
        placeholder: "0",
        helperText: "Rate per KM / RS",
      }),
      f("advanceGiven", "ADV (₹)", "number", {
        required: true,
        placeholder: "0",
        helperText: "Advance given to lorry/driver",
      }),
      f("advanceDate", "ADV DATE", "date"),
      f("dieselExpense", "DISAL (₹)", "number", {
        placeholder: "0",
        helperText: "Diesel expense",
      }),
      f("dieselDate", "DISAL DATE", "date"),
      f("tollExpense", "TOLL (₹)", "number", {
        placeholder: "0",
        helperText: "Toll charges",
      }),
      f("tollDate", "TOLL DATE", "date"),
      f("accountAdvance", "AC (₹)", "number", {
        placeholder: "0",
        helperText: "Driver A/C / Daily Allowance",
      }),
      f("acDate", "AC DATE", "date"),
      f("totalDriverExpenditure", "TOTAL (₹)", "number", {
        readOnly: true,
        helperText: "Auto: DISAL + TOLL + AC",
      }),
      f("netPayableToDriver", "BALANCE (₹)", "number", {
        readOnly: true,
        helperText: "Auto: ADV - TOTAL",
      }),
      f("ureaExpense", "URIY/ (₹)", "number", {
        placeholder: "0",
        helperText: "Urea expense",
      }),
      f("policeRTOExpense", "RTO (₹)", "number", {
        placeholder: "0",
        helperText: "RTO / Border expense",
      }),
      f("extraExpense", "EXTRA (₹)", "number", {
        placeholder: "0",
        helperText: "Extra / repair expense",
      }),
      f("extraDate", "EXTRA DATE", "date"),
      f("finalAmount", "FINAL (₹)", "number", {
        readOnly: true,
        helperText: "Auto: TOTAL + EXTRA",
      }),
      ref("tripId", "TRIP NO", "trips", { advanced: true }),
      select(
        "settlementStatus",
        "STATUS / OK",
        ["draft", "verified", "paid_settled"],
        { advanced: true },
      ),
      select(
        "paymentMode",
        "Settlement Mode",
        ["cash", "upi", "bank_transfer", "adjusted"],
        { advanced: true },
      ),
      f("remarks", "REMARK", "textarea", { advanced: true }),
    ],
    searchKeys: ["voucherNumber", "partyName", "fromLocation", "toLocation"],
    filterKeys: ["settlementStatus", "paymentMode"],
    roles: roles.read,
    canCreate: roles.write,
    canEdit: roles.write,
    canDelete: roles.admin,
    dateKey: "settlementDate",
  },
};

export const groups = [
  {
    label: "Core Operations (मुख्य हिसाब)",
    items: [
      ["dashboard", "Dashboard", "LayoutDashboard"],
      ["advance-memos", "Advance Memo", "FileText"],
      ["trips", "Trip (Total Lorry)", "Route"],
      ["driver-trip-settlements", "Company Lorry Hisab", "Banknote"],
      ["vendor-bills", "Market Lorry AC", "Building2"],
      ["customer-invoices", "Customer Hisab (Party AC)", "ReceiptText"],
    ],
  },
  {
    label: "Fleet & Garage (गाड़ी व ड्राइवर)",
    items: [
      ["vehicles", "Vehicles", "Truck"],
      ["drivers", "Drivers", "User"],
      ["fuels", "Fuel", "Fuel"],
      ["tyres", "Tyre Management", "CircleDot"],
      ["maintenances", "Maintenance", "Wrench"],
    ],
  },
  {
    label: "Accounts & Reports (खर्चा व रिपोर्ट)",
    items: [
      ["expenses", "Driver Expenses", "ReceiptIndianRupee"],
      ["loans", "Loans & EMI", "Landmark"],
      ["profit-loss", "P & L (Profit & Loss)", "TrendingUp"],
      ["reports", "Reports", "FileBarChart2"],
      ["settings", "Company Profile & Bank", "SlidersHorizontal"],
    ],
  },
];

export const reportConfigs = [
  {
    key: "profit",
    title: "Profit & Loss (P&L)",
    group: "Accounts",
    endpoint: "/accounts/profit-loss",
    kind: "table",
  },
  {
    key: "accounts-dashboard",
    title: "Accounts Dashboard",
    group: "Accounts",
    endpoint: "/accounts/dashboard",
    kind: "kpi",
  },
  {
    key: "customer-outstanding",
    title: "Customer Outstanding",
    group: "Accounts",
    endpoint: "/accounts/customer-outstanding",
    kind: "table",
  },
  {
    key: "vendor-outstanding",
    title: "Broker Outstanding",
    group: "Accounts",
    endpoint: "/accounts/vendor-outstanding",
    kind: "table",
  },
  {
    key: "account-expenses",
    title: "Accounts Expenses",
    group: "Accounts",
    endpoint: "/accounts/expenses",
    kind: "table",
  },
  {
    key: "trip-dashboard",
    title: "Trip Dashboard",
    group: "Operations",
    endpoint: "/trip-reports/dashboard",
    kind: "kpi",
  },
  {
    key: "trip-profitability",
    title: "Trip Profitability",
    group: "Operations",
    endpoint: "/trip-reports/profitability",
    kind: "table",
  },
  {
    key: "vehicle-report",
    title: "Vehicle Report",
    group: "Operations",
    endpoint: "/trip-reports/vehicles",
    kind: "table",
  },
  {
    key: "driver-report",
    title: "Driver Report",
    group: "Operations",
    endpoint: "/driver-reports",
    kind: "table",
  },
  {
    key: "fuel-report",
    title: "Fuel Report",
    group: "Fleet",
    endpoint: "/fuel-reports",
    kind: "table",
  },
  {
    key: "fuel-efficiency",
    title: "Vehicle Fuel Efficiency",
    group: "Fleet",
    endpoint: "/fuel-reports/vehicle-efficiency",
    kind: "table",
  },
  {
    key: "maintenance-report",
    title: "Maintenance Report",
    group: "Fleet",
    endpoint: "/maintenance-reports",
    kind: "table",
  },
  {
    key: "vehicle-maintenance",
    title: "Vehicle Maintenance",
    group: "Fleet",
    endpoint: "/maintenance-reports/vehicle-maintenance",
    kind: "table",
  },
  {
    key: "tyre-report",
    title: "Tyre Report",
    group: "Fleet",
    endpoint: "/tyre-reports",
    kind: "table",
  },
  {
    key: "vehicle-tyres",
    title: "Vehicle Tyres",
    group: "Fleet",
    endpoint: "/tyre-reports/vehicle-tyres",
    kind: "table",
  },
  {
    key: "expense-report",
    title: "Expense Report",
    group: "Expenses",
    endpoint: "/expense-reports",
    kind: "table",
  },
  {
    key: "expense-categories",
    title: "Expense Categories",
    group: "Expenses",
    endpoint: "/expense-reports/categories",
    kind: "table",
  },
];

const roles = {
  admin: ["super_admin"],
  operations: ["super_admin"],
  write: ["super_admin"],
  finance: ["super_admin", "accountant"],
  read: ["super_admin", "accountant"],
};

const f = (name, label, type = "text", extra = {}) => ({
  name,
  label,
  type,
  ...extra,
});
const select = (name, label, options, extra = {}) =>
  f(name, label, "select", {
    options: options.map((v) =>
      typeof v === "object" && v !== null && v.value
        ? v
        : {
            label: String(v).replaceAll("_", " "),
            value: v,
          },
    ),
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
    title: "Staff & User Accounts",
    singular: "User / Staff",
    endpoint: "/users",
    fields: [
      f("name", "Full Name", "text", {
        required: true,
        placeholder: "e.g. Ramesh Kumar",
      }),
      f("email", "Email Address", "email", {
        required: true,
        placeholder: "e.g. accountant@bhumicontainer.com",
      }),
      f("phone", "Mobile Number", "text", {
        placeholder: "10-digit mobile number",
      }),
      f("password", "Login Password", "password", {
        placeholder: "Enter login password (minimum 6 characters)",
      }),
      f("profileImage", "Profile Image", "file", {
        accept: "image/png,image/jpeg,image/webp",
      }),
      select(
        "role",
        "Role / Designation",
        [
          {
            value: "accountant",
            label: "Accountant (Finance & Billing)",
          },
          {
            value: "super_admin",
            label: "Super Admin (Full Access)",
          },
        ],
        { required: true },
      ),
      ref("companyId", "Company", "companies"),
      status(),
    ],
    searchKeys: ["name", "email", "role", "phone"],
    filterKeys: ["companyId", "role", "status"],
    roles: ["super_admin"],
    canCreate: ["super_admin"],
    canEdit: ["super_admin"],
    canDelete: ["super_admin"],
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
      // Document & Compliance Expiry Dates
      f("rcNumber", "RC Number", "text", {
        section: "Compliance & Document Details",
        placeholder: "e.g. MH04EB1234",
      }),
      f("rcExpiryDate", "RC Expiry Date", "date"),
      f("rcDocument", "RC Book Scan / Copy", "file", {
        accept: "application/pdf,image/*",
        helperText: "Upload RC scan (PDF, JPG, PNG)",
      }),
      f("insuranceCompany", "Insurance Company", "text", {
        placeholder: "e.g. New India Assurance",
      }),
      f("insurancePolicyNumber", "Insurance Policy No", "text", {
        placeholder: "Policy No",
      }),
      f("insuranceExpiryDate", "Insurance Expiry", "date"),
      f("insuranceDocument", "Insurance Policy Scan", "file", {
        accept: "application/pdf,image/*",
        helperText: "Upload Insurance copy",
      }),
      f("fitnessNumber", "Fitness Certificate No", "text", {
        placeholder: "Fitness No",
      }),
      f("fitnessExpiryDate", "Fitness Expiry", "date"),
      f("fitnessDocument", "Fitness Certificate Scan", "file", {
        accept: "application/pdf,image/*",
        helperText: "Upload Fitness copy",
      }),
      f("permitNumber", "Permit Number", "text", {
        placeholder: "Permit No",
      }),
      f("permitExpiryDate", "Permit Expiry", "date"),
      f("permitDocument", "Permit Copy Scan", "file", {
        accept: "application/pdf,image/*",
        helperText: "Upload Permit copy",
      }),
      f("pucNumber", "PUC Certificate No", "text", {
        placeholder: "PUC No",
      }),
      f("pucExpiryDate", "PUC Expiry", "date"),
      f("pucDocument", "PUC Certificate Scan", "file", {
        accept: "application/pdf,image/*",
        helperText: "Upload PUC copy",
      }),
      f("roadTaxExpiryDate", "Road Tax Expiry", "date"),
      f("roadTaxDocument", "Road Tax Receipt Scan", "file", {
        accept: "application/pdf,image/*",
        helperText: "Upload Tax receipt",
      }),
      select("status", "Status", ["Active", "Inactive", "Under Maintenance"], {
        required: true,
        defaultValue: "Active",
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
  customers: {
    key: "customers",
    title: "Customer Master",
    singular: "Customer / Party",
    endpoint: "/customers",
    fields: [
      f("customerCode", "Party Code", "text", {
        placeholder: "Auto-generated (e.g. CUST-001)",
        helperText: "Leave blank for auto-numbering",
      }),
      f("name", "Party / Customer Name", "text", {
        required: true,
        placeholder: "e.g. V-Trans / Western Carriers / Reliance Industries",
      }),
      f("contactPerson", "Key Contact Person", "text", {
        placeholder: "e.g. Mr. Rajesh Sharma (Logistics Head)",
      }),
      f("phone", "Primary Mobile", "text", {
        required: true,
        placeholder: "10-digit mobile number for WhatsApp & calls",
      }),
      f("alternatePhone", "Alternate Mobile / Phone", "text", {
        placeholder: "Office landline or alternate contact",
      }),
      f("email", "Billing Email", "email", {
        placeholder: "accounts@clientcompany.com",
      }),
      f("city", "City / Base Hub", "text", {
        required: true,
        placeholder: "e.g. Chennai / Mumbai / Indore / Vapi",
      }),
      f("state", "State", "text", {
        placeholder: "e.g. Tamil Nadu / Maharashtra / Gujarat",
      }),
      f("address", "Registered Address / Yard", "textarea", {
        placeholder: "Office / Plant address for billing and bilty...",
      }),
      f("pincode", "PIN Code", "text", {
        placeholder: "6-digit PIN code",
      }),
      f("gstNumber", "GSTIN (GST Number)", "text", {
        placeholder: "15-digit GSTIN (e.g. 33AAAAA0000A1Z5)",
      }),
      f("panNumber", "PAN Number", "text", {
        placeholder: "10-digit PAN (e.g. AAAAA0000A)",
      }),
      select(
        "paymentTerms",
        "Payment Terms",
        [
          { label: "Immediate Payment", value: "immediate" },
          { label: "15 Days Credit", value: "credit_15" },
          { label: "30 Days Credit (Standard)", value: "credit_30" },
          { label: "45 Days Credit", value: "credit_45" },
          { label: "60 Days Credit", value: "credit_60" },
          { label: "Against Original POD (Receiving)", value: "against_pod" },
          { label: "Advance Payment Required", value: "advance" },
          { label: "Other / Custom Agreement", value: "other" },
        ],
        { defaultValue: "credit_30" }
      ),
      f("creditDays", "Credit Period (Days)", "number", {
        defaultValue: 30,
        placeholder: "e.g. 30",
        helperText: "Number of credit days allowed for invoice payment",
      }),
      f("creditLimit", "Credit Limit (₹)", "number", {
        placeholder: "e.g. 5,00,000",
        helperText: "Maximum unpaid exposure limit (₹)",
      }),
      f("openingBalance", "Opening Balance (₹)", "number", {
        placeholder: "0",
        helperText: "Balance outstanding at onboarding time",
        advanced: true,
      }),
      select(
        "balanceType",
        "Balance Type",
        [
          { label: "Debit (Party Owes Us)", value: "debit" },
          { label: "Credit (Advance Received)", value: "credit" },
        ],
        {
          defaultValue: "debit",
          advanced: true,
        }
      ),
      f("bankName", "Bank Name", "text", {
        placeholder: "e.g. HDFC Bank, ICICI, SBI",
        advanced: true,
      }),
      f("accountNumber", "Bank Account No", "text", {
        placeholder: "Customer account number",
        advanced: true,
      }),
      f("ifscCode", "IFSC Code", "text", {
        placeholder: "Bank IFSC code",
        advanced: true,
      }),
      status(),
      f("notes", "Remarks & Instructions", "textarea", {
        placeholder: "Delivery guidelines, container preferences, reporting requirements...",
      }),
    ],
    searchKeys: [
      "customerCode",
      "name",
      "contactPerson",
      "phone",
      "city",
      "state",
      "gstNumber",
    ],
    filterKeys: ["status", "paymentTerms", "city", "state"],
    roles: roles.read,
    canCreate: roles.write,
    canEdit: roles.write,
    canDelete: roles.write,
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
        "Fuel Station / Vendor Name",
        "text",
        {
          hint: "e.g. Indian Oil / HPCL / BPCL / Reliance / Nayara",
          helperText: "Name of the fuel pump / station where fuel was filled",
        },
      ),
      ref("tripId", "Trip / Challan", "trips", {
        hint: "Optional link to current trip",
      }),
      f("receiptNumber", "Receipt / Voucher Number"),
      select("paymentMode", "Payment Mode", [
        "cash",
        "credit",
        "card",
        "upi",
        "company_account",
      ]),
      f("notes", "Notes / Remarks", "textarea"),
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
      ref("vehicleId", "Vehicle / Truck", "vehicles", { required: true }),
      f("truckNumber", "Vehicle / Lorry No", "text", {
        placeholder: "Auto-synced from selected Vehicle",
      }),
      f("brokerName", "Broker / Transporter Name", "text", {
        placeholder: "Broker name (for Market Lorry)",
      }),
      select(
        "documentType",
        "Document Type",
        [
          { label: "RC Book (Registration Certificate)", value: "rc" },
          { label: "Commercial Vehicle Insurance", value: "insurance" },
          { label: "Fitness Certificate", value: "fitness" },
          { label: "Permit (National / State)", value: "permit" },
          { label: "National Permit (All India)", value: "national_permit" },
          { label: "PUC (Pollution Certificate)", value: "puc" },
          { label: "Driver License (DL Copy)", value: "driver_license" },
          { label: "Broker / Owner PAN Card", value: "pan_card" },
          { label: "TDS 194C Exemption Declaration", value: "tds_declaration" },
          { label: "Bank Details / Passbook / Cheque", value: "bank_passbook" },
          { label: "Other Document", value: "other" },
        ],
        { required: true },
      ),
      f("documentNumber", "Document Number", "text", { required: true }),
      f("issueDate", "Issue Date", "date"),
      f("expiryDate", "Expiry Date", "date", { required: true }),
      f("issuingAuthority", "Issuing Authority"),
      f("documentFile", "Document File (Scan / Photo)", "file", {
        accept: "image/png,image/jpeg,image/webp,application/pdf",
        helperText: "Upload RC, DL, Insurance, or Permit scan",
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
    title: "Party Account",
    singular: "Party Account Entry",
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
        helperText: "Brokerage / commission deduction",
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
    roles: roles.finance,
    canCreate: roles.finance,
    canEdit: roles.finance,
    canDelete: roles.admin,
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
      f("rcDocument", "RC BOOK / SCAN", "file", {
        accept: "image/*,application/pdf",
        advanced: true,
        helperText: "Upload Market Lorry RC copy",
      }),
      f("driverLicenseDoc", "DRIVER DL SCAN", "file", {
        accept: "image/*,application/pdf",
        advanced: true,
        helperText: "Upload Driver License copy",
      }),
      f("tdsDeclaration", "TDS 194C / PAN", "file", {
        accept: "image/*,application/pdf",
        advanced: true,
        helperText: "TDS Exemption Declaration / PAN Card",
      }),
      f("insuranceDoc", "INSURANCE SCAN", "file", {
        accept: "image/*,application/pdf",
        advanced: true,
        helperText: "Vehicle Insurance Policy copy",
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
    roles: roles.finance,
    canCreate: roles.finance,
    canEdit: roles.finance,
    canDelete: roles.admin,
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
      f("description", "Description / Expense Details", "textarea"),
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
  "office-expenses": {
    key: "office-expenses",
    title: "Office Expenses",
    singular: "Office Expense",
    endpoint: "/office-expenses",
    fields: [
      f("expenseNumber", "Voucher / Expense No.", "text", { required: true }),
      f("expenseDate", "Expense Date", "date", { required: true }),
      f("staffName", "Staff / Person Name", "text", {
        placeholder: "e.g. Ramesh Bhai, Staff Clerk, Landlord",
      }),
      f("department", "Department / Role", "text", {
        placeholder: "e.g. Administration, Accounts, Pantry, Operations",
      }),
      f("paidTo", "Paid To / Beneficiary", "text", {
        placeholder: "Person, Landlord, Vendor or Shop name",
      }),
      select(
        "category",
        "Expense Category",
        [
          "salary",
          "staff_advance",
          "tea_refreshment",
          "pantry_kitchen",
          "office_rent",
          "electricity",
          "internet",
          "telephone",
          "stationery",
          "office_maintenance",
          "courier_postage",
          "software_subscription",
          "audit_accounting",
          "travel",
          "advertisement",
          "bank_charges",
          "legal",
          "tax",
          "miscellaneous",
          "other",
        ],
        { required: true },
      ),
      f("amount", "Amount (₹)", "number", { required: true }),
      select(
        "paymentMode",
        "Paid Via",
        ["cash", "upi", "bank_transfer", "cheque", "other"],
        { required: true },
      ),
      f("referenceNumber", "UPI Ref / Transaction / Cheque No."),
      f("receiptNumber", "Bill / Cash Memo / Voucher No."),
      f("description", "Description / Purpose", "textarea"),
      f("vendorName", "Shop / Vendor Name"),
      f("attachment", "Attachment / Bill Photo"),
      select("status", "Status", ["active", "cancelled"], {
        defaultValue: "active",
      }),
      f("remarks", "Remarks", "textarea"),
    ],
    searchKeys: [
      "expenseNumber",
      "staffName",
      "paidTo",
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
      select("containerSize", "Container Size / Type", [
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
      ref("vehicleId", "Vehicle / Truck Number", "vehicles", {
        required: true,
      }),
      ref("driverId", "Driver Name & Mobile", "drivers", {
        required: true,
      }),
      f("dispatchDate", "Dispatch / Loading Date", "date", {
        required: true,
      }),
      f("transitDays", "Transit Duration (Days)", "number", {
        placeholder: "e.g. 2, 3, 5 days",
      }),
      f(
        "expectedDeliveryDate",
        "Expected Delivery Date",
        "date",
      ),
      f("fromCity", "Loading Point / Origin", "text", {
        required: true,
        placeholder: "e.g. Chennai Port / Puzhal Yard / Mumbai",
      }),
      f("toCity", "Unloading Point / Destination", "text", {
        required: true,
        placeholder: "e.g. Sri City / Bangalore / Pune",
      }),
      f("tripStartDate", "Trip Start", "date", { advanced: true }),
      f("deliveryDate", "Delivery Date", "date", { advanced: true }),
      f("startingOdometer", "Starting Odometer", "number", { advanced: true }),
      f("endingOdometer", "Ending Odometer", "number", { advanced: true }),
      f("partyName", "Customer / Party Name", "text", {
        placeholder: "e.g. V-Trans / TCI Freight",
      }),
      select("ownerType", "Vehicle Ownership", [
        "owned",
        "market",
      ]),
      f("ownerName", "Lorry Owner / Transporter Name", "text", {
        placeholder: "e.g. BHUMI CONTAINER SERVICE / Transporter",
      }),
      f("rate", "Total Trip Freight (₹)", "number", {
        placeholder: "0",
      }),
      f("advanceAmount", "Advance Paid to Driver (₹)", "number", {
        placeholder: "0",
      }),
      f("advanceDate", "Advance Payment Date", "date", {
        advanced: true,
      }),
      f("balanceAmount", "Balance Freight Payable (₹)", "number", {
        placeholder: "0",
      }),
      f("podDate", "POD / Delivery Date", "date", {
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
    title: "Company Lorry Settlement",
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
    roles: roles.finance,
    canCreate: roles.finance,
    canEdit: roles.finance,
    canDelete: roles.admin,
    dateKey: "settlementDate",
  },
};

export const groups = [
  {
    label: "Core Operations",
    items: [
      ["dashboard", "Dashboard", "LayoutDashboard"],
      ["customers", "Customer Master", "Users"],
      ["advance-memos", "Advance Memo", "FileText"],
      ["trips", "Trip (Total Lorry)", "Route"],
      ["driver-trip-settlements", "Company Lorry Settlement", "Banknote"],
      ["vendor-bills", "Market Lorry Account", "Building2"],
      ["customer-invoices", "Party Account", "ReceiptText"],
    ],
  },
  {
    label: "Fleet & Garage",
    items: [
      ["vehicles", "Vehicles", "Truck"],
      ["drivers", "Drivers", "User"],
      ["fuels", "Fuel", "Fuel"],
      ["tyres", "Tyre Management", "CircleDot"],
      ["maintenances", "Maintenance", "Wrench"],
    ],
  },
  {
    label: "Accounts & Reports",
    items: [
      ["office-expenses", "Office Expenses", "Building2"],
      ["expenses", "Driver Expenses", "ReceiptIndianRupee"],
      ["loans", "Loans & EMI", "Landmark"],
      ["profit-loss", "Profit & Loss (P&L)", "TrendingUp"],
      ["reports", "Reports", "FileBarChart2"],
      ["users", "Staff & Users", "ShieldCheck"],
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

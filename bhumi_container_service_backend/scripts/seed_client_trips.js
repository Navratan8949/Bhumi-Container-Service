const mongoose = require("mongoose");
require("dotenv").config();

const clientTrips = [
  {
    tripNumber: "26-27/101",
    dispatchDate: new Date("2026-11-13"),
    truckNumber: "MH14KA 8027",
    driverName: "Sanjay Driver",
    driverPhone: "9923115321",
    partyName: "GEETEE CARRIERS",
    containerSize: "20F",
    fromCity: "COIMTORE",
    toCity: "PUNE",
    ownerName: "HARSH ROADLINCE PUNE",
    ownerType: "market",
    ownerRate: 28000,
    rate: 28000,
    advanceAmount: 25700,
    advanceBank: "AXIS",
    advanceDate: new Date("2026-11-16"),
    catting: 300,
    balanceAmount: 2000,
    balDate: new Date("2026-11-25"),
    deliveryDate: new Date("2026-11-17"),
    podDate: "2026-11-25",
    partyRate: 32000,
    partyAdvance: 28700,
    partyAdvanceDate: new Date("2026-11-16"),
    debitMamul: 300,
    debitTds: 320,
    partyBank: "AXIS",
    partyBalance: 2680,
    extraExp: 2000,
    totalBalance: 4680,
    balanceRevAmount: 4000,
    balanceRevDate: new Date("2026-12-28"),
    debit: 680,
    status: "completed",
  },
  {
    tripNumber: "26-27/102",
    dispatchDate: new Date("2026-11-13"),
    truckNumber: "MH46DC 9886",
    driverName: "Pravin Driver",
    driverPhone: "91377582768",
    partyName: "INFINITY SKY",
    containerSize: "22F",
    fromCity: "CHENNAI",
    toCity: "JNPT",
    ownerName: "KRISHNA LOGISTIC",
    ownerType: "market",
    ownerRate: 32000,
    rate: 32000,
    advanceAmount: 28000,
    advanceBank: "PNB",
    advanceDate: new Date("2026-11-13"),
    catting: 0,
    balanceAmount: 4000,
    balDate: new Date("2026-11-27"),
    deliveryDate: new Date("2026-11-15"),
    podDate: "",
    partyRate: 35000,
    partyAdvance: 31700,
    partyAdvanceDate: new Date("2026-11-15"),
    debitMamul: 300,
    debitTds: 0,
    partyBank: "PNB",
    partyBalance: 3000,
    extraExp: 750,
    totalBalance: 3750,
    balanceRevAmount: 3750,
    balanceRevDate: new Date("2026-12-29"),
    debit: 0,
    status: "completed",
  },
  {
    tripNumber: "26-27/103",
    dispatchDate: new Date("2026-11-14"),
    truckNumber: "MH55C 0978",
    driverName: "Tanaji Driver",
    driverPhone: "9657966483",
    partyName: "VANAYA TRANSPORT",
    containerSize: "20F",
    fromCity: "CHENNAI",
    toCity: "JALGAON",
    ownerName: "TANA JI",
    ownerType: "market",
    ownerRate: 38000,
    rate: 38000,
    advanceAmount: 35700,
    advanceBank: "UNION",
    advanceDate: new Date("2026-11-15"),
    catting: 300,
    balanceAmount: 2000,
    balDate: null,
    deliveryDate: new Date("2026-11-16"),
    podDate: "2026-11-26",
    partyRate: 40000,
    partyAdvance: 34700,
    partyAdvanceDate: new Date("2026-11-16"),
    debitMamul: 300,
    debitTds: 400,
    partyBank: "AXIS",
    partyBalance: 4600,
    extraExp: 320,
    totalBalance: 4920,
    balanceRevAmount: 0,
    balanceRevDate: null,
    debit: 4920,
    status: "delivered",
  },
  {
    tripNumber: "26-27/104",
    dispatchDate: new Date("2026-11-14"),
    truckNumber: "MH05FJ 2236",
    driverName: "Anil Driver",
    driverPhone: "7718987682",
    partyName: "CCI LOGISTICS",
    containerSize: "20F",
    fromCity: "CHENNAI",
    toCity: "JNPT",
    ownerName: "KARGO KART",
    ownerType: "market",
    ownerRate: 33000,
    rate: 33000,
    advanceAmount: 32700,
    advanceBank: "AXIS",
    advanceDate: new Date("2026-11-14"),
    catting: 300,
    balanceAmount: 0,
    balDate: null,
    deliveryDate: new Date("2026-11-15"),
    podDate: "2026-11-27",
    partyRate: 33000,
    partyAdvance: 33000,
    partyAdvanceDate: new Date("2026-11-14"),
    debitMamul: 0,
    debitTds: 0,
    partyBank: "AXIS",
    partyBalance: 0,
    extraExp: 0,
    totalBalance: 0,
    balanceRevAmount: 0,
    balanceRevDate: null,
    debit: 0,
    status: "delivered",
  },
  {
    tripNumber: "26-27/105",
    dispatchDate: new Date("2026-11-14"),
    truckNumber: "MH04NB 5993",
    driverName: "Priyanka Driver",
    driverPhone: "9125127484",
    partyName: "POLKART LOGISTICS",
    containerSize: "20F",
    fromCity: "CHENNAI",
    toCity: "BHIWANDI",
    ownerName: "PRIYANKA CONTAINER",
    ownerType: "market",
    ownerRate: 32000,
    rate: 32000,
    advanceAmount: 29700,
    advanceBank: "AXIS",
    advanceDate: new Date("2026-11-15"),
    catting: 300,
    balanceAmount: 2000,
    balDate: null,
    deliveryDate: new Date("2026-11-16"),
    podDate: "",
    partyRate: 33000,
    partyAdvance: 0,
    partyAdvanceDate: null,
    debitMamul: 0,
    debitTds: 0,
    partyBank: "",
    partyBalance: 33000,
    extraExp: 0,
    totalBalance: 33000,
    balanceRevAmount: 0,
    balanceRevDate: null,
    debit: 33000,
    status: "delivered",
  },
  {
    tripNumber: "26-27/106",
    dispatchDate: new Date("2026-11-15"),
    truckNumber: "MH14KA 8027",
    driverName: "Sanjay Driver",
    driverPhone: "9923115321",
    partyName: "GEETEE CARRIERS",
    containerSize: "20F",
    fromCity: "COIMTORE",
    toCity: "PUNE",
    ownerName: "HARSH ROADLINCE PUNE",
    ownerType: "market",
    ownerRate: 29000,
    rate: 29000,
    advanceAmount: 0,
    advanceBank: "",
    advanceDate: null,
    catting: 0,
    balanceAmount: 29000,
    balDate: null,
    deliveryDate: new Date("2026-11-17"),
    podDate: "2026-11-28",
    partyRate: 31500,
    partyAdvance: 31100,
    partyAdvanceDate: new Date("2026-11-19"),
    debitMamul: 400,
    debitTds: 0,
    partyBank: "UNION",
    partyBalance: 0,
    extraExp: 9700,
    totalBalance: 9700,
    balanceRevAmount: 0,
    balanceRevDate: null,
    debit: 9700,
    status: "delivered",
  },
  {
    tripNumber: "26-27/107",
    dispatchDate: new Date("2026-11-15"),
    truckNumber: "MH46DC 9886",
    driverName: "Pravin Driver",
    driverPhone: "91377582768",
    partyName: "INFINITY SKY",
    containerSize: "22F",
    fromCity: "CHENNAI",
    toCity: "JNPT",
    ownerName: "KRISHNA LOGISTIC",
    ownerType: "market",
    ownerRate: 35000,
    rate: 35000,
    advanceAmount: 0,
    advanceBank: "",
    advanceDate: null,
    catting: 0,
    balanceAmount: 35000,
    balDate: null,
    deliveryDate: new Date("2026-11-18"),
    podDate: "",
    partyRate: 38000,
    partyAdvance: 35700,
    partyAdvanceDate: new Date("2026-11-17"),
    debitMamul: 300,
    debitTds: 380,
    partyBank: "UNION",
    partyBalance: 1620,
    extraExp: 5800,
    totalBalance: 7420,
    balanceRevAmount: 0,
    balanceRevDate: null,
    debit: 7420,
    status: "delivered",
  },
  {
    tripNumber: "26-27/108",
    dispatchDate: new Date("2026-11-16"),
    truckNumber: "MH55C 0978",
    driverName: "Tanaji Driver",
    driverPhone: "9657966483",
    partyName: "VANAYA TRANSPORT",
    containerSize: "20F",
    fromCity: "CHENNAI",
    toCity: "JALGAON",
    ownerName: "TANA JI",
    ownerType: "market",
    ownerRate: 37000,
    rate: 37000,
    advanceAmount: 0,
    advanceBank: "",
    advanceDate: null,
    catting: 0,
    balanceAmount: 37000,
    balDate: null,
    deliveryDate: new Date("2026-11-19"),
    podDate: "2026-11-29",
    partyRate: 37500,
    partyAdvance: 0,
    partyAdvanceDate: null,
    debitMamul: 0,
    debitTds: 0,
    partyBank: "",
    partyBalance: 37500,
    extraExp: 1320,
    totalBalance: 38820,
    balanceRevAmount: 0,
    balanceRevDate: null,
    debit: 38820,
    status: "delivered",
  },
  {
    tripNumber: "26-27/109",
    dispatchDate: new Date("2026-11-16"),
    truckNumber: "MH04NB 2400",
    driverName: "Surat Driver",
    driverPhone: "7318126175",
    partyName: "BERWAL TRP AHM",
    containerSize: "20F",
    fromCity: "SURAT",
    toCity: "CHENNAI",
    ownerName: "BHUMI CONTAINER SERVICE",
    ownerType: "company",
    ownerRate: 58000,
    rate: 58000,
    advanceAmount: 47000,
    advanceBank: "XYZ",
    advanceDate: null,
    catting: 0,
    balanceAmount: 11000,
    balDate: null,
    deliveryDate: new Date("2026-11-18"),
    podDate: "",
    partyRate: 62000,
    partyAdvance: 0,
    partyAdvanceDate: null,
    debitMamul: 0,
    debitTds: 0,
    partyBank: "",
    partyBalance: 62000,
    extraExp: 0,
    totalBalance: 62000,
    balanceRevAmount: 0,
    balanceRevDate: null,
    debit: 62000,
    status: "delivered",
  },
  {
    tripNumber: "26-27/110",
    dispatchDate: new Date("2026-11-17"),
    truckNumber: "MH04MH 2024",
    driverName: "Pondi Driver",
    driverPhone: "9372153842",
    partyName: "UNITED CARGO PONDI",
    containerSize: "22F",
    fromCity: "BHIWANDI",
    toCity: "CHENNAI",
    ownerName: "BHUMI CONTAINER SERVICE",
    ownerType: "company",
    ownerRate: 48000,
    rate: 48000,
    advanceAmount: 41000,
    advanceBank: "XYZ",
    advanceDate: null,
    catting: 0,
    balanceAmount: 7000,
    balDate: null,
    deliveryDate: new Date("2026-11-20"),
    podDate: "",
    partyRate: 51000,
    partyAdvance: 48700,
    partyAdvanceDate: new Date("2026-11-19"),
    debitMamul: 300,
    debitTds: 0,
    partyBank: "AXIS",
    partyBalance: 2000,
    extraExp: 0,
    totalBalance: 2000,
    balanceRevAmount: 0,
    balanceRevDate: null,
    debit: 2000,
    status: "delivered",
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const Company = mongoose.model("Company", new mongoose.Schema({}, { strict: false }));
  const Vehicle = mongoose.model("Vehicle", new mongoose.Schema({}, { strict: false }));
  const Driver = mongoose.model("Driver", new mongoose.Schema({}, { strict: false }));
  const Party = mongoose.model("Party", new mongoose.Schema({}, { strict: false }));
  const Trip = mongoose.model("Trip", new mongoose.Schema({}, { strict: false }));
  const CustomerInvoice = mongoose.model("CustomerInvoice", new mongoose.Schema({}, { strict: false }));
  const VendorBill = mongoose.model("VendorBill", new mongoose.Schema({}, { strict: false }));

  const company = await Company.findOne({});
  if (!company) {
    console.error("No company found.");
    process.exit(1);
  }
  const companyId = company._id;

  for (const t of clientTrips) {
    // 1. Ensure Vehicle exists
    let vehicle = await Vehicle.findOne({ vehicleNumber: t.truckNumber, companyId });
    if (!vehicle) {
      vehicle = await Vehicle.create({
        companyId,
        vehicleNumber: t.truckNumber,
        vehicleType: t.containerSize || "20 Feet",
        ownerType: t.ownerType,
        ownerName: t.ownerName,
        status: "active",
      });
      console.log(`Created vehicle: ${t.truckNumber}`);
    }

    // 2. Ensure Driver exists
    let driver = await Driver.findOne({ phone: t.driverPhone, companyId });
    if (!driver) {
      driver = await Driver.create({
        companyId,
        name: t.driverName,
        phone: t.driverPhone,
        licenseNumber: `DL-${t.driverPhone.slice(-6)}`,
        status: "active",
      });
      console.log(`Created driver: ${t.driverName} (${t.driverPhone})`);
    }

    // 3. Ensure Party exists
    let party = await Party.findOne({ name: t.partyName, companyId });
    if (!party) {
      party = await Party.create({
        companyId,
        name: t.partyName,
        type: "client",
      });
      console.log(`Created party: ${t.partyName}`);
    }

    // 4. Upsert Trip
    const tripData = {
      ...t,
      companyId,
      vehicleId: vehicle._id,
      driverId: driver._id,
      partyId: party._id,
    };

    const existingTrip = await Trip.findOne({ tripNumber: t.tripNumber, companyId });
    let tripDoc;
    if (existingTrip) {
      tripDoc = await Trip.findByIdAndUpdate(existingTrip._id, tripData, { new: true });
      console.log(`Updated trip: ${t.tripNumber}`);
    } else {
      tripDoc = await Trip.create(tripData);
      console.log(`Created trip: ${t.tripNumber}`);
    }

    // 5. Ensure Party Account (CustomerInvoice) exists for this trip
    const invoiceNumber = `INV-${t.tripNumber.replace("/", "-")}`;
    const invoiceData = {
      companyId,
      tripId: tripDoc._id,
      partyId: party._id,
      vehicleId: vehicle._id,
      invoiceNumber,
      invoiceDate: t.dispatchDate,
      customerName: t.partyName,
      partyName: t.partyName,
      containerSize: t.containerSize,
      fromLocation: t.fromCity,
      toLocation: t.toCity,
      freightRate: t.partyRate,
      freightAmount: t.partyRate,
      advanceReceived: t.partyAdvance,
      advanceDate: t.partyAdvanceDate,
      bankAccountName: t.partyBank,
      munshiyanaML: t.debitMamul,
      tdsAmount: t.debitTds,
      otherCharges: t.extraExp,
      taxableAmount: t.partyRate + t.extraExp,
      grandTotal: t.partyRate + t.extraExp,
      paidAmount: t.balanceRevAmount,
      paymentDate: t.balanceRevDate,
      outstandingAmount: t.debit,
      paymentStatus: t.debit === 0 ? "paid" : t.balanceRevAmount > 0 ? "partial" : "unpaid",
      status: "issued",
    };

    const existingInvoice = await CustomerInvoice.findOne({ tripId: tripDoc._id, companyId });
    if (existingInvoice) {
      await CustomerInvoice.findByIdAndUpdate(existingInvoice._id, invoiceData);
    } else {
      await CustomerInvoice.create(invoiceData);
    }

    // 6. If market lorry, ensure Market Lorry Account (VendorBill) exists
    if (t.ownerType === "market") {
      const billNumber = `VB-${t.tripNumber.replace("/", "-")}`;
      const billData = {
        companyId,
        tripId: tripDoc._id,
        vehicleId: vehicle._id,
        vehicleNumber: t.truckNumber,
        partyId: party._id,
        partyName: t.partyName,
        vendorName: t.ownerName,
        billNumber,
        billDate: t.dispatchDate,
        containerSize: t.containerSize,
        fromLocation: t.fromCity,
        toLocation: t.toCity,
        deliveryDate: t.deliveryDate,
        podDate: t.podDate,
        hireRate: t.ownerRate,
        hireAmount: t.ownerRate,
        advanceCash: t.advanceAmount,
        advanceBank: t.advanceBank,
        advanceDate: t.advanceDate,
        catting: t.catting,
        paidAmount: t.advanceAmount + (t.balDate ? t.balanceAmount : 0),
        balDate: t.balDate,
        outstandingAmount: t.balDate ? 0 : t.balanceAmount,
        paymentStatus: t.balDate || t.balanceAmount === 0 ? "paid" : "unpaid",
        status: "issued",
      };

      const existingBill = await VendorBill.findOne({ tripId: tripDoc._id, companyId });
      if (existingBill) {
        await VendorBill.findByIdAndUpdate(existingBill._id, billData);
      } else {
        await VendorBill.create(billData);
      }
    }
  }

  console.log("Seed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

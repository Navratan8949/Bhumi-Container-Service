import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/src/store/Provider";
import { Toaster } from "sonner";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bhumicontainer.in";

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Bhumi Container Service | Heavy Commercial Freight & Container Logistics",
    template: "%s | Bhumi Container Service",
  },
  description:
    "IBA-approved heavy commercial road freight and container carrier. Specializing in 20ft & 40ft container movements, Chennai Port & Puzhal terminal logistics, dedicated interstate FTL corridors, instant digital Bilty/LR, and 24x7 satellite fleet tracking.",
  keywords: [
    "Bhumi Container Service",
    "bhumicontainer.in",
    "Container transport Chennai",
    "Puzhal container yard logistics",
    "Chennai port container movement",
    "Full Truckload FTL freight India",
    "Heavy commercial fleet carrier",
    "Digital LR Bilty tracking",
    "IBA approved transport carrier",
    "32ft multi axle container truck",
    "40ft flatbed trailer transport",
    "Chennai Bangalore container freight",
    "Chennai Hyderabad logistics corridor",
    "Sri City industrial container transport",
    "Real time GPS fleet tracking India",
    "Customs bottle seal container transport",
    "Road freight logistics solutions India",
    "Commercial Transport Management System",
  ],
  authors: [
    { name: "Bhumi Container Service", url: baseUrl },
    { name: "ZDC Tech Global Solutions Pvt Ltd", url: "https://zdctech.com" },
  ],
  creator: "ZDC Tech Global Solutions Pvt Ltd",
  publisher: "Bhumi Container Service",
  category: "Logistics & Commercial Freight Transportation",
  applicationName: "Bhumi Container Service Portal",
  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: baseUrl,
    siteName: "Bhumi Container Service",
    title: "Bhumi Container Service | Heavy Commercial Freight & Container Logistics",
    description:
      "IBA-approved commercial carrier. 20ft/40ft container logistics, Chennai Port to Pan-India highways, instant digital Bilty & 24x7 satellite radar fleet tracking.",
    images: [
      {
        url: "/images/hero-truck.jpg",
        width: 1200,
        height: 675,
        alt: "Bhumi Container Service Commercial Heavy Multi-Axle Fleet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bhumi Container Service | Heavy Commercial Freight & Container Logistics",
    description:
      "IBA-approved commercial carrier. 20ft/40ft container logistics, Chennai Port to Pan-India highways with real-time GPS tracking.",
    images: ["/images/hero-truck.jpg"],
    creator: "@bhumicontainer",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/images/logo.png", type: "image/png" },
    ],
    apple: [{ url: "/images/logo.png" }],
  },
  manifest: "/manifest.webmanifest",
  verification: {
    google: "google-site-verification-placeholder",
  },
};

// Rich Structured Data (JSON-LD) for Schema.org SEO Snippets
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "LogisticsService",
  "@id": `${baseUrl}/#organization`,
  name: "Bhumi Container Service",
  legalName: "Bhumi Container Service",
  alternateName: "BCS Heavy Freight",
  url: baseUrl,
  logo: `${baseUrl}/images/logo.png`,
  image: `${baseUrl}/images/hero-truck.jpg`,
  description:
    "Premier IBA-approved heavy commercial road freight and container carrier specializing in 20ft & 40ft container movements, Chennai Port & Puzhal terminal logistics, dedicated interstate FTL corridors, instant digital Bilty/LR, and 24x7 satellite fleet tracking.",
  telephone: "+91-98840-08698",
  email: "bhumicontainerservice@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Plot No 25, 1st Floor, Shree Ram Nagar, Second Street, Puzhal",
    addressLocality: "Chennai",
    addressRegion: "Tamil Nadu",
    postalCode: "600066",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 13.1584,
    longitude: 80.1983,
  },
  priceRange: "₹₹₹",
  currenciesAccepted: "INR",
  paymentAccepted: "Bank Transfer, RTGS, NEFT, Cheque, Commercial Credit",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
  ],
  areaServed: [
    { "@type": "Country", name: "India" },
    { "@type": "State", name: "Tamil Nadu" },
    { "@type": "State", name: "Karnataka" },
    { "@type": "State", name: "Andhra Pradesh" },
    { "@type": "State", name: "Telangana" },
    { "@type": "State", name: "Maharashtra" },
    { "@type": "State", name: "Gujarat" },
    { "@type": "State", name: "Madhya Pradesh" },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Heavy Commercial Freight & Container Services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Full Truckload (FTL) Freight Logistics",
          description:
            "Point-to-point dedicated heavy commercial trucks for factory plants, industrial production cargo, and bulk wholesale logistics.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Chennai Port Container Drayage & Haulage",
          description:
            "20ft and 40ft container movements connecting Chennai Port, Puzhal Container Terminal, and industrial hubs across South and Central India.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Digital LR, Bilty & e-POD Automation",
          description:
            "Instant digital LR generation, GST invoices, automated e-Way bill extension, and real-time electronic proof-of-delivery.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "24x7 IoT & GPS Fleet Radar Telematics",
          description:
            "Real-time satellite vehicle tracking with live route telematics, speed geo-fencing, engine diagnostics, and highway SOS.",
        },
      },
    ],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${baseUrl}/#website`,
  url: baseUrl,
  name: "Bhumi Container Service",
  publisher: {
    "@id": `${baseUrl}/#organization`,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${baseUrl}/?track={search_term_string}#tracking`,
    "query-input": "required name=search_term_string",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How can I track my consignment or vehicle with Bhumi Container Service?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can track your active consignment or vehicle instantly on the Bhumi Container Service website by entering your LR / Bilty Number, Trip ID, Container Number, or Vehicle Registration Number into the Live Fleet Radar widget. The system provides real-time telematics, driver phone helpline, container seal status, and milestone progression.",
      },
    },
    {
      "@type": "Question",
      name: "Which major routes and port corridors does Bhumi Container Service operate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We operate regular scheduled corridors connecting Chennai Port and Puzhal Terminal to Bangalore, Hyderabad, Sri City, Hosur, Vizag, Mumbai, Pune, and Pan-India industrial belts with 24x7 dispatches.",
      },
    },
    {
      "@type": "Question",
      name: "What commercial vehicle types and container capacities are available?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our fleet consists of 32 Ft Multi-Axle Containers (14-18 MT), 20 Ft Close Body trucks (7-9 MT), 10-Wheeler and 12-Wheeler Taurus haulers (21-25 MT), and 40 Ft Heavy Flatbed Trailers (30-38 MT) for specialized container and over-dimensional cargo (ODC).",
      },
    },
    {
      "@type": "Question",
      name: "Is Bhumi Container Service an IBA-approved commercial carrier?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Bhumi Container Service is an IBA-approved commercial carrier fully compliant with the Carriage by Road Act, 100% GST invoicing, and real-time e-Way bill extension protocols.",
      },
    },
    {
      "@type": "Question",
      name: "How does Bhumi Container Service ensure container seal integrity and zero pilferage?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "All container shipments are locked with tamper-evident customs bottle seals, verified at dispatch and unloading, transported in weatherproof closed bays, and monitored via real-time satellite GPS route geo-fencing.",
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={font.className} suppressHydrationWarning>
      <head>
        {/* Structured Data / JSON-LD for Search Engine Knowledge Graphs */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-amber-500 selection:text-slate-950">
        <StoreProvider>{children}</StoreProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

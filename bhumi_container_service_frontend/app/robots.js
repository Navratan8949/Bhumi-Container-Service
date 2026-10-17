export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bhumicontainer.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: [
          "/api/",
          "/dashboard",
          "/dashboard/*",
          "/trips",
          "/trips/*",
          "/settings",
          "/settings/*",
          "/attendances",
          "/attendances/*",
          "/profile",
          "/profile/*",
          "/inventory",
          "/inventory/*",
          "/reports",
          "/reports/*",
          "/select-company",
          "/select-company/*",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/dashboard/*", "/trips/*", "/settings/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

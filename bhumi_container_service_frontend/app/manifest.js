export default function manifest() {
  return {
    name: "Bhumi Container Service",
    short_name: "Bhumi Container",
    description: "Pan-India Heavy Commercial Container Transport & Fleet Logistics",
    start_url: "/",
    display: "standalone",
    background_color: "#080d17",
    theme_color: "#f59e0b",
    icons: [
      {
        src: "/images/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

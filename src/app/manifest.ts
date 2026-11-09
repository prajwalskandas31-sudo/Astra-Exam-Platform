import type { MetadataRoute } from "next";

// Lets students "Add to Home screen" and open Astra like an app on their phones.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Astra Exam Platform",
    short_name: "Astra",
    description: "Mock tests, results and study plans from your institute.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

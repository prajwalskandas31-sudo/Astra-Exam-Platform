import type { MetadataRoute } from "next";

// Only the public landing and login pages belong in search results; portals, exams,
// report cards and the API hold personal data.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      disallow: ["/api/", "/admin", "/mentor", "/student", "/dashboard", "/exam", "/report", "/r/"],
    },
  };
}

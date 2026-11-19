import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://takwimo.vercel.app").replace(
    /\/$/,
    ""
  );
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/privacy", "/terms", "/kvkk"],
        disallow: ["/api/", "/admin/", "/dashboard", "/inbox", "/calendar", "/appointments", "/settings"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

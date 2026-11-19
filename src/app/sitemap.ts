import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://takwimo.vercel.app").replace(
    /\/$/,
    ""
  );
  const now = new Date();
  return [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/nasil-calisir`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/referanslar`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/kvkk`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];
}

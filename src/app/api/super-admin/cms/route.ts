import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, ApiError, handleApiError } from "@/lib/tenant-guard";
import { getCmsContent, saveCmsContent, type CmsContent } from "@/lib/cms";

export async function GET() {
  try {
    await requireSuperAdmin();
    const content = await getCmsContent();
    return NextResponse.json({ content });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = (await req.json()) as { content?: CmsContent };
    if (!body?.content || !Array.isArray(body.content.references)) {
      throw new ApiError(400, "Geçersiz içerik formatı.");
    }
    await saveCmsContent(body.content);
    return NextResponse.json({
      ok: true,
      message: "Site içerikleri (Referanslar & Nasıl Çalışır) kaydedildi ve canlı sayfalar güncellendi!",
    });
  } catch (err) {
    return handleApiError(err);
  }
}

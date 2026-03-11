import { NextRequest, NextResponse } from "next/server"
import { getStudyDashboard } from "@/lib/metrics/metrics.service"

export async function GET(req:NextRequest){

  const studyId = Number(req.nextUrl.searchParams.get("studyId"))

  const metrics = await getStudyDashboard(studyId)

  return NextResponse.json(metrics)
}
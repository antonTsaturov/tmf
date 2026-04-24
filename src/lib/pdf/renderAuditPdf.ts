// lib/pdf/renderAuditPdf.ts
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { AuditReportPdf } from '@/components/reports/AuditReportPdf';

export function renderAuditPdf(data: any) {
  return pdf(
    React.createElement(AuditReportPdf, data) as any
  ).toBuffer();
}
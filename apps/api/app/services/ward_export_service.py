import io
from datetime import datetime, timezone
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


class WardExportService:
    @staticmethod
    def generate_ward_pdf(
        ward_name: str,
        zone: str,
        summary: Dict[str, Any],
        recent_entries: List[Dict[str, Any]],
    ) -> bytes:
        """
        Generates an executive municipal ward audit PDF report using ReportLab.
        Complies strictly with DPDP Act 2023 (pseudonymised records, no direct PII).
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#064E3B"),  # Deep Emerald
            fontName="Helvetica-Bold",
            spaceAfter=4,
        )

        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#4B5563"),
            fontName="Helvetica",
            spaceAfter=12,
        )

        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading2"],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#111827"),
            fontName="Helvetica-Bold",
            spaceBefore=10,
            spaceAfter=6,
        )

        cell_style = ParagraphStyle(
            "CellNormal",
            parent=styles["Normal"],
            fontSize=8,
            leading=10,
            fontName="Helvetica",
            textColor=colors.HexColor("#1F2937"),
        )

        cell_bold = ParagraphStyle(
            "CellBold",
            parent=cell_style,
            fontName="Helvetica-Bold",
        )

        elements = []

        # 1. Document Header
        now_str = datetime.now(timezone.utc).strftime("%d %B %Y, %H:%M UTC")
        elements.append(Paragraph("BRUHAT BENGALURU MAHANAGARA PALIKE (BBMP)", title_style))
        elements.append(
            Paragraph(
                f"<b>Solid Waste Management Operations Audit Report</b> — {ward_name} ({zone})<br/>"
                f"Generated via GreenPay Civic Platform on {now_str} • Formal Audit Record",
                subtitle_style,
            )
        )
        elements.append(Spacer(1, 8))

        # 2. Executive Summary Metrics Table
        elements.append(Paragraph("1. Executive Summary & Separation Benchmarks", section_heading))

        metrics_data = [
            [
                Paragraph("<b>Total Certified Waste:</b>", cell_style),
                Paragraph(f"<b>{summary.get('total_kg', 0.0):.1f} kg</b>", cell_bold),
                Paragraph("<b>Segregation Ratio:</b>", cell_style),
                Paragraph(f"<b>{summary.get('segregation_percentage', 0.0):.1f}%</b>", cell_bold),
            ],
            [
                Paragraph("Dry Recyclables:", cell_style),
                Paragraph(f"{summary.get('dry_kg', 0.0):.1f} kg", cell_style),
                Paragraph("Wet Organic:", cell_style),
                Paragraph(f"{summary.get('wet_kg', 0.0):.1f} kg", cell_style),
            ],
            [
                Paragraph("Hazardous Waste:", cell_style),
                Paragraph(f"{summary.get('hazardous_kg', 0.0):.1f} kg", cell_style),
                Paragraph("E-Waste Handover:", cell_style),
                Paragraph(f"{summary.get('ewaste_kg', 0.0):.1f} kg", cell_style),
            ],
            [
                Paragraph("Total Collections Logged:", cell_style),
                Paragraph(str(summary.get("collection_count", 0)), cell_style),
                Paragraph("Active Households:", cell_style),
                Paragraph(str(summary.get("active_citizens", 0)), cell_style),
            ],
        ]

        metrics_table = Table(metrics_data, colWidths=[130, 140, 130, 140])
        metrics_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#D1D5DB")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        elements.append(metrics_table)
        elements.append(Spacer(1, 14))

        # 3. Recent Doorstep Collections Log Table (DPDP Pseudonymised)
        elements.append(Paragraph("2. Doorstep Weighment Audit Trail (DPDP Section 12 Pseudonymised)", section_heading))

        entries_header = [
            Paragraph("<b>Timestamp (UTC)</b>", cell_bold),
            Paragraph("<b>Beneficiary ID</b>", cell_bold),
            Paragraph("<b>Dry (kg)</b>", cell_bold),
            Paragraph("<b>Wet (kg)</b>", cell_bold),
            Paragraph("<b>Total (kg)</b>", cell_bold),
            Paragraph("<b>Supervisor</b>", cell_bold),
            Paragraph("<b>Status</b>", cell_bold),
        ]
        table_rows = [entries_header]

        for entry in recent_entries[:15]:
            table_rows.append(
                [
                    Paragraph(entry.get("date", "")[:16], cell_style),
                    Paragraph(entry.get("pseudonym", "anon-user"), cell_style),
                    Paragraph(f"{entry.get('dry_kg', 0.0):.1f}", cell_style),
                    Paragraph(f"{entry.get('wet_kg', 0.0):.1f}", cell_style),
                    Paragraph(f"<b>{entry.get('total_kg', 0.0):.1f}</b>", cell_bold),
                    Paragraph(entry.get("supervisor", "Staff"), cell_style),
                    Paragraph(entry.get("status", "CONFIRMED"), cell_style),
                ]
            )

        if len(table_rows) == 1:
            table_rows.append([Paragraph("No recent collections logged for this ward.", cell_style)] + [Paragraph("", cell_style)] * 6)

        entries_table = Table(table_rows, colWidths=[90, 110, 60, 60, 65, 85, 70])
        entries_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#065F46")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        elements.append(entries_table)
        elements.append(Spacer(1, 16))

        # 4. Legal Disclaimers & DPDP Section 12 Notice
        footer_style = ParagraphStyle(
            "DocFooter",
            parent=styles["Normal"],
            fontSize=7,
            leading=10,
            textColor=colors.HexColor("#6B7280"),
            fontName="Helvetica-Oblique",
        )
        elements.append(
            Paragraph(
                "<b>DPDP Act 2023 Compliance & Municipal Non-Affiliation Declaration:</b><br/>"
                "Personal identifiers (resident names, telephone numbers, electricity meter credentials) are strictly masked in this report per "
                "India's Digital Personal Data Protection Act 2023 Section 12. GreenPay is an independent civic research technology prototype developed for "
                "urban Bengaluru waste accountability demonstration. It is not affiliated officially with the Bruhat Bengaluru Mahanagara Palike (BBMP) "
                "or Greater Bengaluru Authority (GBA).",
                footer_style,
            )
        )

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

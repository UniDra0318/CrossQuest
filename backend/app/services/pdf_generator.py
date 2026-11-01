import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Adds page numbers and footer timestamp to multi-page reports."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#718096"))
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 36, 25, page_text)
        self.drawString(36, 25, "Confidential - Crossworks Training and Consulting Corp. Enterprise Report")
        self.restoreState()


class PDFGenerator:
    """Enterprise PDF generation service for certificates and corporate client reports (ReportLab)."""

    @staticmethod
    def generate_certificate_pdf(
        trainee_name: str,
        course_title: str,
        serial_number: str,
        issue_date: datetime,
        expiry_date: datetime,
        company_name: str = "Crossworks Training & Consulting Corp.",
        trainer_name: str = "Prof. Roel Traballo",
        reissue_count: int = 0
    ) -> bytes:
        """Generates an official landscape Certificate of Completion PDF (ReportLab, AAAYYYYMMDD-01 serial)."""
        buffer = io.BytesIO()
        width, height = landscape(letter)
        c = canvas.Canvas(buffer, pagesize=landscape(letter))

        # 1. Background fill
        c.setFillColor(colors.HexColor("#FDFBF7"))
        c.rect(0, 0, width, height, fill=True, stroke=False)

        # 2. Outer and Inner Decorative Borders
        c.setStrokeColor(colors.HexColor("#2C1654")) # Deep Purple
        c.setLineWidth(4)
        c.rect(24, 24, width - 48, height - 48)

        c.setStrokeColor(colors.HexColor("#D4AF37")) # Metallic Gold
        c.setLineWidth(1.5)
        c.rect(30, 30, width - 60, height - 60)

        # Corner embellishments
        corner_len = 20
        c.setStrokeColor(colors.HexColor("#D4AF37"))
        c.setLineWidth(2)
        # Top-left
        c.line(34, height - 34, 34 + corner_len, height - 34)
        c.line(34, height - 34, 34, height - 34 - corner_len)
        # Top-right
        c.line(width - 34, height - 34, width - 34 - corner_len, height - 34)
        c.line(width - 34, height - 34, width - 34, height - 34 - corner_len)
        # Bottom-left
        c.line(34, 34, 34 + corner_len, 34)
        c.line(34, 34, 34, 34 + corner_len)
        # Bottom-right
        c.line(width - 34, 34, width - 34 - corner_len, 34)
        c.line(width - 34, 34, width - 34, 34 + corner_len)

        # 3. Header Institution Branding
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(colors.HexColor("#6B46C1"))
        c.drawCentredString(width / 2.0, height - 70, "CROSSWORKS TRAINING AND CONSULTING CORP.")

        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#718096"))
        c.drawCentredString(width / 2.0, height - 85, "Makati City, Metro Manila, Philippines | crossquest@xworks.ph")

        # 4. Certificate Title
        c.setFont("Helvetica-Bold", 26)
        c.setFillColor(colors.HexColor("#1A202C"))
        c.drawCentredString(width / 2.0, height - 130, "CERTIFICATE OF COMPLETION")

        # 5. Introductory clause
        c.setFont("Helvetica", 11)
        c.setFillColor(colors.HexColor("#4A5568"))
        c.drawCentredString(width / 2.0, height - 165, "This is to officially certify that")

        # 6. Recipient Name
        c.setFont("Helvetica-Bold", 24)
        c.setFillColor(colors.HexColor("#2C1654"))
        c.drawCentredString(width / 2.0, height - 205, trainee_name.upper())

        # Underline under name
        c.setStrokeColor(colors.HexColor("#D4AF37"))
        c.setLineWidth(1)
        name_width = c.stringWidth(trainee_name.upper(), "Helvetica-Bold", 24)
        c.line((width - name_width) / 2.0 - 15, height - 212, (width + name_width) / 2.0 + 15, height - 212)

        # 7. Fulfillment text
        c.setFont("Helvetica", 11)
        c.setFillColor(colors.HexColor("#4A5568"))
        c.drawCentredString(
            width / 2.0,
            height - 240,
            f"has successfully completed the corporate training program and satisfied all competency rubrics for"
        )

        # 8. Course Title
        c.setFont("Helvetica-Bold", 18)
        c.setFillColor(colors.HexColor("#1A202C"))
        c.drawCentredString(width / 2.0, height - 275, course_title)

        # Affiliation text
        c.setFont("Helvetica-Oblique", 10)
        c.setFillColor(colors.HexColor("#718096"))
        c.drawCentredString(width / 2.0, height - 295, f"Enterprise Program conducted for {company_name}")

        # 9. Signatures Block
        sig_y = 110
        # Left signature: Managing Director / Academic
        c.setStrokeColor(colors.HexColor("#CBD5E0"))
        c.setLineWidth(1)
        c.line(80, sig_y + 20, 260, sig_y + 20)
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.HexColor("#2D3748"))
        c.drawCentredString(170, sig_y + 6, trainer_name)
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#718096"))
        c.drawCentredString(170, sig_y - 6, "Lead Instructor / Technical Trainer")

        # Right signature: Managing Director
        c.line(width - 260, sig_y + 20, width - 80, sig_y + 20)
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.HexColor("#2D3748"))
        c.drawCentredString(width - 170, sig_y + 6, "Crossworks Training & Consulting")
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#718096"))
        c.drawCentredString(width - 170, sig_y - 6, "Managing Director & Signatory")

        # 10. Serial Number, Dates, and Security Footer
        issue_str = issue_date.strftime("%B %d, %Y")
        expiry_str = expiry_date.strftime("%B %d, %Y")

        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#4A5568"))
        c.drawCentredString(
            width / 2.0,
            sig_y + 16,
            f"Issue Date: {issue_str}    |    Valid Until: {expiry_str}"
        )

        # Serial number badge
        reissue_text = f" (Reissue #{reissue_count})" if reissue_count > 0 else ""
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(colors.HexColor("#6B46C1"))
        c.drawCentredString(
            width / 2.0,
            sig_y - 4,
            f"Certificate Serial: {serial_number}{reissue_text}"
        )

        # CP-ABE cryptographic seal note
        c.setFont("Helvetica", 7.5)
        c.setFillColor(colors.HexColor("#A0AEC0"))
        c.drawCentredString(
            width / 2.0,
            42,
            "Cryptographically bound via CP-ABE (BSW07) policy and Row Level Security. Verified under Zero-Trust Architecture."
        )

        c.save()
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generate_client_report_pdf(report_data: dict) -> bytes:
        """Generates a formal portrait client training & compliance PDF report (ReportLab, OI-04, Section 3.8.4)."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=45
        )

        styles = getSampleStyleSheet()
        normal = styles["Normal"]

        header_title_style = ParagraphStyle(
            "ReportTitle",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#2C1654")
        )

        header_sub_style = ParagraphStyle(
            "ReportSub",
            parent=normal,
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#718096")
        )

        meta_label = ParagraphStyle(
            "MetaLabel",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#4A5568")
        )

        meta_val = ParagraphStyle(
            "MetaVal",
            parent=normal,
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#1A202C")
        )

        th_style = ParagraphStyle(
            "TableHeader",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.white
        )

        td_style = ParagraphStyle(
            "TableCell",
            parent=normal,
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#2D3748")
        )

        elements = []

        # 1. Header with branding
        elements.append(Paragraph("CROSSWORKS TRAINING AND CONSULTING CORP.", header_sub_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph("Client Training & Compliance Summary Report", header_title_style))
        elements.append(Paragraph("Official Account Manager Report for Client Stakeholders (OI-04)", header_sub_style))
        elements.append(Spacer(1, 14))

        # 2. Metadata Grid
        header_info = report_data.get("header", {})
        summary_info = report_data.get("summary", {})

        meta_data = [
            [
                Paragraph("<b>Client Organization:</b>", meta_label),
                Paragraph(f"{header_info.get('client_name', 'N/A')} ({header_info.get('client_code', 'N/A')})", meta_val),
                Paragraph("<b>Generated On:</b>", meta_label),
                Paragraph(datetime.now().strftime("%Y-%m-%d %H:%M:%S PHT"), meta_val)
            ],
            [
                Paragraph("<b>Prepared By:</b>", meta_label),
                Paragraph(f"{header_info.get('generated_by_user', 'Account Manager')} ({header_info.get('user_role', 'account_manager')})", meta_val),
                Paragraph("<b>Report Classification:</b>", meta_label),
                Paragraph("Confidential / Client Proprietary", meta_val)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[110, 160, 100, 150])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F7FAFC")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EDF2F7")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        # 3. Executive Metrics Highlights (4 metric cards in table)
        metric_data = [
            [
                Paragraph(f"<b>TOTAL PARTICIPANTS</b><br/><font size='14'><b>{summary_info.get('total_records', 0)}</b></font>", meta_val),
                Paragraph(f"<b>COMPLETED TRAININGS</b><br/><font size='14'><b>{summary_info.get('completed_trainings', 0)}</b></font>", meta_val),
                Paragraph(f"<b>AVERAGE SCORE</b><br/><font size='14'><b>{summary_info.get('average_score', 0)}%</b></font>", meta_val),
                Paragraph(f"<b>COMPLIANCE RATE</b><br/><font size='14'><b>{summary_info.get('compliance_rate', '0%')}</b></font>", meta_val)
            ]
        ]
        metric_table = Table(metric_data, colWidths=[130, 130, 130, 130])
        metric_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FAF5FF")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#9F7AEA")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(metric_table)
        elements.append(Spacer(1, 16))

        # 4. Trainee Detailed Roster
        elements.append(Paragraph("<b>Participant Completion Roster</b>", ParagraphStyle(
            "SectionHeader",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=colors.HexColor("#2C1654")
        )))
        elements.append(Spacer(1, 6))

        trainees = report_data.get("trainees", [])
        table_rows = [
            [
                Paragraph("<b>Trainee ID</b>", th_style),
                Paragraph("<b>Participant Name</b>", th_style),
                Paragraph("<b>Course Module</b>", th_style),
                Paragraph("<b>Date</b>", th_style),
                Paragraph("<b>Status</b>", th_style),
                Paragraph("<b>Score</b>", th_style)
            ]
        ]

        for t in trainees:
            table_rows.append([
                Paragraph(t.get("trainee_code", "N/A"), td_style),
                Paragraph(t.get("trainee_name", "N/A"), td_style),
                Paragraph(t.get("course_name", "N/A")[:35], td_style),
                Paragraph(str(t.get("training_date", "In progress")), td_style),
                Paragraph(t.get("status", "Enrolled"), td_style),
                Paragraph(f"{t.get('score')}%" if t.get("score") is not None else "--", td_style)
            ])

        if len(table_rows) == 1:
            table_rows.append([
                Paragraph("No training records found for this client.", td_style),
                Paragraph("", td_style), Paragraph("", td_style), Paragraph("", td_style),
                Paragraph("", td_style), Paragraph("", td_style)
            ])

        roster_table = Table(table_rows, colWidths=[70, 120, 160, 65, 65, 40])
        roster_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#44337A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(roster_table)

        doc.build(elements, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()


pdf_generator = PDFGenerator()

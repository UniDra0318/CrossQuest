"""Email delivery service for CrossQuest (Phase 1, Chapter III Section 3.7.1).

Delivers transactional emails from crossquest@xworks.ph:
- Account setup invitations (24-hour validity)
- Password reset links (15-minute validity)
- Certification expiry notices
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.sent_emails: List[Dict[str, Any]] = []

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Sends an email or logs/enqueues it during testing and development."""
        email_record = {
            "from": settings.EMAILS_FROM_EMAIL,
            "to": to_email,
            "subject": subject,
            "html": html_content,
            "text": text_content or html_content,
            "sent_at": datetime.now(timezone.utc).isoformat()
        }
        self.sent_emails.append(email_record)
        logger.info(f"[EmailService] Sent email to {to_email} with subject: '{subject}' from {settings.EMAILS_FROM_EMAIL}")

        if settings.ENVIRONMENT == "production" and settings.SMTP_HOST and settings.SMTP_HOST != "localhost":
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = settings.EMAILS_FROM_EMAIL
                msg["To"] = to_email

                part1 = MIMEText(text_content or html_content, "plain")
                part2 = MIMEText(html_content, "html")
                msg.attach(part1)
                msg.attach(part2)

                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    if settings.SMTP_USER and settings.SMTP_PASSWORD:
                        server.starttls()
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.EMAILS_FROM_EMAIL, to_email, msg.as_string())
                return True
            except Exception as e:
                logger.error(f"[EmailService] Failed to send live email to {to_email}: {e}")
                return False

        return True

    def send_account_setup_email(self, to_email: str, full_name: str, raw_token: str) -> bool:
        """Sends an account setup invitation link valid for 24 hours (Phase 1, [R])."""
        activation_url = f"https://crossquest.xworks.ph/activate?token={raw_token}"
        subject = "Welcome to CrossQuest - Complete Your Account Setup"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #00314d; margin: 0;">CrossQuest Enterprise Learning</h2>
                <p style="color: #666; font-size: 14px;">Crossworks Training and Consulting Corp.</p>
            </div>
            <p>Hello <strong>{full_name}</strong>,</p>
            <p>An authorized administrator has provisioned your corporate account on the CrossQuest platform.</p>
            <p>Please click the button below to set your password and complete your registration. For security, this setup link will expire in <strong>24 hours</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{activation_url}" style="background-color: #00314d; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Activate My Account</a>
            </div>
            <p style="color: #666; font-size: 12px;">If you did not request or expect this account, please notify security@crossworks.ph immediately.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 11px; text-align: center;">Crossworks Training and Consulting Corp. · Manila, Philippines</p>
        </div>
        """
        return self.send_email(to_email, subject, html)

    def send_password_reset_email(self, to_email: str, full_name: str, raw_token: str) -> bool:
        """Sends a single-use password reset link valid for 15 minutes (Phase 1, [R])."""
        reset_url = f"https://crossquest.xworks.ph/reset-password?token={raw_token}"
        subject = "CrossQuest Password Reset Request"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #00314d; margin: 0;">CrossQuest Security</h2>
                <p style="color: #666; font-size: 14px;">Crossworks Training and Consulting Corp.</p>
            </div>
            <p>Hello <strong>{full_name}</strong>,</p>
            <p>A password reset request was initiated for your CrossQuest account.</p>
            <p>Please click the button below to set your new password. This link is single-use and will expire in <strong>15 minutes</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="background-color: #f0605d; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 12px;">If you did not initiate this request, your account may be subject to unauthorized attempts. Contact system administrators immediately.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 11px; text-align: center;">Crossworks Training and Consulting Corp. · Manila, Philippines</p>
        </div>
        """
        return self.send_email(to_email, subject, html)

    def send_cert_expiry_email(self, to_email: str, full_name: str, cert_title: str, days_left: int) -> bool:
        """Sends a certification renewal notice to a trainee or assigned account manager."""
        subject = f"Action Required: Certification '{cert_title}' Expiring Soon"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h3 style="color: #00314d;">Crossworks Certification Reminder</h3>
            <p>Hello <strong>{full_name}</strong>,</p>
            <p>This is an automated notification that the certificate <strong>{cert_title}</strong> will expire in <strong>{days_left} days</strong>.</p>
            <p>Please plan recertification or contact your Crossworks Account Manager to schedule renewal training.</p>
        </div>
        """
        return self.send_email(to_email, subject, html)


email_service = EmailService()

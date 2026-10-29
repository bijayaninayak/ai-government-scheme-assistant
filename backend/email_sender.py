"""Sends the password reset email.

If SMTP is not set up in the .env file, nothing is emailed. Instead the reset
link is printed in the backend terminal, so you can test the whole feature on
your own computer without an email account. Set these in .env to send real
emails (for Gmail use an "app password", not your normal password):

    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=you@gmail.com
    SMTP_PASSWORD=your-app-password
    SMTP_FROM=you@gmail.com        (optional, defaults to SMTP_USER)
    FRONTEND_URL=http://localhost:8443
"""
import os
import smtplib
from email.message import EmailMessage

DEFAULT_FRONTEND_URL = "http://localhost:8443"


def reset_link(token):
    base = os.getenv("FRONTEND_URL", DEFAULT_FRONTEND_URL).rstrip("/")
    return f"{base}/?reset_token={token}"


def smtp_configured():
    return bool(os.getenv("SMTP_HOST"))


def send_reset_email(to_email, name, token):
    """Returns True if an email was sent. Never raises: a mail problem must not
    break the page or tell an attacker whether the account exists."""
    link = reset_link(token)

    if not smtp_configured():
        print(
            "\n[DEV MODE] SMTP is not set up, so no email was sent.\n"
            f"Password reset link for {to_email}:\n{link}\n"
        )
        return False

    message = EmailMessage()
    message["Subject"] = "Reset your SchemeAI password"
    message["From"] = os.getenv("SMTP_FROM") or os.getenv("SMTP_USER", "")
    message["To"] = to_email
    message.set_content(
        f"Hello {name},\n\n"
        "We received a request to reset your password. Open this link to "
        "choose a new one (it works once and expires in 30 minutes):\n\n"
        f"{link}\n\n"
        "If you did not ask for this, you can ignore this email. "
        "Your password will not change.\n"
    )

    try:
        port = int(os.getenv("SMTP_PORT", "587"))
        with smtplib.SMTP(os.environ["SMTP_HOST"], port, timeout=10) as server:
            server.starttls()
            if os.getenv("SMTP_USER"):
                server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD", ""))
            server.send_message(message)
    except Exception as error:  # noqa: BLE001 - see docstring
        print(f"Warning: could not send the password reset email: {type(error).__name__}")
        return False

    return True

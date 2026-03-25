import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Try different Zoho SMTP configurations
const getTransporterConfig = () => {
  // Option 1: Standard Zoho SMTP (port 587 with TLS)
  const configs = [
    {
      host: "smtp.zoho.in",
      port: 587,
      secure: false,
      auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_APP_PASSWORD,
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 30000,
    },
    {
      host: "smtp.zoho.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_APP_PASSWORD,
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 30000,
    },
    {
      host: "smtp.zoho.in",
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_APP_PASSWORD,
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 30000,
    },
  ];

  return configs[0]; // Try first config
};

// Create transporter
const transporterConfig = getTransporterConfig();
console.log("📧 Attempting Zoho SMTP connection with:", {
  host: transporterConfig.host,
  port: transporterConfig.port,
  secure: transporterConfig.secure,
  user: process.env.ZOHO_USER,
});

const transporter = nodemailer.createTransport(transporterConfig);

// Test the connection
const testConnection = async () => {
  try {
    await transporter.verify();
    console.log("✅ Zoho Email server is ready to send messages");
    console.log(`📧 Email account: ${process.env.ZOHO_USER}`);
    return true;
  } catch (error) {
    console.error("❌ Zoho Email transporter error:", error.message);
    console.log("💡 Troubleshooting tips:");
    console.log("   1. Check if Zoho account has 2FA enabled");
    console.log("   2. Generate an App Password from Zoho Security settings");
    console.log("   3. Use the App Password, not your regular password");
    console.log("   4. Ensure your Zoho account is active and not blocked");
    return false;
  }
};

// Test connection on startup
testConnection();

// Send single email
export const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const mailOptions = {
      from: `"Looping Mail System" <${process.env.ZOHO_USER}>`,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      })),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}, Message ID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Email sending error:", error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Convert time to milliseconds
const convertToMs = (value, unit) => {
  const numValue = parseInt(value);
  switch (unit) {
    case "seconds":
      return numValue * 1000;
    case "minutes":
      return numValue * 60 * 1000;
    case "hours":
      return numValue * 60 * 60 * 1000;
    case "days":
      return numValue * 24 * 60 * 60 * 1000;
    default:
      return numValue * 1000;
  }
};

// Store active intervals
const activeIntervals = new Map();

// Schedule multiple emails
export const scheduleEmails = (
  to,
  subject,
  html,
  attachments,
  timeValue,
  timeUnit,
  count,
  res,
) => {
  let sentCount = 0;
  let isCancelled = false;

  const timeInMs = convertToMs(timeValue, timeUnit);
  const intervalId = Date.now().toString();

  const sendNextEmail = async () => {
    if (isCancelled || sentCount >= parseInt(count)) {
      if (activeIntervals.has(intervalId)) {
        clearInterval(activeIntervals.get(intervalId));
        activeIntervals.delete(intervalId);
      }
      return;
    }

    try {
      const result = await sendEmail(to, subject, html, attachments);
      sentCount++;
      console.log(
        `📧 Email ${sentCount}/${count} sent to ${to} at ${new Date().toISOString()}`,
      );

      if (sentCount === parseInt(count)) {
        console.log(`✅ All ${count} emails sent successfully to ${to}`);
        if (activeIntervals.has(intervalId)) {
          clearInterval(activeIntervals.get(intervalId));
          activeIntervals.delete(intervalId);
        }
      }
    } catch (error) {
      console.error(`❌ Error sending email ${sentCount + 1}:`, error.message);
      isCancelled = true;
      if (activeIntervals.has(intervalId)) {
        clearInterval(activeIntervals.get(intervalId));
        activeIntervals.delete(intervalId);
      }
    }
  };

  const interval = setInterval(sendNextEmail, timeInMs);
  activeIntervals.set(intervalId, interval);
  setTimeout(sendNextEmail, 0);

  return {
    message: `Started sending ${count} emails to ${to} every ${timeValue} ${timeUnit}`,
    intervalId,
    totalEmails: count,
    timeInterval: `${timeValue} ${timeUnit}`,
    startTime: new Date().toISOString(),
  };
};

// Cancel all active email schedules
export const cancelAllSchedules = () => {
  for (const [id, interval] of activeIntervals) {
    clearInterval(interval);
    activeIntervals.delete(id);
  }
  return { cancelled: activeIntervals.size };
};

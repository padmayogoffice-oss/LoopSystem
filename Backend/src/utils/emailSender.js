import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

console.log("📧 Email Configuration Check:");
console.log("ZOHO_USER:", process.env.ZOHO_USER ? "✓ Set" : "✗ Missing");
console.log(
  "ZOHO_APP_PASSWORD:",
  process.env.ZOHO_APP_PASSWORD
    ? `✓ Set (${process.env.ZOHO_APP_PASSWORD.length} chars)`
    : "✗ Missing",
);

// Use port 587 with STARTTLS (more compatible with cloud providers)
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 587,
  secure: false, // false for port 587
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: "SSLv3",
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
  debug: true, // Enable debug for troubleshooting
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Zoho Email transporter error:", error.message);
    console.error("Error details:", {
      code: error.code,
      command: error.command,
      user: process.env.ZOHO_USER,
    });
  } else {
    console.log("✅ Zoho Email server is ready to send messages");
    console.log(`📧 Email account: ${process.env.ZOHO_USER}`);
  }
});

// Helper to convert HTML to plain text
const htmlToText = (html) => {
  return html
    .replace(/<style[^>]*>.*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// Send single email
export const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    if (!to || !to.includes("@")) {
      throw new Error(`Invalid recipient email: ${to}`);
    }

    const text = htmlToText(html);

    const mailOptions = {
      from: `"Padmayog Agrotech" <${process.env.ZOHO_USER}>`,
      to: to,
      subject: subject,
      text: text,
      html: html,
      attachments: attachments.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      })),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`   Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
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

export const cancelAllSchedules = () => {
  for (const [id, interval] of activeIntervals) {
    clearInterval(interval);
    activeIntervals.delete(id);
  }
  return { cancelled: activeIntervals.size };
};

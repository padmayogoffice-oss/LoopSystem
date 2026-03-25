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

// Create transporter with Zoho SMTP configuration
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
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

// Send single email with better error handling and delivery options
export const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    // Validate email addresses
    if (!to || !to.includes("@")) {
      throw new Error(`Invalid recipient email: ${to}`);
    }

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
      // Add headers to improve deliverability
      headers: {
        "X-Priority": "3",
        "X-Mailer": "Looping Mail System",
        "X-Auto-Response-Suppress": "OOF, AutoReply",
      },
      // Add priority to avoid spam filters
      priority: "normal",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);

    return {
      success: true,
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
      response: info.response,
    };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    console.error(`   Error code: ${error.code}`);
    console.error(`   Command: ${error.command}`);

    // Check for specific error types
    if (error.code === "EAUTH") {
      console.error("   Authentication failed. Check your Zoho credentials.");
    } else if (error.code === "ECONNECTION") {
      console.error("   Connection failed. Check network and SMTP settings.");
    } else if (error.responseCode === 550) {
      console.error("   Email rejected by recipient server.");
    }

    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Test email function to verify configuration
export const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("✅ Email connection test passed");
    return true;
  } catch (error) {
    console.error("❌ Email connection test failed:", error.message);
    return false;
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
      console.log(`   Message ID: ${result.messageId}`);

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

  // Send first email immediately
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
  console.log(`✅ Cancelled ${activeIntervals.size} active schedules`);
  return { cancelled: activeIntervals.size };
};

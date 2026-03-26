import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Verify environment variables
console.log("Email Configuration Check:");
console.log("ZOHO_USER:", process.env.ZOHO_USER ? "✓ Set" : "✗ Missing");
console.log(
  "ZOHO_APP_PASSWORD:",
  process.env.ZOHO_APP_PASSWORD ? "✓ Set" : "✗ Missing",
);

// Zoho Mail API Configuration
const ZOHO_API_URL = "https://mail.zoho.com/api/accounts";
const ZOHO_ACCOUNT_ID = process.env.ZOHO_USER; // Your email

// Generate auth token (Basic Auth with app password)
const authToken = Buffer.from(
  `${process.env.ZOHO_USER}:${process.env.ZOHO_APP_PASSWORD}`,
).toString("base64");

// Send single email using Zoho Mail API
export const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    console.log(`Attempting to send email to: ${to}`);

    // Prepare email data for Zoho API
    const emailData = {
      fromAddress: process.env.ZOHO_USER,
      toAddress: to,
      subject: subject,
      content: html,
      isHTML: true,
    };

    // Add attachments if any
    if (attachments && attachments.length > 0) {
      emailData.attachments = attachments.map((file) => ({
        name: file.originalname,
        content: file.buffer.toString("base64"),
        mimeType: file.mimetype,
      }));
    }

    // Make API request to Zoho
    const response = await axios.post(
      `${ZOHO_API_URL}/${ZOHO_ACCOUNT_ID}/messages`,
      emailData,
      {
        headers: {
          Authorization: `Basic ${authToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    if (response.data && response.data.status === "success") {
      console.log(`✓ Email sent successfully to ${to}`);
      return {
        success: true,
        messageId: response.data.data.messageId || Date.now().toString(),
        timestamp: new Date().toISOString(),
      };
    } else {
      throw new Error(
        "Zoho API returned error: " + JSON.stringify(response.data),
      );
    }
  } catch (error) {
    console.error(`✗ Email sending error to ${to}:`, error.message);
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
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

// Schedule multiple emails with error handling and retry logic
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
  let failedAttempts = 0;
  const MAX_RETRIES = 3;

  // Convert time to milliseconds
  const timeInMs = Math.max(convertToMs(timeValue, timeUnit), 3000); // Minimum 3 seconds
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
      failedAttempts = 0; // Reset failed attempts on success
      console.log(
        `📧 Email ${sentCount}/${count} sent to ${to} at ${new Date().toISOString()}`,
      );

      if (sentCount === parseInt(count)) {
        console.log(`✓ All ${count} emails sent successfully to ${to}`);
        if (activeIntervals.has(intervalId)) {
          clearInterval(activeIntervals.get(intervalId));
          activeIntervals.delete(intervalId);
        }
      }
    } catch (error) {
      failedAttempts++;
      console.error(`✗ Error sending email ${sentCount + 1}:`, error.message);

      // Retry logic
      if (failedAttempts <= MAX_RETRIES) {
        console.log(`Retrying... Attempt ${failedAttempts}/${MAX_RETRIES}`);
        // Retry after 5 seconds
        setTimeout(() => {
          if (!isCancelled && sentCount < parseInt(count)) {
            sendNextEmail();
          }
        }, 5000);
      } else {
        console.error(
          `✗ Failed to send email after ${MAX_RETRIES} attempts. Stopping.`,
        );
        isCancelled = true;
        if (activeIntervals.has(intervalId)) {
          clearInterval(activeIntervals.get(intervalId));
          activeIntervals.delete(intervalId);
        }
      }
    }
  };

  // Start sending emails
  const interval = setInterval(sendNextEmail, timeInMs);
  activeIntervals.set(intervalId, interval);

  // Send first email immediately
  setTimeout(sendNextEmail, 0);

  return {
    message: `Started sending ${count} emails to ${to} every ${timeValue} ${timeUnit}`,
    intervalId,
    totalEmails: count,
    timeInterval: `${timeValue} ${timeUnit}`,
    actualDelay: `${timeInMs / 1000} seconds`,
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

import { json } from "@remix-run/node";
import nodemailer from "nodemailer";
import axios from "axios";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

// -------------------- Email Templates --------------------
function getEmailTemplate(type, shop) {
  const getContent = () => {
    switch (type) {
      case "revenueRateLow":
        return {
          title: "🚨 Low Revenue Rate Alert",
          body: `
            We’ve detected a <strong>low revenue rate</strong> in your Shopify store <strong>${shop}</strong>. 
            This may indicate fewer sales than expected. <br><br>
            Please review your store analytics and take necessary action.
          `
        };
      case "orderGrowthLow":
        return {
          title: "🚨 Low Order Growth Alert",
          body: `
            Your store <strong>${shop}</strong> is experiencing <strong>low order growth</strong>. 
            Consider reviewing marketing or promotions to boost performance.
          `
        };
      case "trafficRateLow":
        return {
          title: "🚨 Low Traffic Alert",
          body: `
            Your Shopify store <strong>${shop}</strong> has <strong>low traffic</strong>. 
            This may affect sales and conversions. <br><br>
            Consider boosting SEO, ads, or social media campaigns.
          `
        };
      case "conversionRateLow":
        return {
          title: "🚨 Low Conversion Rate Alert",
          body: `
            Your Shopify store <strong>${shop}</strong> is showing a <strong>low conversion rate</strong>. 
            Many visitors are not completing purchases. <br><br>
            Review product pages, checkout experience, and promotions.
          `
        };
      case "slackTest":
        return {
          title: "✅ Slack Test Notification",
          body: `
            This is a test alert sent from your Shopify monitoring app for <strong>${shop}</strong>.
          `
        };
      default:
        return {
          title: "⚠️ Unknown Alert",
          body: `Unknown alert type received for ${shop}.`
        };
    }
  };

  const { title, body } = getContent();

  return `
    <html>
      <body style="margin:0; padding:0; background:#f4f6f8; font-family:Arial, sans-serif; color:#333;">
        <table width="100%" cellspacing="0" cellpadding="0" style="padding:30px 0;">
          <tr>
            <td align="center">
              <table width="600" cellspacing="0" cellpadding="0" style="background:#fff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.1); overflow:hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background:#2c7a7b; padding:20px; text-align:center; color:#fff; font-size:22px; font-weight:bold;">
                    Shopify Store Alert
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding:30px; text-align:left; font-size:16px; line-height:1.6; color:#444;">
                    <h2 style="color:#d9534f; margin-top:0;">${title}</h2>
                    <p>Dear Merchant,</p>
                    <p>${body}</p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background:#f4f6f8; padding:15px; text-align:center; font-size:12px; color:#888;">
                    © ${new Date().getFullYear()} Shopify Monitoring App • This is an automated alert
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}


// -------------------- Slack Messages --------------------
function getSlackMessage(type, shop) {
  switch (type) {
    case "revenueRateLow":
      return `🚨 Low Revenue Rate detected in *${shop}*. Please review store performance.`;
    case "orderGrowthLow":
      return `🚨 Low Order Growth detected in *${shop}*. Consider reviewing marketing strategies.`;
    case "trafficRateLow":
      return `🚨 Low Traffic Rate detected in *${shop}*. Consider boosting ads, SEO, or campaigns.`;
    case "conversionRateLow":
      return `🚨 Low Conversion Rate detected in *${shop}*. Many visitors are not converting to customers.`;
    case "slackTest":
      return `✅ Slack Test Notification: This is a test alert for *${shop}*.`;
    default:
      return `⚠️ Unknown alert type received for *${shop}*.`;
  }
}

// -------------------- Main Action --------------------
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const { type } = await request.json();

  const settings = await prisma.alertSettings.findUnique({ where: { shop } });
  if (!settings) {
    console.error("Settings not found for shop:", shop);
    return json({ sent: false, reason: "Settings not found." }, { status: 404 });
  }

  const { alertEmail, revenueRateLow, orderGrowthLow, trafficRateLow, conversionRateLow, slackWebhookUrl, slackEnabled } = settings;

  let isEmailEnabled = false;
  let isSlackEnabled = false;
  let alertMessage = "";

  switch (type) {
    case "slackTest":
      isSlackEnabled = slackEnabled;
      alertMessage = "Slack Test Notification: A test alert has been triggered.";
      break;
    case "revenueRateLow":
      isEmailEnabled = revenueRateLow;
      isSlackEnabled = slackEnabled && revenueRateLow;
      alertMessage = "🚨 Shopify Alert: Low Revenue Rate detected for your store.";
      break;
    case "orderGrowthLow":
      isEmailEnabled = orderGrowthLow;
      isSlackEnabled = slackEnabled && orderGrowthLow;
      alertMessage = "🚨 Shopify Alert: Low Order Growth detected for your store.";
      break;
    case "trafficRateLow":
      isEmailEnabled = trafficRateLow;
      isSlackEnabled = slackEnabled && trafficRateLow;
      alertMessage = "🚨 Shopify Alert: Low Traffic Rate detected for your store.";
      break;
    case "conversionRateLow":
      isEmailEnabled = conversionRateLow;
      isSlackEnabled = slackEnabled && conversionRateLow;
      alertMessage = "🚨 Shopify Alert: Low Conversion Rate detected for your store.";
      break;
    default:
      console.error("Unknown alert type:", type);
      return json({ sent: false, reason: "Unknown alert type." }, { status: 400 });
  }

  // -------------------- Send Email --------------------
  if (isEmailEnabled && alertEmail) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: true,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: alertEmail,
        subject: alertMessage,          // plain subject
        html: getEmailTemplate(type, shop), // HTML template
      });
      console.log("Email sent successfully for type:", type);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }

  // -------------------- Send to Slack --------------------
  if (isSlackEnabled && slackWebhookUrl) {
    try {
      await axios.post(slackWebhookUrl, {
        text: getSlackMessage(type, shop),
      });
      console.log("Slack notification sent successfully for type:", type);
    } catch (error) {
      console.error("Error sending to Slack:", error.response?.data || error.message);
    }
  }

  return json({
    sent: true,
    type,
    sentEmail: isEmailEnabled && alertEmail,
    sentSlack: isSlackEnabled && slackWebhookUrl,
  });
};

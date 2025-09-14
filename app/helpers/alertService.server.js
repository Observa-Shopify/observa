import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import nodemailer from "nodemailer";
import axios from "axios";

// -------------------- Email Templates --------------------
function getEmailTemplate(type, shop) {
  const getContent = () => {
    switch (type) {
      case "revenueRateLow":
        return {
          title: "🚨 Low Revenue Rate Alert",
          body: `
            We've detected a <strong>low revenue rate</strong> in your Shopify store <strong>${shop}</strong>. 
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
      case "emailTest":
        return {
          title: "✉️ Test Email Delivery",
          body: `
            This is a <strong>test email</strong> from your Observa monitoring app for <strong>${shop}</strong>.<br><br>
            Please locate this email in your inbox (and spam folder if necessary) and mark it as <strong>Not Spam</strong> to improve future deliverability.
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
    case "emailTest":
      return `✉️ Test Email: This is a test alert from your Observa monitoring app for *${shop}*.`;
    default:
      return `⚠️ Unknown alert type received for *${shop}*.`;
  }
}

// -------------------- Send Alert Function --------------------
async function sendAlert(type, shop, settings) {
  const { alertEmail, slackWebhookUrl, slackEnabled } = settings;

  let isEmailEnabled = false;
  let isSlackEnabled = false;
  let alertMessage = "";

  switch (type) {
    case "revenueRateLow":
      isEmailEnabled = settings.revenueRateLow;
      isSlackEnabled = slackEnabled && settings.revenueRateLow;
      alertMessage = "🚨 Shopify Alert: Low Revenue Rate detected for your store.";
      break;
    case "orderGrowthLow":
      isEmailEnabled = settings.orderGrowthLow;
      isSlackEnabled = slackEnabled && settings.orderGrowthLow;
      alertMessage = "🚨 Shopify Alert: Low Order Growth detected for your store.";
      break;
    case "trafficRateLow":
      isEmailEnabled = settings.trafficRateLow;
      isSlackEnabled = slackEnabled && settings.trafficRateLow;
      alertMessage = "🚨 Shopify Alert: Low Traffic Rate detected for your store.";
      break;
    case "conversionRateLow":
      isEmailEnabled = settings.conversionRateLow;
      isSlackEnabled = slackEnabled && settings.conversionRateLow;
      alertMessage = "🚨 Shopify Alert: Low Conversion Rate detected for your store.";
      break;
    case "emailTest":
      isEmailEnabled = true; // Always send test emails if email is configured
      isSlackEnabled = false; // Don't send test emails to Slack
      alertMessage = "✉️ Test Email: Email delivery test from your Observa monitoring app.";
      break;
    default:
      console.error("Unknown alert type:", type);
      return { sent: false, reason: "Unknown alert type." };
  }

  const results = { sent: false, emailSent: false, slackSent: false };

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
        subject: alertMessage,
        html: getEmailTemplate(type, shop),
      });
      console.log("Email sent successfully for type:", type);
      results.emailSent = true;
      results.sent = true;
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
      results.slackSent = true;
      results.sent = true;
    } catch (error) {
      console.error("Error sending to Slack:", error.response?.data || error.message);
    }
  }

  return results;
}

// -------------------- Check Conversion Rate Alert --------------------
export async function checkConversionRateAlert(shop, admin) {
  try {
    const settings = await prisma.alertSettings.findUnique({
      where: { shop },
      select: {
        conversionRateLow: true,
        conversionRateThreshold: true,
        sendConversionAlert: true,
        alertEmail: true,
        slackWebhookUrl: true,
        slackEnabled: true,
        revenueRateLow: true,
        orderGrowthLow: true,
        trafficRateLow: true,
        conversionRateLow: true
      },
    });

    // Check if conversion rate alert is enabled
    if (!settings || !settings.conversionRateLow) {
      return { checked: false, reason: "Conversion rate alert not enabled" };
    }

    // Get session and order data
    const allSessions = await prisma.sessionCheckout.findMany({
      where: { shop },
      select: { createdAt: true, pageViews: true, hasInitiatedCheckout: true },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate daily aggregates
    const dailyAggregates = allSessions.reduce((acc, session) => {
      const date = new Date(session.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          sessionCount: 0,
          bouncedSessions: 0,
          initiatedCheckouts: 0,
        };
      }
      acc[date].sessionCount += 1;
      if (session.pageViews === 1 && !session.hasInitiatedCheckout) {
        acc[date].bouncedSessions += 1;
      }
      if (session.hasInitiatedCheckout) {
        acc[date].initiatedCheckouts += 1;
      }
      return acc;
    }, {});

    // Fetch orders for each day
    async function fetchOrdersForDate(date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      const query = `
        query OrdersCount($query: String) {
          ordersCount(query: $query) {
            count
            precision
          }
        }
      `;
      const variables = {
        query: `created_at:>=${start.toISOString()} created_at:<=${end.toISOString()}`
      };
      try {
        const response = await admin.graphql(query, { variables });
        const jsonData = await response.json();
        const count = jsonData?.data?.ordersCount?.count;
        return typeof count === 'number' ? count : 0;
      } catch (error) {
        return 0;
      }
    }

    let dailyStats = await Promise.all(
      Object.entries(dailyAggregates).map(async ([date, { sessionCount, bouncedSessions, initiatedCheckouts }]) => {
        const orderCount = await fetchOrdersForDate(date);
        const conversionRate = sessionCount > 0
          ? Math.min((orderCount / sessionCount) * 100, 100)
          : 0;
        return {
          date,
          sessionCount,
          orderCount,
          conversionRate,
        };
      })
    );

    const totalSessionCount = dailyStats.reduce((sum, stat) => sum + stat.sessionCount, 0);
    const totalOrderCount = dailyStats.reduce((sum, stat) => sum + stat.orderCount, 0);
    const overallConversionRate = totalSessionCount > 0
      ? Math.min((totalOrderCount / totalSessionCount) * 100, 100)
      : 0;

    console.log(`Conversion rate check for ${shop}: ${overallConversionRate}% (threshold: ${settings.conversionRateThreshold}%)`);

    // Check if conversion rate is below threshold AND sendConversionAlert is false
    if (overallConversionRate < settings.conversionRateThreshold && settings.sendConversionAlert === false) {
      console.log(`Conversion rate alert triggered for ${shop} - sending alert`);
      
      // Send alert
      const alertResult = await sendAlert('conversionRateLow', shop, settings);
      
      if (alertResult.sent) {
        // Set sendConversionAlert to true to prevent repeated alerts
        await prisma.alertSettings.update({
          where: { shop },
          data: { sendConversionAlert: true }
        });
        console.log(`Alert sent and flag set to true for ${shop}`);
      }
      
      return { checked: true, alertSent: alertResult.sent, conversionRate: overallConversionRate };
    }
    
    // Reset flag if conversion rate is back above threshold
    if (overallConversionRate >= settings.conversionRateThreshold && settings.sendConversionAlert === true) {
      console.log(`Conversion rate back to safe zone for ${shop}, resetting alert flag to false`);
      await prisma.alertSettings.update({
        where: { shop },
        data: { sendConversionAlert: false }
      });
    }

    return { checked: true, alertSent: false, conversionRate: overallConversionRate };
  } catch (error) {
    console.error('Error checking conversion rate alert:', error);
    return { checked: false, error: error.message };
  }
}

// -------------------- Check Sales Alert --------------------
export async function checkSalesAlert(shop, admin) {
  try {
    const settings = await prisma.alertSettings.findUnique({
      where: { shop },
      select: {
        orderGrowthLow: true,
        sendSalesAlert: true,
        alertEmail: true,
        slackWebhookUrl: true,
        slackEnabled: true,
        revenueRateLow: true,
        orderGrowthLow: true,
        trafficRateLow: true,
        conversionRateLow: true
      },
    });

    if (!settings || !settings.orderGrowthLow) {
      return { checked: false, reason: "Alert not enabled or settings not found" };
    }

    // Get recent orders
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const ordersResponse = await admin.graphql(
      `#graphql
      query getRecentOrders($first: Int!) {
        orders(first: $first, reverse: true) {
          edges {
            node {
              id
              name
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              createdAt
            }
          }
        }
      }`,
      {
        variables: {
          first: 100
        }
      }
    );

    const ordersData = await ordersResponse.json();
    const orderEdges = ordersData?.data?.orders?.edges ?? [];

    const allOrders = orderEdges.map(edge => ({
      id: edge.node.id,
      name: edge.node.name,
      amount: parseFloat(edge.node.totalPriceSet.shopMoney.amount),
      currencyCode: edge.node.totalPriceSet.shopMoney.currencyCode,
      createdAt: edge.node.createdAt,
      createdAtDate: new Date(edge.node.createdAt)
    }));

    let current7DaysSales = 0;
    let previous7DaysSales = 0;

    allOrders.forEach(order => {
      if (order.createdAtDate.getTime() >= sevenDaysAgo.getTime() && order.createdAtDate.getTime() <= now.getTime()) {
        current7DaysSales += order.amount;
      } else if (order.createdAtDate.getTime() >= fourteenDaysAgo.getTime() && order.createdAtDate.getTime() < sevenDaysAgo.getTime()) {
        previous7DaysSales += order.amount;
      }
    });

    console.log(`Sales check for ${shop}: Current: $${current7DaysSales.toFixed(2)}, Previous: $${previous7DaysSales.toFixed(2)}`);

    // Check if sales are down AND sendSalesAlert is false
    if (current7DaysSales < previous7DaysSales && settings.sendSalesAlert === false) {
      console.log(`Sales alert triggered for ${shop} - sending alert`);
      
      // Send alert
      const alertResult = await sendAlert('orderGrowthLow', shop, settings);
      
      if (alertResult.sent) {
        // Set sendSalesAlert to true to prevent repeated alerts
        await prisma.alertSettings.update({
          where: { shop },
          data: { sendSalesAlert: true }
        });
        console.log(`Alert sent and flag set to true for ${shop}`);
      }
      
      return { checked: true, alertSent: alertResult.sent, currentSales: current7DaysSales, previousSales: previous7DaysSales };
    }
    
    // Reset flag if sales are back above previous week
    if (current7DaysSales >= previous7DaysSales && settings.sendSalesAlert === true) {
      console.log(`Sales back to safe zone for ${shop}, resetting alert flag to false`);
      await prisma.alertSettings.update({
        where: { shop },
        data: { sendSalesAlert: false }
      });
    }

    return { checked: true, alertSent: false, currentSales: current7DaysSales, previousSales: previous7DaysSales };
  } catch (error) {
    console.error('Error checking sales alert:', error);
    return { checked: false, error: error.message };
  }
}

// -------------------- Check Traffic Alert --------------------
export async function checkTrafficAlert(shop) {
  try {
    const settings = await prisma.alertSettings.findUnique({
      where: { shop },
      select: {
        trafficRateLow: true,
        sendTrafficAlert: true,
        alertEmail: true,
        slackWebhookUrl: true,
        slackEnabled: true,
        revenueRateLow: true,
        orderGrowthLow: true,
        trafficRateLow: true,
        conversionRateLow: true
      },
    });

    if (!settings || !settings.trafficRateLow) {
      return { checked: false, reason: "Alert not enabled or settings not found" };
    }

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const endOfToday = new Date(now.setHours(23, 59, 59, 999));
    const oneWeekAgo = new Date(startOfToday);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(startOfToday);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const currentWeekCount = await prisma.trafficEvent.count({
      where: {
        shopDomain: shop,
        eventDate: { gte: oneWeekAgo, lt: endOfToday },
      },
    });

    const previousWeekCount = await prisma.trafficEvent.count({
      where: {
        shopDomain: shop,
        eventDate: { gte: twoWeeksAgo, lt: oneWeekAgo },
      },
    });

    console.log(`Traffic check for ${shop}: Current week: ${currentWeekCount}, Previous week: ${previousWeekCount}`);

    // Check if traffic is down AND sendTrafficAlert is false
    if (currentWeekCount < previousWeekCount && settings.sendTrafficAlert === false) {
      console.log(`Traffic alert triggered for ${shop} - sending alert`);
      
      // Send alert
      const alertResult = await sendAlert('trafficRateLow', shop, settings);
      
      if (alertResult.sent) {
        // Set sendTrafficAlert to true to prevent repeated alerts
        await prisma.alertSettings.update({
          where: { shop },
          data: { sendTrafficAlert: true }
        });
        console.log(`Alert sent and flag set to true for ${shop}`);
      }
      
      return { checked: true, alertSent: alertResult.sent, currentWeek: currentWeekCount, previousWeek: previousWeekCount };
    }
    
    // Reset flag if traffic is back above previous week
    if (currentWeekCount >= previousWeekCount && settings.sendTrafficAlert === true) {
      console.log(`Traffic back to safe zone for ${shop}, resetting alert flag to false`);
      await prisma.alertSettings.update({
        where: { shop },
        data: { sendTrafficAlert: false }
      });
    }

    return { checked: true, alertSent: false, currentWeek: currentWeekCount, previousWeek: previousWeekCount };
  } catch (error) {
    console.error('Error checking traffic alert:', error);
    return { checked: false, error: error.message };
  }
}

// -------------------- Check All Alerts for a Shop --------------------
export async function checkAllAlerts(shop, admin) {
  console.log(`Checking all alerts for shop: ${shop}`);
  
  const results = {
    shop,
    timestamp: new Date().toISOString(),
    alerts: {}
  };

  // Check conversion rate alert
  results.alerts.conversionRate = await checkConversionRateAlert(shop, admin);
  
  // Check sales alert
  results.alerts.sales = await checkSalesAlert(shop, admin);
  
  // Check traffic alert
  results.alerts.traffic = await checkTrafficAlert(shop);

  console.log(`Alert check results for ${shop}:`, results);
  return results;
}

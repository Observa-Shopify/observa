import { json } from "@remix-run/node";
import nodemailer from "nodemailer";
import axios from "axios";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    // The payload is now a JSON object from the new trigger fetcher
    const { type } = await request.json();
    // console.log("sssssssss",type)

    const settings = await prisma.alertSettings.findUnique({ where: { shop } });
    if (!settings) {
        console.error("Settings not found for shop:", shop);
        return json({ sent: false, reason: "Settings not found." }, { status: 404 });
    }

    const { alertEmail, revenueRateLow, orderGrowthLow, trafficRateLow, conversionRateLow, slackWebhookUrl, slackEnabled } = settings;

    let isEmailEnabled = false;
    let isSlackEnabled = false;
    let alertMessage = "";

    // Determine the message and which notification types are enabled for this trigger
    switch (type) {
        case "slackTest":
            isSlackEnabled = slackEnabled;
            alertMessage = "*Slack Test Notification:* A test alert has been triggered for your Shopify store.";
            break;
        case "revenueRateLow":
            isEmailEnabled = revenueRateLow;
            isSlackEnabled = slackEnabled && revenueRateLow;
            alertMessage = "*🚨 Shopify Alert:* Low Revenue Rate detected for your store.";
            break;
        case "orderGrowthLow":
            isEmailEnabled = orderGrowthLow;
            isSlackEnabled = slackEnabled && orderGrowthLow;
            alertMessage = "*🚨 Shopify Alert:* Low Order Growth detected for your store.";
            break;
        case "trafficRateLow":
            isEmailEnabled = trafficRateLow;
            isSlackEnabled = slackEnabled && trafficRateLow;
            alertMessage = "*🚨 Shopify Alert:* Low Traffic Rate detected for your store.";
            break;
        case "conversionRateLow":
            isEmailEnabled = conversionRateLow;
            isSlackEnabled = slackEnabled && conversionRateLow;
            alertMessage = "*🚨 Shopify Alert:* Low Conversion Rate detected for your store.";
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
                subject: alertMessage.replace(/\*/g, ''), // Remove markdown for email subject
                text: alertMessage.replace(/\*/g, ''),
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
                text: alertMessage,
            });
            console.log("Slack notification sent successfully for type:", type);
        } catch (error) {
            console.error("Error sending to Slack:", error.response?.data || error.message);
        }
    }

    return json({ sent: true, type, sentEmail: isEmailEnabled && alertEmail, sentSlack: isSlackEnabled && slackWebhookUrl });
};
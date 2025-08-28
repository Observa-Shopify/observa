import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import prisma from "../db.server";
import { Card, Page, Layout, TextField, Checkbox, Button, Banner, Text, BlockStack } from "@shopify/polaris";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";

// -------------------- LOADER --------------------
export const loader = async ({ request }) => {
    const { admin, session } = await authenticate.admin(request);
    const shop = session.shop;
    let settings = await prisma.alertSettings.findUnique({ where: { shop } });

    if (!settings) {
        settings = await prisma.alertSettings.create({ data: { shop } });
    }

    return json({ settings });
};

// -------------------- ACTION --------------------
export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const form = await request.formData();

    // Checkbox values are now correctly handled due to the manual form data creation
    const data = {
        revenueRateLow: form.get("revenueRateLow") === "on",
        orderGrowthLow: form.get("orderGrowthLow") === "on",
        trafficRateLow: form.get("trafficRateLow") === "on",
        conversionRateLow: form.get("conversionRateLow") === "on",
        alertEmail: form.get("alertEmail") || null,
        slackWebhookUrl: form.get("slackWebhookUrl") || null,
        slackEnabled: form.get("slackEnabled") === "on",
        conversionRateThreshold: form.get("conversionRateThreshold")
            ? parseFloat(form.get("conversionRateThreshold"))
            : null, // <-- this was missing
    };

    await prisma.alertSettings.upsert({
        where: { shop },
        update: data,
        create: { ...data, shop },
    });

    return json({ success: true });
};

// -------------------- COMPONENT --------------------
export default function Settings() {
    const { settings } = useLoaderData();
    const saveFetcher = useFetcher();
    const triggerFetcher = useFetcher();
    const [alert, setAlert] = useState("");

    const [formState, setFormState] = useState({
        alertEmail: settings.alertEmail || "",
        slackWebhookUrl: settings.slackWebhookUrl || "",
        slackEnabled: settings.slackEnabled,
        revenueRateLow: settings.revenueRateLow,
        orderGrowthLow: settings.orderGrowthLow,
        trafficRateLow: settings.trafficRateLow,
        conversionRateLow: settings.conversionRateLow,
        conversionRateThreshold: settings.conversionRateThreshold || "", // NEW

    });

    useEffect(() => {
        setFormState({
            alertEmail: settings.alertEmail || "",
            slackWebhookUrl: settings.slackWebhookUrl || "",
            slackEnabled: settings.slackEnabled,
            revenueRateLow: settings.revenueRateLow,
            orderGrowthLow: settings.orderGrowthLow,
            trafficRateLow: settings.trafficRateLow,
            conversionRateLow: settings.conversionRateLow,
            conversionRateThreshold: settings.conversionRateThreshold || "", // NEW
        });
    }, [settings]);

    useEffect(() => {
        if (saveFetcher.data?.success) {
            // Optional: You could show a success toast here instead of a banner
        }
    }, [saveFetcher.data]);

    const handleTextChange = (field) => (value) => {
        setFormState((prev) => ({ ...prev, [field]: value }));
    };

    const handleCheckboxChange = (field) => (checked) => {
        setFormState((prev) => ({ ...prev, [field]: checked }));
    };

    const handleSave = (event) => {
        event.preventDefault(); // Prevent default form submission

        const formData = new FormData();
        // Manually append all state values to the FormData object
        formData.append("alertEmail", formState.alertEmail);
        formData.append("slackWebhookUrl", formState.slackWebhookUrl);
        // For booleans, convert to 'on' or 'off'
        formData.append("slackEnabled", formState.slackEnabled ? "on" : "off");
        formData.append("revenueRateLow", formState.revenueRateLow ? "on" : "off");
        formData.append("orderGrowthLow", formState.orderGrowthLow ? "on" : "off");
        formData.append("trafficRateLow", formState.trafficRateLow ? "on" : "off");
        formData.append("conversionRateLow", formState.conversionRateLow ? "on" : "off");
        formData.append("conversionRateThreshold", formState.conversionRateThreshold);


        // Submit the manually created form data
        saveFetcher.submit(formData, { method: "post" });
    };

    const triggerDummyAlert = (type) => {
        triggerFetcher.submit({ type }, {
            method: "post",
            action: "/app/settings/trigger",
            encType: "application/json"
        });
        setAlert(type);
        setTimeout(() => setAlert(""), 3000);
    };

    return (
        <Page title="Alert Settings">
            <Layout>
                <Layout.Section>
                    <saveFetcher.Form method="post" onSubmit={handleSave}>
                        <BlockStack gap="200">
                            <Card sectioned>
                                <BlockStack gap="4">
                                    <Text as="h2" variant="headingMd">Notification Settings</Text>
                                    <TextField
                                        label="Alert Email"
                                        name="alertEmail"
                                        value={formState.alertEmail}
                                        onChange={handleTextChange("alertEmail")}
                                        type="email"
                                        autoComplete="email"
                                        helpText="The email address where you'll receive alert notifications."
                                    />
                                    <TextField
                                        label="Slack Webhook URL"
                                        name="slackWebhookUrl"
                                        value={formState.slackWebhookUrl}
                                        onChange={handleTextChange("slackWebhookUrl")}
                                        helpText="The webhook URL for sending alerts to a Slack channel."
                                    />
                                </BlockStack>
                            </Card>

                            <Card sectioned>
                                <BlockStack gap="4">
                                    <Text as="h2" variant="headingMd">Alert Conditions</Text>
                                    <Text as="p" variant="bodyMd" color="subdued">
                                        Select the conditions that will trigger an alert email.
                                    </Text>
                                    <Checkbox
                                        label="Enable Slack Notifications"
                                        checked={formState.slackEnabled}
                                        onChange={handleCheckboxChange("slackEnabled")}
                                    />

                                    <Checkbox
                                        label="Enable alert for low revenue rate"
                                        helpText="Receive an email when your store's revenue falls below a predefined threshold."
                                        checked={formState.revenueRateLow}
                                        onChange={handleCheckboxChange("revenueRateLow")}
                                    />
                                    <Checkbox
                                        label="Enable alert for low order growth"
                                        helpText="Get notified if the number of new orders drops significantly compared to the average."
                                        checked={formState.orderGrowthLow}
                                        onChange={handleCheckboxChange("orderGrowthLow")}
                                    />
                                    <Checkbox
                                        label="Enable alert for low traffic rate"
                                        helpText="An alert will be sent if your store's web traffic experiences a sudden decline."
                                        checked={formState.trafficRateLow}
                                        onChange={handleCheckboxChange("trafficRateLow")}
                                    />
                                    <Checkbox
                                        label="Enable alert for low conversion rate"
                                        helpText="Be alerted when the percentage of visitors who make a purchase decreases."
                                        checked={formState.conversionRateLow}
                                        onChange={handleCheckboxChange("conversionRateLow")}
                                    />
                                    {formState.conversionRateLow && (
                                        <TextField
                                            label="Conversion Rate Threshold (%)"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={formState.conversionRateThreshold}
                                            onChange={handleTextChange("conversionRateThreshold")}
                                            helpText="Trigger alert if conversion rate drops below this percentage."
                                        />
                                    )}
                                </BlockStack>
                            </Card>

                            <Button secondary submit loading={saveFetcher.state === 'submitting'}>
                                Save Settings
                            </Button>

                            {saveFetcher.data?.success && (
                                <Banner status="success" title="Settings saved!">
                                    Your alert settings have been updated.
                                </Banner>
                            )}
                        </BlockStack>
                    </saveFetcher.Form>
                </Layout.Section>

                <Layout.Section>
                    <Card sectioned>
                        <BlockStack gap="4">
                            <Text as="h2" variant="headingMd">Test Your Alerts</Text>
                            <Text as="p" variant="bodyMd" color="subdued">
                                Click a button below to send a dummy alert to your configured email or Slack channel.
                            </Text>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <Button onClick={() => triggerDummyAlert("revenueRateLow")} disabled={!formState.revenueRateLow || triggerFetcher.state === 'submitting'}>
                                    Test Low Revenue
                                </Button>
                                <Button onClick={() => triggerDummyAlert("orderGrowthLow")} disabled={!formState.orderGrowthLow || triggerFetcher.state === 'submitting'}>
                                    Test Low Order Growth
                                </Button>
                                <Button onClick={() => triggerDummyAlert("trafficRateLow")} disabled={!formState.trafficRateLow || triggerFetcher.state === 'submitting'}>
                                    Test Low Traffic
                                </Button>
                                <Button onClick={() => triggerDummyAlert("conversionRateLow")} disabled={!formState.conversionRateLow || triggerFetcher.state === 'submitting'}>
                                    Test Low Conversion Rate
                                </Button>
                                <Button onClick={() => triggerDummyAlert("slackTest")} disabled={!formState.slackEnabled || !formState.slackWebhookUrl || triggerFetcher.state === 'submitting'}>
                                    Test Slack Notification
                                </Button>
                            </div>
                            {alert && (
                                <Banner status="info">
                                    Triggering dummy alert for: *{alert}*. Check your notifications shortly.
                                </Banner>
                            )}
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
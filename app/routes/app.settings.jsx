import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import prisma from "../db.server";
import { 
    Card, 
    Page, 
    TextField, 
    Checkbox, 
    Button, 
    Banner, 
    Text, 
    BlockStack, 
    InlineGrid, 
    Box, 
    Divider 
} from "@shopify/polaris";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import { useBreakpoints } from '@shopify/polaris';
import { SaveBar, useAppBridge } from '@shopify/app-bridge-react';

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
    const { smUp } = useBreakpoints();
    const shopify = useAppBridge();

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

    // Track if form has unsaved changes
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Client-side mount check
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Check for unsaved changes
    useEffect(() => {
        const hasChanges = 
            formState.alertEmail !== (settings.alertEmail || "") ||
            formState.slackWebhookUrl !== (settings.slackWebhookUrl || "") ||
            formState.slackEnabled !== settings.slackEnabled ||
            formState.revenueRateLow !== settings.revenueRateLow ||
            formState.orderGrowthLow !== settings.orderGrowthLow ||
            formState.trafficRateLow !== settings.trafficRateLow ||
            formState.conversionRateLow !== settings.conversionRateLow ||
            formState.conversionRateThreshold !== (settings.conversionRateThreshold || "");
        
        setHasUnsavedChanges(hasChanges);
    }, [formState, settings]);

    // Handle saveBar visibility - client-side only
    useEffect(() => {
        if (isMounted && shopify?.saveBar) {
            if (hasUnsavedChanges) {
                shopify.saveBar.show('settings-save-bar');
            } else {
                shopify.saveBar.hide('settings-save-bar');
            }
        }
    }, [hasUnsavedChanges, shopify, isMounted]);

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
        if (saveFetcher.data?.success && isMounted && shopify?.saveBar) {
            // Hide save bar after successful save - client-side only
            shopify.saveBar.hide('settings-save-bar');
        }
    }, [saveFetcher.data, shopify, isMounted]);

    const handleTextChange = (field) => (value) => {
        setFormState((prev) => ({ ...prev, [field]: value }));
    };

    const handleCheckboxChange = (field) => (checked) => {
        setFormState((prev) => ({ ...prev, [field]: checked }));
    };

    const handleSave = () => {
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

    const handleDiscard = () => {
        // Reset form state to original settings
        setFormState({
            alertEmail: settings.alertEmail || "",
            slackWebhookUrl: settings.slackWebhookUrl || "",
            slackEnabled: settings.slackEnabled,
            revenueRateLow: settings.revenueRateLow,
            orderGrowthLow: settings.orderGrowthLow,
            trafficRateLow: settings.trafficRateLow,
            conversionRateLow: settings.conversionRateLow,
            conversionRateThreshold: settings.conversionRateThreshold || "",
        });
        // Hide the save bar - client-side only
        if (isMounted && shopify?.saveBar) {
            shopify.saveBar.hide('settings-save-bar');
        }
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
        <>
            <Page 
                title="Alert Settings"
                divider
            >
                <saveFetcher.Form method="post">
                    <BlockStack gap={{ xs: "800", sm: "400" }}>
                        {/* Notification Settings Section */}
                        <InlineGrid columns={{ xs: "1fr", md: "2fr 5fr" }} gap="400">
                            <Box
                                as="section"
                                paddingInlineStart={{ xs: 400, sm: 0 }}
                                paddingInlineEnd={{ xs: 400, sm: 0 }}
                            >
                                <BlockStack gap="400">
                                    <Text as="h3" variant="headingMd">
                                        Notification Settings
                                    </Text>
                                    <Text as="p" variant="bodyMd">
                                        Configure how and where you want to receive alerts from your store monitoring system.
                                    </Text>
                                </BlockStack>
                            </Box>
                            <Card roundedAbove="sm">
                                <BlockStack gap="400">
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
                                    <Checkbox
                                        label="Enable Slack Notifications"
                                        checked={formState.slackEnabled}
                                        onChange={handleCheckboxChange("slackEnabled")}
                                        helpText="Allow the app to send notifications to your Slack channel."
                                    />
                                </BlockStack>
                            </Card>
                        </InlineGrid>

                        {smUp ? <Divider /> : null}

                        {/* Alert Conditions Section */}
                        <InlineGrid columns={{ xs: "1fr", md: "2fr 5fr" }} gap="400">
                            <Box
                                as="section"
                                paddingInlineStart={{ xs: 400, sm: 0 }}
                                paddingInlineEnd={{ xs: 400, sm: 0 }}
                            >
                                <BlockStack gap="400">
                                    <Text as="h3" variant="headingMd">
                                        Alert Conditions
                                    </Text>
                                    <Text as="p" variant="bodyMd">
                                        Choose which store performance metrics will trigger alerts when they fall below expected thresholds.
                                    </Text>
                                </BlockStack>
                            </Box>
                            <Card roundedAbove="sm">
                                <BlockStack gap="400">
                                    <Checkbox
                                        label="Low Revenue Rate Alert"
                                        helpText="Receive an email when your store's revenue falls below a predefined threshold."
                                        checked={formState.revenueRateLow}
                                        onChange={handleCheckboxChange("revenueRateLow")}
                                    />
                                    <Checkbox
                                        label="Low Order Growth Alert"
                                        helpText="Get notified if the number of new orders drops significantly compared to the average."
                                        checked={formState.orderGrowthLow}
                                        onChange={handleCheckboxChange("orderGrowthLow")}
                                    />
                                    <Checkbox
                                        label="Low Traffic Rate Alert"
                                        helpText="An alert will be sent if your store's web traffic experiences a sudden decline."
                                        checked={formState.trafficRateLow}
                                        onChange={handleCheckboxChange("trafficRateLow")}
                                    />
                                    <Checkbox
                                        label="Low Conversion Rate Alert"
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
                        </InlineGrid>

                        {smUp ? <Divider /> : null}

                        {/* Test Alerts Section */}
                        <InlineGrid columns={{ xs: "1fr", md: "2fr 5fr" }} gap="400">
                            <Box
                                as="section"
                                paddingInlineStart={{ xs: 400, sm: 0 }}
                                paddingInlineEnd={{ xs: 400, sm: 0 }}
                            >
                                <BlockStack gap="400">
                                    <Text as="h3" variant="headingMd">
                                        Test Alerts
                                    </Text>
                                    <Text as="p" variant="bodyMd">
                                        Send test notifications to verify your alert settings are working correctly.
                                    </Text>
                                </BlockStack>
                            </Box>
                            <Card roundedAbove="sm">
                                <BlockStack gap="400">
                                    <Text as="p" variant="bodyMd" color="subdued">
                                        Click a button below to send a test alert to your configured email or Slack channel.
                                    </Text>
                                    <InlineGrid columns={{ xs: 1, sm: 2 }} gap="200">
                                        <Button 
                                            onClick={() => triggerDummyAlert("revenueRateLow")} 
                                            disabled={!formState.revenueRateLow || triggerFetcher.state === 'submitting'}
                                            size="slim"
                                        >
                                            Test Low Revenue
                                        </Button>
                                        <Button 
                                            onClick={() => triggerDummyAlert("orderGrowthLow")} 
                                            disabled={!formState.orderGrowthLow || triggerFetcher.state === 'submitting'}
                                            size="slim"
                                        >
                                            Test Low Order Growth
                                        </Button>
                                        <Button 
                                            onClick={() => triggerDummyAlert("trafficRateLow")} 
                                            disabled={!formState.trafficRateLow || triggerFetcher.state === 'submitting'}
                                            size="slim"
                                        >
                                            Test Low Traffic
                                        </Button>
                                        <Button 
                                            onClick={() => triggerDummyAlert("conversionRateLow")} 
                                            disabled={!formState.conversionRateLow || triggerFetcher.state === 'submitting'}
                                            size="slim"
                                        >
                                            Test Low Conversion Rate
                                        </Button>
                                        <Button 
                                            onClick={() => triggerDummyAlert("slackTest")} 
                                            disabled={!formState.slackEnabled || !formState.slackWebhookUrl || triggerFetcher.state === 'submitting'}
                                            size="slim"
                                        >
                                            Test Slack Notification
                                        </Button>
                                    </InlineGrid>
                                    {alert && (
                                        <Banner status="info">
                                            Triggering test alert for: *{alert}*. Check your notifications shortly.
                                        </Banner>
                                    )}
                                </BlockStack>
                            </Card>
                        </InlineGrid>

                        {/* Success Banner */}
                        {saveFetcher.data?.success && (
                            <Banner status="success" title="Settings saved!">
                                Your alert settings have been updated successfully.
                            </Banner>
                        )}
                    </BlockStack>
                </saveFetcher.Form>
            </Page>

            {/* SaveBar Component */}
            <SaveBar id="settings-save-bar" discardConfirmation>
                <button 
                    variant="primary" 
                    onClick={handleSave}
                    disabled={saveFetcher.state === 'submitting'}
                    loading={saveFetcher.state === 'submitting' ? '' : undefined}
                >
                    Save Settings
                </button>
                <button onClick={handleDiscard}>
                    Discard Changes
                </button>
            </SaveBar>
        </>
    );
}
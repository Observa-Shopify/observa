import {
  Card,
  Page,
  Layout,
  BlockStack,
  Text,
  List,
  Link,
} from "@shopify/polaris";

export default function GuidePage() {
  return (
    <Page title="Setup Guide">
      <Layout>
        {/* Slack Webhook Card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">
                Get Slack Webhook URL
              </Text>
              <List type="number">
                <List.Item>
                  Go to Slack App Directory 👉 {" "}
                  <Link url="https://api.slack.com/apps" external>
                    https://api.slack.com/apps
                  </Link>
                </List.Item>
                <List.Item>Click “Create New App”</List.Item>
                <List.Item>Choose “From scratch”</List.Item>
                <List.Item>
                  Give it a name (like <strong>Observa Alerts</strong>)
                </List.Item>
                <List.Item>
                  Select the Slack workspace where you want alerts sent
                </List.Item>
                <List.Item>
                  In your app’s settings, go to <strong>Incoming Webhooks</strong>
                </List.Item>
                <List.Item>Toggle ON</List.Item>
                <List.Item>
                  Scroll down and click “Add New Webhook to Workspace”
                </List.Item>
                <List.Item>
                  Choose the channel where alerts should appear (e.g., #alerts)
                </List.Item>
                <List.Item>
                  Slack will generate a Webhook URL (keep it safe)
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Enable App Embed Card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">
                Enable App Embed
              </Text>
              <List type="number">
                <List.Item>
                  From your Shopify admin, go to {" "}
                  <strong>Online Store → Themes</strong>
                </List.Item>
                <List.Item>Click “Customize” on your active theme</List.Item>
                <List.Item>
                  In the left sidebar, click the <strong>App embeds</strong> icon
                  (puzzle piece)
                </List.Item>
                <List.Item>
                  Find <strong>Observa</strong> (your app) in the list
                </List.Item>
                <List.Item>Toggle the switch ON to enable it</List.Item>
                <List.Item>Click “Save” in the top-right corner</List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
import { Layout, Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { PlanCardStack, PlanCardType } from "@heymantle/polaris";
import { useMantle } from "@heymantle/react";

export default function PlansPage() {
  const { customer, plans, client } = useMantle();

  const handleSelectPlan = async ({ plan, discount }) => {
    const subscription = await client.subscribe({
      planId: plan.id,
      discountId: discount?.id,
      returnUrl: "/app/plans",
    });
    const url = subscription.confirmationUrl;
    open(url, "_top");
  };

  return (
    <Page>
      <TitleBar title="Select a plan" />
      <Layout>
        <Layout.Section>
          <PlanCardStack
            cardType={PlanCardType.Highlighted}
            customer={customer}
            plans={plans}
            onSelectPlan={handleSelectPlan}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
} 
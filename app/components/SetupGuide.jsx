import React, { useState, useId, useEffect } from 'react';
import {
  BlockStack,
  Card,
  Text,
  InlineStack,
  ButtonGroup,
  Button,
  ProgressBar,
  Box,
  Collapsible,
  Tooltip,
  Spinner,
  Icon,
  Popover,
  ActionList,
  Image,
} from '@shopify/polaris';
import {
  MenuHorizontalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  XIcon,
} from '@shopify/polaris-icons';
import styles from './SetupGuide.module.css';

const outlineSvg = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" stroke="#8A8A8A" strokeWidth="2" fill="none" />
  </svg>
);

function buildItems(settings, shopSlug, subscription) {
  const hasSlack = Boolean(settings?.slackWebhookUrl);
  const slackEnabled = Boolean(settings?.slackEnabled);
  const hasEmail = Boolean(settings?.alertEmail);
  const themeEditorUrl = `https://admin.shopify.com/store/${shopSlug}/themes/current/editor?context=apps`;
  const hasActiveSubscription = Boolean(subscription?.id);

  const items = [
    {
      id: 0,
      title: 'Subscribe to a Plan',
      description: hasActiveSubscription
        ? `You're currently subscribed to the ${subscription?.plan?.name || 'a plan'}. You can upgrade or change your plan anytime.`
        : 'Choose a plan that fits your needs to unlock all features and start monitoring your store performance.',
      image: {
        url: 'https://cdn.shopify.com/shopifycloud/shopify/assets/admin/home/onboarding/detail-images/home-onboard-share-store-b265242552d9ed38399455a5e4472c147e421cb43d72a0db26d2943b55bdb307.svg',
        alt: 'Subscription plan illustration',
      },
      complete: hasActiveSubscription,
      primaryButton: {
        content: hasActiveSubscription ? 'Manage Plan' : 'View Plans',
        props: { url: '/app/plans' },
      },
    },
    {
      id: 1,
      title: 'Connect Slack (Incoming Webhook)',
      description:
        'Create a Slack app webhook and paste the URL in Settings → Notification Settings → Slack Webhook URL, then enable Slack notifications.',
      image: {
        url: 'https://cdn.shopify.com/shopifycloud/shopify/assets/admin/home/onboarding/detail-images/home-onboard-share-store-b265242552d9ed38399455a5e4472c147e421cb43d72a0db26d2943b55bdb307.svg',
        alt: 'Slack webhook setup illustration',
      },
      complete: hasSlack && slackEnabled,
      primaryButton: {
        content: 'Open Settings',
        props: { url: '/app/settings' },
      },
    },
    {
      id: 2,
      title: 'Enable App Embed in Theme',
      description:
        'Open your Online Store Theme Editor and enable the Observa app embed so traffic tracking works across your storefront.',
      image: {
        url: 'https://cdn.shopify.com/shopifycloud/shopify/assets/admin/home/onboarding/shop_pay_task-70830ae12d3f01fed1da23e607dc58bc726325144c29f96c949baca598ee3ef6.svg',
        alt: 'Theme editor / app embed illustration',
      },
      complete: false,
      primaryButton: {
        content: 'Open Theme Editor',
        props: {
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.open(themeEditorUrl, '_blank', 'noopener,noreferrer');
            }
          },
        },
      },
    },
    {
      id: 3,
      title: 'Test Email & Mark Not Spam',
      description: hasEmail
        ? "Send a test email, locate it (inbox or spam), mark it 'Not spam' to improve deliverability, then mark this step complete."
        : 'Add an alert email in Settings first, then return to send a test email and mark it as not spam.',
      image: {
        url: 'https://cdn.shopify.com/shopifycloud/shopify/assets/admin/home/onboarding/shop_pay_task-70830ae12d3f01fed1da23e607dc58bc726325144c29f96c949baca598ee3ef6.svg',
        alt: 'Email deliverability test',
      },
      complete: false,
      primaryButton: hasEmail
        ? {
            content: 'Send Test Email',
            props: {
              onClick: async () => {
                try {
                  await fetch('/app/settings/trigger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'emailTest' }),
                  });
                } catch (e) {
                  console.error('Failed to send test email', e);
                }
              },
            },
          }
        : { content: 'Add Alert Email', props: { url: '/app/settings' } },
      secondaryButton: hasEmail
        ? {
            content: 'Mark Complete',
            props: {
              onClick: () => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('complete-step', { detail: { id: 3 } }));
                }
              },
            },
          }
        : undefined,
    },
  ];
  
  return items;
}

export const SetupGuideExample = ({ settings, shopSlug, subscription }) => {
  const [items, setItems] = useState(buildItems(settings, shopSlug, subscription));
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.id;
      if (typeof id === 'number') {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, complete: true } : it)));
      }
    };
    window.addEventListener('complete-step', handler);
    return () => window.removeEventListener('complete-step', handler);
  }, []);

  const onStepToggle = (id) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, complete: !it.complete } : it)));
  };

  const allDone = items.every((i) => i.complete);
  if (hidden || allDone) return null;

  return (
    <SetupGuide items={items} onDismiss={() => setHidden(true)} onStepComplete={onStepToggle} />
  );
};

export const SetupGuide = ({ onDismiss, onStepComplete, items }) => {
  const [expanded, setExpanded] = useState(items.findIndex((i) => !i.complete));
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const [popoverActive, setPopoverActive] = useState(false);
  const accessId = useId();
  const completedItemsLength = items.filter((i) => i.complete).length;

  return (
    <Card padding="0">
      <Box padding="400" paddingBlockEnd="400">
        <BlockStack>
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd">Setup Guide</Text>
            <ButtonGroup gap="tight" noWrap>
              <Popover
                active={popoverActive}
                onClose={() => setPopoverActive(false)}
                activator={
                  <Button
                    onClick={() => setPopoverActive((p) => !p)}
                    variant="tertiary"
                    icon={MenuHorizontalIcon}
                  />
                }
              >
                <ActionList
                  actionRole="menuitem"
                  items={[{
                    content: 'Dismiss',
                    onAction: onDismiss,
                    prefix: (
                      <div style={{ height: '1rem', width: '1rem', paddingTop: '.05rem' }}>
                        <Icon tone="subdued" source={XIcon} />
                      </div>
                    ),
                  }]}
                />
              </Popover>
              <Button
                variant="tertiary"
                icon={isGuideOpen ? ChevronUpIcon : ChevronDownIcon}
                onClick={() => {
                  setIsGuideOpen((prev) => {
                    if (!prev) setExpanded(items.findIndex((it) => !it.complete));
                    return !prev;
                  });
                }}
                ariaControls={accessId}
              />
            </ButtonGroup>
          </InlineStack>
          <Text as="p" variant="bodyMd">Use this personalized guide to get your app up and running.</Text>
          <div style={{ marginTop: '.8rem' }}>
            <InlineStack blockAlign="center" gap="200">
              {completedItemsLength === items.length ? (
                <div style={{ maxHeight: '1rem' }}>
                  <InlineStack wrap={false} gap="100">
                    <Icon source={CheckIcon} tone="subdued" accessibilityLabel="Completed" />
                    <Text as="p" variant="bodySm" tone="subdued">Done</Text>
                  </InlineStack>
                </div>
              ) : (
                <Text as="span" variant="bodySm">{`${completedItemsLength} / ${items.length} completed`}</Text>
              )}
              {completedItemsLength !== items.length && (
                <div style={{ width: '100px' }}>
                  <ProgressBar
                    progress={(completedItemsLength / items.length) * 100}
                    size="small"
                    tone="primary"
                    animated
                  />
                </div>
              )}
            </InlineStack>
          </div>
        </BlockStack>
      </Box>
      <Collapsible open={isGuideOpen} id={accessId}>
        <Box padding="200">
          <BlockStack gap="100">
            {items.map((item) => (
              <SetupItem
                key={item.id}
                expanded={expanded === item.id}
                setExpanded={() => setExpanded(item.id)}
                onComplete={onStepComplete}
                {...item}
              />
            ))}
          </BlockStack>
        </Box>
      </Collapsible>
      {completedItemsLength === items.length && (
        <Box background="bg-surface-secondary" borderBlockStartWidth="025" borderColor="border-secondary" padding="300">
          <InlineStack align="end">
            <Button onClick={onDismiss}>Dismiss Guide</Button>
          </InlineStack>
        </Box>
      )}
    </Card>
  );
};

const SetupItem = ({
  complete,
  onComplete,
  expanded,
  setExpanded,
  title,
  description,
  image,
  primaryButton,
  secondaryButton,
  id,
}) => {
  const [loading, setLoading] = useState(false);

  const toggleComplete = async () => {
    setLoading(true);
    await onComplete(id);
    setLoading(false);
  };

  return (
    <Box borderRadius="200" background={expanded && 'bg-surface-active'}>
      <div className={`${styles.setupItem} ${expanded ? styles.setupItemExpanded : ''}`}>
        <InlineStack gap="200" align="start" blockAlign="start" wrap={false}>
          <Tooltip content={complete ? 'Mark as not done' : 'Mark as done'} activatorWrapper="div">
            <Button onClick={toggleComplete} variant="monochromePlain">
              <div className={styles.completeButton}>
                {loading ? (
                  <Spinner size="small" />
                ) : complete ? (
                  <CheckIcon
                    style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      borderRadius: '100%',
                      background: '#303030',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fill: 'white',
                    }}
                  />
                ) : (
                  outlineSvg
                )}
              </div>
            </Button>
          </Tooltip>
          <div
            className={styles.itemContent}
            onClick={expanded ? undefined : setExpanded}
            style={{ cursor: expanded ? 'default' : 'pointer', paddingTop: '.15rem', width: '100%' }}
          >
            <BlockStack gap="300" id={id}>
              <Text as="h4" variant={expanded ? 'headingSm' : 'bodyMd'}>
                {title}
              </Text>
              <Collapsible open={expanded} id={id}>
                <Box paddingBlockEnd="150" paddingInlineEnd="150">
                  <BlockStack gap="400">
                    <Text as="p" variant="bodyMd">{description}</Text>
                    {(primaryButton || secondaryButton) && (
                      <ButtonGroup gap="loose">
                        {primaryButton && (
                          <Button variant="primary" {...primaryButton.props}>
                            {primaryButton.content}
                          </Button>
                        )}
                        {secondaryButton && (
                          <Button variant="tertiary" {...secondaryButton.props}>
                            {secondaryButton.content}
                          </Button>
                        )}
                      </ButtonGroup>
                    )}
                  </BlockStack>
                </Box>
              </Collapsible>
            </BlockStack>
            {image && expanded && (
              <Image className={styles.itemImage} source={image.url} alt={image.alt} style={{ maxHeight: '7.75rem' }} />
            )}
          </div>
        </InlineStack>
      </div>
    </Box>
  );
};

export { outlineSvg }; // optional export if needed elsewhere

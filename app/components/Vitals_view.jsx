import React from "react";
import {
    Card,
    Text,
    BlockStack,
    Badge,
    EmptyState,
} from "@shopify/polaris";
import { 
    MetricCard, 
    StatsGrid, 
    ProgressCircle,
    EmptyDataState 
} from './shared';
import { 
    APP_CONSTANTS, 
    formatNumber, 
    parseMetricValue 
} from '../utils';

// Default shape for fallback
const defaultMetrics = {
    cls: 0,
    ttfb: 0,
    fcp: 0,
    lcp: 0,
    memory: {},
    network: {},
};

const calculateScore = (key, value) => {
    if (value == null || value === 'N/A') return 0;
    const numeric = parseMetricValue(value);
    const thresholds = APP_CONSTANTS.METRICS.VITALS;

    switch (key) {
        case 'ttfb': 
            return numeric < thresholds.TTFB.GOOD ? 100 : 
                   numeric < thresholds.TTFB.NEEDS_IMPROVEMENT ? 60 : 20;
        case 'fcp': 
            return numeric < thresholds.FCP.GOOD ? 100 : 
                   numeric < thresholds.FCP.NEEDS_IMPROVEMENT ? 60 : 20;
        case 'lcp': 
            return numeric < thresholds.LCP.GOOD ? 100 : 
                   numeric < thresholds.LCP.NEEDS_IMPROVEMENT ? 60 : 20;
        case 'cls': 
            return numeric < thresholds.CLS.GOOD ? 100 : 
                   numeric < thresholds.CLS.NEEDS_IMPROVEMENT ? 60 : 20;
        case 'dnsTime':
        case 'sslTime':
        case 'tcpTime':
        case 'requestTime':
        case 'responseTime':
        case 'domInteractive':
        case 'domLoad':
        case 'totalBlockingTime':
        case 'fullLoad':
        case 'fid':
            return numeric < 500 ? 100 : numeric < 1500 ? 60 : 20;
        default: 
            return 100;
    }
};

const getScoreColor = (score) => {
    if (score >= 90) return APP_CONSTANTS.COLORS.SUCCESS;
    if (score >= 60) return APP_CONSTANTS.COLORS.WARNING;
    return APP_CONSTANTS.COLORS.CRITICAL;
};

const getBadgeTone = (score) => {
    if (score >= 90) return 'success';
    if (score >= 60) return 'warning';
    return 'critical';
};

const metricLabels = {
    cls: "Cumulative Layout Shift",
    ttfb: "Time to First Byte",
    fcp: "First Contentful Paint", 
    lcp: "Largest Contentful Paint",
    dnsTime: "DNS Lookup Time",
    sslTime: "SSL Handshake Time",
    tcpTime: "TCP Connection Time",
    requestTime: "Request Time",
    responseTime: "Response Time",
    domInteractive: "DOM Interactive",
    domLoad: "DOM Load Time",
    totalBlockingTime: "Total Blocking Time",
    fullLoad: "Full Load Time",
    fid: "First Input Delay"
};

const VitalsView = ({ metrics }) => {
    const hasData = metrics && Object.entries(metrics).some(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
            return Object.entries(value).some(([k, v]) => v !== null && v !== 0 && v !== '0');
        }
        return parseMetricValue(value) > 0;
    });

    if (!hasData) {
        return (
            <Card>
                <EmptyDataState
                    title="No vitals data available"
                    message="Core Web Vitals data will appear here once your store receives traffic and the tracking is active."
                />
            </Card>
        );
    }

    const safeMetrics = { ...defaultMetrics, ...metrics };
    
    // Core Web Vitals
    const coreVitals = [
        { key: 'cls', label: metricLabels.cls, value: safeMetrics.cls, unit: '' },
        { key: 'ttfb', label: metricLabels.ttfb, value: safeMetrics.ttfb, unit: 'ms' },
        { key: 'fcp', label: metricLabels.fcp, value: safeMetrics.fcp, unit: 'ms' },
        { key: 'lcp', label: metricLabels.lcp, value: safeMetrics.lcp, unit: 'ms' },
    ];

    // Network metrics
    const networkMetrics = Object.entries(safeMetrics.network || {})
        .filter(([key, value]) => value != null && value !== 0)
        .map(([key, value]) => ({
            key,
            label: metricLabels[key] || key,
            value,
            unit: 'ms'
        }));

    // Memory metrics 
    const memoryMetrics = Object.entries(safeMetrics.memory || {})
        .filter(([key, value]) => value != null && value !== 0)
        .map(([key, value]) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value,
            unit: 'MB'
        }));

    const renderMetricCard = (metric) => {
        const score = calculateScore(metric.key, metric.value);
        const color = getScoreColor(score);
        const tone = getBadgeTone(score);
        const numericValue = parseMetricValue(metric.value);
        const displayValue = numericValue > 0 ? `${formatNumber(numericValue)}${metric.unit}` : 'N/A';

        return (
            <MetricCard
                key={metric.key}
                title={metric.label}
                value={displayValue}
                formatValue={false}
                badge={{ text: `${score}/100`, tone }}
                icon={
                    <ProgressCircle
                        percentage={score}
                        color={color}
                        size={35}
                        label={`${score}%`}
                    />
                }
            />
        );
    };

    return (
        <BlockStack gap="500">
            {/* Core Web Vitals */}
            <Card>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Core Web Vitals</Text>
                    <StatsGrid columns={{ xs: 2, md: 4 }}>
                        {coreVitals.map(renderMetricCard)}
                    </StatsGrid>
                </BlockStack>
            </Card>

            {/* Network Performance */}
            {networkMetrics.length > 0 && (
                <Card>
                    <BlockStack gap="400">
                        <Text as="h2" variant="headingLg">Network Performance</Text>
                        <StatsGrid columns={{ xs: 2, md: 3, lg: 4 }}>
                            {networkMetrics.map(renderMetricCard)}
                        </StatsGrid>
                    </BlockStack>
                </Card>
            )}

            {/* Memory Usage */}
            {memoryMetrics.length > 0 && (
                <Card>
                    <BlockStack gap="400">
                        <Text as="h2" variant="headingLg">Memory Usage</Text>
                        <StatsGrid columns={{ xs: 2, md: 3 }}>
                            {memoryMetrics.map(renderMetricCard)}
                        </StatsGrid>
                    </BlockStack>
                </Card>
            )}
        </BlockStack>
    );
};

export default VitalsView;
                    <EmptyState
                        heading="No Vitals to show"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                        <p>Enable App Embed and visit your storefront to fetch vitals.</p>
                    </EmptyState>
                </LegacyCard>
            </div>
        );
    }

    const mergedMetrics = { ...defaultMetrics, ...metrics };
    const { memory, network, ...mainMetrics } = mergedMetrics;

    const renderCircularMetric = (key, value) => {
        const numericValue = parseMetricValue(value);
        const score = calculateScore(key, value);
        const color = getColor(score);

        const data = [
            { name: key, value: score, fill: color },
            { name: 'remaining', value: 100 - score, fill: '#f0f0f0' }
        ];

        const keysWithMs = [
            'ttfb', 'fcp', 'lcp', 'fid', 'rtt', 'domLoad',
            'fullLoad', 'tcpTime', 'ssl', 'dnsTime'
        ];

        const displayUnit = keysWithMs.includes(key.toLowerCase()) ? 'ms' : '';
        const displayValue = numericValue !== null && !isNaN(numericValue)
            ? `${numericValue} ${displayUnit}`.trim()
            : 'N/A';

        const badgeText = badgeNames[key] || key;

        return (
            <Card key={key} roundedAbove="sm" padding="400" background="bg-surface-secondary">
                <BlockStack gap="200" align="center">
                    <Text variant="headingSm" as="h3">{key.toUpperCase()}</Text>
                    <div style={{ position: 'relative', width: '100%', height: 160 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                cx="50%"
                                cy="50%"
                                innerRadius="60%"
                                outerRadius="95%"
                                barSize={2}
                                data={data}
                                startAngle={90}
                                endAngle={-270}
                            >
                                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                <RadialBar
                                    minAngle={15}
                                    clockWise
                                    dataKey="value"
                                    background
                                    cornerRadius={10}
                                />
                            </RadialBarChart>
                        </ResponsiveContainer>

                        {/* Centered Score Text */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                            }}
                        >
                            <Text variant="bodyLg" fontWeight="bold">{displayValue}</Text>
                            <Text variant="bodySm" tone="subdued">Score: {score}</Text>
                        </div>

                    </div>


                    <Badge tone={score >= 90 ? 'success' : score >= 60 ? 'warning' : 'critical'}>
                        <span style={{ padding: '4px', display: 'block' }}>{badgeText}</span>
                    </Badge>
                </BlockStack>
            </Card>
        );
    };

    return (
        <Page title="Average Web Vitals (Aggregated)">
            <BlockStack gap="300">
                <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }} gap="300">
                    {Object.entries(mainMetrics).map(([key, value]) => renderCircularMetric(key, value))}
                </Grid>

                <Card title="Memory Usage (Avg)" roundedAbove="sm" padding="400" background="bg-surface-secondary" sectioned>
                    <BlockStack gap="300">
                        <Badge tone="highlight">Memory Info</Badge>
                        {Object.keys(memory).length > 0 ? (
                            <InlineGrid gap="400" columns={{ xs: 1, sm: 2, md: 3 }}>
                                {['usedMB', 'totalMB', 'limitMB'].map((key) => {
                                    const value = memory[key] ?? 0;
                                    const label = key.replace(/MB$/, '').toUpperCase();

                                    const usedMB = memory.usedMB ?? 0;
                                    const limitMB = memory.limitMB ?? 1;
                                    const remainingMB = Math.max(0, limitMB - usedMB).toFixed(2);

                                    const progress = key === 'limitMB'
                                        ? 100
                                        : Math.min(100, ((usedMB / limitMB) * 100).toFixed(0));
                                    const progressColor = progress < 60 ? '#52c41a' : progress < 90 ? '#faad14' : '#ff4d4f';

                                    return (
                                        <Card key={key} roundedAbove="sm" padding="300" background="bg-surface">
                                            <BlockStack gap="150" align="center">
                                                <Text variant="headingSm" as="h3">{label}</Text>
                                                <Text variant="bodyLg" fontWeight="semibold">{value} MB</Text>

                                                {key !== 'limitMB' && (
                                                    <>
                                                        <div
                                                            style={{
                                                                width: '100%',
                                                                backgroundColor: '#f4f4f4',
                                                                borderRadius: '999px',
                                                                height: '10px',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    width: `${progress}%`,
                                                                    backgroundColor: progressColor,
                                                                    height: '100%',
                                                                    borderRadius: '999px',
                                                                    transition: 'width 0.4s ease',
                                                                }}
                                                            />
                                                        </div>

                                                        <Text variant="bodySm" tone="subdued">
                                                            {usedMB} MB used / {limitMB} MB limit
                                                        </Text>
                                                        <Text variant="bodySm" tone="subdued">
                                                            Remaining: {remainingMB} MB
                                                        </Text>
                                                    </>
                                                )}
                                            </BlockStack>
                                        </Card>
                                    );
                                })}
                            </InlineGrid>
                        ) : (
                            <Text variant="bodyLg">No memory data available</Text>
                        )}
                    </BlockStack>
                </Card>

                <Card title="Network Information (Avg)" roundedAbove="sm" padding="400" background="bg-surface-secondary" sectioned>
                    <BlockStack gap="300">
                        <Badge tone="caution">Network Status</Badge>

                        {Object.keys(network).length > 0 ? (
                            <InlineGrid gap="400" columns={{ xs: 1, sm: 2, md: 3 }}>
                                {['downlink', 'effectiveType', 'rtt'].map((key) => {
                                    const value = network[key] ?? 'N/A';
                                    const label = key.toUpperCase();

                                    let icon = '📶';
                                    let displayValue = value;

                                    if (key === 'downlink') {
                                        icon = '⬇️';
                                        displayValue = `${value} Mbps`;
                                    } else if (key === 'effectiveType') {
                                        icon = '🌐';
                                        displayValue = value.toString().toUpperCase();
                                    } else if (key === 'rtt') {
                                        icon = '⚡';
                                        displayValue = `${value} ms`;
                                    }


                                    const numeric = parseFloat(value) || 0;
                                    const color = key === 'rtt'
                                        ? (numeric < 100 ? '#52c41a' : numeric < 300 ? '#faad14' : '#ff4d4f')
                                        : key === 'downlink'
                                            ? (numeric > 5 ? '#52c41a' : numeric > 1 ? '#faad14' : '#ff4d4f')
                                            : '#1890ff';

                                    return (
                                        <Card key={key} roundedAbove="sm" padding="300" background="bg-surface">
                                            <BlockStack gap="150" align="center">
                                                <Text variant="headingMd" as="h3">{icon}</Text>
                                                <Text variant="headingSm" as="h3" tone="subdued">{label}</Text>
                                                <Text variant="bodyLg" fontWeight="semibold" style={{ color }}>
                                                    {displayValue}
                                                </Text>
                                            </BlockStack>
                                        </Card>
                                    );
                                })}
                            </InlineGrid>
                        ) : (
                            <Text variant="bodyLg">No network data available</Text>
                        )}
                    </BlockStack>
                </Card>
            </BlockStack>
        </Page>
    );
};

export default Vitals_view;
import React from "react";
import {
    Card,
    Text,
    BlockStack,
    Badge,
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

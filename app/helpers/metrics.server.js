import prisma from "../db.server";

// Save individual metrics to the database
export async function saveMetricsToDB(shop, metrics) {
    const parseMs = (value) =>
        typeof value === "string" && value.endsWith("ms")
            ? parseInt(value.replace("ms", ""), 10)
            : null;

    const parseFloatSafe = (value) =>
        isNaN(parseFloat(value)) ? null : parseFloat(value);

    // No magic values here, but if you add more, import from config/constants.js
    return await prisma.metric.create({
        data: {
            shop,
            ttfb: parseMs(metrics.ttfb),
            fcp: parseMs(metrics.fcp),
            lcp: parseMs(metrics.lcp),
            fid: parseMs(metrics.fid),
            cls: parseFloatSafe(metrics.cls),
            domLoad: parseMs(metrics.domLoad),
            fullLoad: parseMs(metrics.fullLoad),
            dnsTime: parseMs(metrics.dnsTime),
            tcpTime: parseMs(metrics.tcpTime),
            sslTime: parseMs(metrics.sslTime),
            requestTime: parseMs(metrics.requestTime),
            responseTime: parseMs(metrics.responseTime),
            domInteractive: parseMs(metrics.domInteractive),
            firstPaint: parseMs(metrics.firstPaint),
            totalBlockingTime: parseMs(metrics.totalBlockingTime),
            usedMemoryMB: metrics.memory?.usedMB ?? null,
            totalMemoryMB: metrics.memory?.totalMB ?? null,
            limitMemoryMB: metrics.memory?.limitMB ?? null,
            networkType: metrics.network?.type ?? null,
            rtt: metrics.network?.rtt ?? null,
            downlink: metrics.network?.downlink ?? null,
            saveData: metrics.network?.saveData ?? null,
        },
    });
}

// Get average metrics for a given shop
export async function getAggregatedMetrics(shop) {
    const records = await prisma.metric.findMany({
        where: { shop },
    });

    if (!records.length) return null;

    const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const avgFloat = (arr) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3) : null;

    return {
        ttfb: avg(records.map(r => r.ttfb).filter(Boolean)),
        cls: avgFloat(records.map(r => r.cls).filter(Boolean)),
        fcp: avg(records.map(r => r.fcp).filter(Boolean)),
        lcp: avg(records.map(r => r.lcp).filter(Boolean)),
        domLoad: avg(records.map(r => r.domLoad).filter(Boolean)),
        fullLoad: avg(records.map(r => r.fullLoad).filter(Boolean)),
        fid: avg(records.map(r => r.fid).filter(Boolean)),
        dnsTime: avg(records.map(r => r.dnsTime).filter(Boolean)),
        tcpTime: avg(records.map(r => r.tcpTime).filter(Boolean)),
        sslTime: avg(records.map(r => r.sslTime).filter(Boolean)),
        requestTime: avg(records.map(r => r.requestTime).filter(Boolean)),
        responseTime: avg(records.map(r => r.responseTime).filter(Boolean)),
        domInteractive: avg(records.map(r => r.domInteractive).filter(Boolean)),
        firstPaint: avg(records.map(r => r.firstPaint).filter(Boolean)),
        totalBlockingTime: avg(records.map(r => r.totalBlockingTime).filter(Boolean)),
        memory: {
            usedMB: avgFloat(records.map(r => r.usedMemoryMB).filter(Boolean)),
            totalMB: avgFloat(records.map(r => r.totalMemoryMB).filter(Boolean)),
            limitMB: avgFloat(records.map(r => r.limitMemoryMB).filter(Boolean)),
        },
        network: {
            downlink: avgFloat(records.map(r => r.downlink).filter(Boolean)),
            rtt: avg(records.map(r => r.rtt).filter(Boolean)),
            effectiveType: '3g', // Placeholder, update if needed
            saveData: false,     // Optional logic to average booleans can be added
        }
    };
}

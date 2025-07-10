(function () {
    const metrics = {
        ttfb: 'N/A', fcp: 'N/A', lcp: 'N/A', fid: 'N/A', cls: '0.000',
        domLoad: 'N/A', fullLoad: 'N/A', dnsTime: 'N/A', tcpTime: 'N/A',
        sslTime: 'N/A', requestTime: 'N/A', responseTime: 'N/A',
        domInteractive: 'N/A', firstPaint: 'N/A', totalBlockingTime: '0ms',
        memory: null, network: null,
    };

    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
        const toMs = (v) => isFinite(v) && v >= 0 ? `${v.toFixed(0)}ms` : 'N/A';

        metrics.ttfb = toMs(nav.responseStart - nav.requestStart);
        metrics.dnsTime = toMs(nav.domainLookupEnd - nav.domainLookupStart);
        metrics.tcpTime = toMs(nav.connectEnd - nav.connectStart);
        metrics.sslTime = nav.secureConnectionStart > 0 ? toMs(nav.connectEnd - nav.secureConnectionStart) : '0ms';
        metrics.requestTime = toMs(nav.responseStart - nav.requestStart);
        metrics.responseTime = toMs(nav.responseEnd - nav.responseStart);
        metrics.domInteractive = toMs(nav.domInteractive - nav.startTime);
        metrics.domLoad = toMs(nav.domContentLoadedEventEnd - nav.startTime);
        metrics.fullLoad = nav.loadEventEnd > 0 ? toMs(nav.loadEventEnd - nav.startTime) : 'N/A';

        console.log(`Time to first byte (TTFB): ${nav.responseStart - nav.requestStart}ms`);
        console.log(`DOM Content Loaded: ${nav.domContentLoadedEventEnd - nav.navigationStart}ms`);
        console.log(`Full Page Load: ${nav.loadEventEnd - nav.navigationStart}ms`);
    }

    if (performance.memory) {
        const mem = performance.memory;
        metrics.memory = {
            usedMB: +(mem.usedJSHeapSize / 1048576).toFixed(2),
            totalMB: +(mem.totalJSHeapSize / 1048576).toFixed(2),
            limitMB: +(mem.jsHeapSizeLimit / 1048576).toFixed(2),
        };
    }

    if (navigator.connection) {
        metrics.network = {
            type: navigator.connection.effectiveType,
            rtt: navigator.connection.rtt,
            downlink: navigator.connection.downlink,
            saveData: navigator.connection.saveData
        };
    }

    let totalBlocking = 0;

    const perfObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
            switch (entry.entryType) {
                case 'paint':
                    if (entry.name === 'first-paint') {
                        metrics.firstPaint = `${entry.startTime.toFixed(0)}ms`;
                        console.log(`First Paint: ${entry.startTime}ms`);
                    }
                    if (entry.name === 'first-contentful-paint') {
                        metrics.fcp = `${entry.startTime.toFixed(0)}ms`;
                        console.log(`First Contentful Paint: ${entry.startTime}ms`);
                    }
                    break;
                case 'largest-contentful-paint':
                    metrics.lcp = `${entry.startTime.toFixed(0)}ms`;
                    console.log(`Largest Contentful Paint: ${entry.startTime}ms`);
                    break;
                case 'layout-shift':
                    if (!entry.hadRecentInput) metrics.cls = (parseFloat(metrics.cls) + entry.value).toFixed(3);
                    break;
                case 'first-input':
                    const fid = entry.processingStart - entry.startTime;
                    metrics.fid = isFinite(fid) ? `${fid.toFixed(0)}ms` : 'N/A';
                    break;
                case 'longtask':
                    totalBlocking += Math.max(0, entry.duration - 50);
                    console.log(`Long task detected: ${entry.name || 'anonymous'} - ${entry.duration}ms`);
                    break;
            }
        });
    });

    perfObserver.observe({
        entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input', 'longtask'],
        buffered: true
    });

    if (window.PerformanceObserver) {
        const longTaskObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                if (entry.entryType === 'longtask') {
                    console.log(`Long task detected: ${entry.name || 'anonymous'} - ${entry.duration}ms`);
                }
            });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
    }

    if (window.PerformanceObserver) {
        const paintObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
                console.log(`First Contentful Paint: ${fcpEntry.startTime}ms`);
                paintObserver.disconnect();
            }
        });
        paintObserver.observe({ type: 'paint', buffered: true });
    }

    if (window.PerformanceObserver) {
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lcpEntry = entries[entries.length - 1];
            if (lcpEntry) {
                console.log(`Largest Contentful Paint: ${lcpEntry.startTime}ms`);
            }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            if (metrics.fcp === 'N/A') {
                const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
                if (fcpEntry) metrics.fcp = `${fcpEntry.startTime.toFixed(0)}ms`;
            }

            if (metrics.lcp === 'N/A') {
                const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
                if (lcpEntries.length) {
                    const lastLcp = lcpEntries[lcpEntries.length - 1];
                    metrics.lcp = `${lastLcp.startTime.toFixed(0)}ms`;
                }
            }

            if (metrics.fullLoad === 'N/A') {
                const navTiming = performance.getEntriesByType('navigation')[0];
                if (navTiming && navTiming.loadEventEnd > 0) {
                    const toMs = (v) => isFinite(v) && v >= 0 ? `${v.toFixed(0)}ms` : 'N/A';
                    metrics.fullLoad = toMs(navTiming.loadEventEnd - navTiming.startTime);
                }
            }

            metrics.totalBlockingTime = `${Math.max(0, totalBlocking.toFixed(0))}ms`;

            console.group('%c📊 Website Performance Metrics', 'color: green; font-weight: bold;');
            console.log('Core Timings:', {
                ttfb: metrics.ttfb, firstPaint: metrics.firstPaint, fcp: metrics.fcp,
                lcp: metrics.lcp, fid: metrics.fid, cls: metrics.cls, totalBlockingTime: metrics.totalBlockingTime
            });
            console.log('Page Load Phases:', {
                dnsTime: metrics.dnsTime, tcpTime: metrics.tcpTime, sslTime: metrics.sslTime,
                requestTime: metrics.requestTime, responseTime: metrics.responseTime,
                domInteractive: metrics.domInteractive, domLoad: metrics.domLoad, fullLoad: metrics.fullLoad
            });
            console.log('Memory:', metrics.memory || 'Not available');
            console.log('Network:', metrics.network || 'Not available');
            console.groupEnd();

            fetch('http://localhost:11124/api/vitals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metrics)
            }).then(r => console.log('Metrics sent:', r.status))
                .catch(e => console.error('Send failed:', e));

            window._SHOPIFY_PERF_METRICS_ = metrics;
        }, 3000);
    });
})();

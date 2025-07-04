/**
 * Function to log performance metrics to the console.
 * It uses PerformanceObserver to capture most metrics asynchronously.
 * It also includes initial navigation timing measurements.
 */
function logPagePerformanceInsights() {
    console.groupCollapsed('🚀 Initial Page Load Metrics');

    // --- 1. Basic Navigation Timing (Legacy but still useful for quick checks) ---
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const navigationStart = timing.navigationStart;

        console.log('--- Legacy Performance.timing Metrics ---');
        console.log(`Navigation Start: ${navigationStart}ms`);
        console.log(`Redirect Time: ${timing.redirectEnd - timing.redirectStart}ms`);
        console.log(`DNS Lookup Time: ${timing.domainLookupEnd - timing.domainLookupStart}ms`);
        console.log(`TCP Connection Time: ${timing.connectEnd - timing.connectStart}ms`);
        console.log(`Time to First Byte (TTFB - Legacy): ${timing.responseStart - timing.requestStart}ms`);
        console.log(`Response Time: ${timing.responseEnd - timing.responseStart}ms`);
        console.log(`DOM Interactive: ${timing.domInteractive - navigationStart}ms`);
        console.log(`DOM Content Loaded (Legacy): ${timing.domContentLoadedEventEnd - navigationStart}ms`);
        console.log(`Full Page Load (Legacy): ${timing.loadEventEnd - navigationStart}ms`);
        console.log(`Unload Event Time: ${timing.unloadEventEnd - timing.unloadEventStart}ms`);
    } else {
        console.warn('`window.performance.timing` not available.');
    }

    // --- 2. PerformanceNavigationTiming (More accurate navigation details) ---
    if (window.performance && window.performance.getEntriesByType) {
        const navTiming = window.performance.getEntriesByType('navigation')[0];
        if (navTiming) {
            console.log('\n--- PerformanceNavigationTiming Details ---');
            console.log(`Entry Type: ${navTiming.entryType}`);
            console.log(`Name: ${navTiming.name}`);
            console.log(`Duration (Total): ${navTiming.duration.toFixed(2)}ms`);
            console.log(`Start Time: ${navTiming.startTime.toFixed(2)}ms`);
            console.log(`Initiator Type: ${navTiming.initiatorType}`);
            console.log(`Next Hop Protocol: ${navTiming.nextHopProtocol}`);
            console.log(`Secure Connection: ${navTiming.secureConnectionStart > 0 ? (navTiming.connectEnd - navTiming.secureConnectionStart).toFixed(2) + 'ms' : 'N/A'}`);
            console.log(`Redirect Time (Navigation): ${navTiming.redirectEnd - navTiming.redirectStart}ms`);
            console.log(`DNS Lookup Time (Navigation): ${navTiming.domainLookupEnd - navTiming.domainLookupStart}ms`);
            console.log(`TCP Connect Time (Navigation): ${navTiming.connectEnd - navTiming.connectStart}ms`);
            console.log(`Time to First Byte (TTFB): ${(navTiming.responseStart - navTiming.requestStart).toFixed(2)}ms (Good: < 800ms)`);
            console.log(`Response Transfer Time: ${(navTiming.responseEnd - navTiming.responseStart).toFixed(2)}ms`);
            console.log(`DOM Content Loaded: ${(navTiming.domContentLoadedEventEnd - navTiming.startTime).toFixed(2)}ms (Good: < 3000ms)`);
            console.log(`Load Event Time: ${(navTiming.loadEventEnd - navTiming.startTime).toFixed(2)}ms`);
        } else {
            console.warn('`PerformanceNavigationTiming` entry not found.');
        }
    } else {
        console.warn('`window.performance.getEntriesByType` not available for navigation timing.');
    }

    console.groupEnd(); // End Initial Page Load Metrics group

    console.groupCollapsed('⚡ Real-time Metrics (via PerformanceObserver)');

    let cumulativeLayoutShift = 0;
    let totalBlockingTime = 0;
    let lcpReported = false;
    let fcpReported = false;
    let inpValue = 0; // Will store the max interaction duration

    // --- 3. PerformanceObserver for Core Web Vitals and other key metrics ---
    if (window.PerformanceObserver) {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                switch (entry.entryType) {
                    case 'paint':
                        // First Paint (FP) and First Contentful Paint (FCP)
                        if (!fcpReported && entry.name === 'first-contentful-paint') {
                            console.log(`\n--- First Contentful Paint (FCP) ---`);
                            console.log(`FCP: ${entry.startTime.toFixed(2)}ms (Good: < 1800ms)`);
                            fcpReported = true;
                        } else if (entry.name === 'first-paint') {
                            console.log(`First Paint (FP): ${entry.startTime.toFixed(2)}ms`);
                        }
                        break;

                    case 'largest-contentful-paint':
                        // Largest Contentful Paint (LCP)
                        if (!lcpReported) {
                            console.log(`\n--- Largest Contentful Paint (LCP) ---`);
                            console.log(`LCP: ${entry.startTime.toFixed(2)}ms (Good: < 2500ms)`);
                            console.log(`LCP Element: ${entry.element ? entry.element.tagName : 'N/A'}`);
                            if (entry.element) {
                                console.log('LCP Element HTML:', entry.element.outerHTML);
                            }
                            console.log(`LCP URL: ${entry.url || 'N/A'}`);
                            lcpReported = true; // LCP can shift, you might want to log the final one or all
                        }
                        break;

                    case 'layout-shift':
                        // Cumulative Layout Shift (CLS)
                        if (!entry.hadRecentInput) { // Exclude shifts directly caused by user interaction
                            cumulativeLayoutShift += entry.value;
                            console.log(`\n--- Cumulative Layout Shift (CLS) Update ---`);
                            console.log(`Individual Shift Value: ${entry.value.toFixed(4)}`);
                            console.log(`Current CLS: ${cumulativeLayoutShift.toFixed(4)} (Good: < 0.1)`);
                            if (entry.sources && entry.sources.length > 0) {
                                console.log('Layout Shift Sources:');
                                entry.sources.forEach(source => {
                                    console.log(`  Element: ${source.node ? source.node.outerHTML : 'N/A'}`);
                                    console.log(`  Previous Rect: ${JSON.stringify(source.previousRect)}`);
                                    console.log(`  Current Rect: ${JSON.stringify(source.currentRect)}`);
                                });
                            }
                        }
                        break;

                    case 'longtask':
                        // Total Blocking Time (TBT)
                        // Note: TBT typically sums long tasks *between* FCP and TTI.
                        // For simplicity here, we're just summing all long tasks.
                        totalBlockingTime += entry.duration;
                        console.log(`\n--- Long Task Detected ---`);
                        console.log(`Task Name: ${entry.name || 'Anonymous'}`);
                        console.log(`Start Time: ${entry.startTime.toFixed(2)}ms`);
                        console.log(`Duration: ${entry.duration.toFixed(2)}ms`);
                        console.log(`Current Total Blocking Time (TBT): ${totalBlockingTime.toFixed(2)}ms (Good: < 200ms)`);
                        if (entry.attribution) {
                            console.log('Attribution:', entry.attribution);
                        }
                        break;

                    case 'resource':
                        // Resource Timing
                        console.groupCollapsed(`\n📦 Resource Loaded: ${entry.name.split('?')[0].slice(-50)}...`); // Show partial URL
                        console.log(`Full URL: ${entry.name}`);
                        console.log(`Initiator Type: ${entry.initiatorType}`);
                        console.log(`Duration: ${entry.duration.toFixed(2)}ms`);
                        console.log(`Transfer Size: ${entry.transferSize} bytes (${(entry.transferSize / 1024).toFixed(2)} KB)`);
                        console.log(`Encoded Body Size: ${entry.encodedBodySize} bytes`);
                        console.log(`Decoded Body Size: ${entry.decodedBodySize} bytes`);
                        console.log(`Next Hop Protocol: ${entry.nextHopProtocol}`);
                        console.log('Timing Breakdown:');
                        console.table({
                            'Fetch Start': entry.fetchStart.toFixed(2),
                            'DNS Start': entry.domainLookupStart.toFixed(2),
                            'DNS End': entry.domainLookupEnd.toFixed(2),
                            'Connect Start': entry.connectStart.toFixed(2),
                            'Connect End': entry.connectEnd.toFixed(2),
                            'Request Start': entry.requestStart.toFixed(2),
                            'Response Start': entry.responseStart.toFixed(2),
                            'Response End': entry.responseEnd.toFixed(2)
                        });
                        console.groupEnd(); // End Resource Loaded group
                        break;

                    case 'mark':
                    case 'measure':
                        // User Timing
                        console.log(`\n--- User Timing Entry: ${entry.entryType} ---`);
                        console.log(`Name: ${entry.name}`);
                        console.log(`Start Time: ${entry.startTime.toFixed(2)}ms`);
                        if (entry.duration) {
                            console.log(`Duration: ${entry.duration.toFixed(2)}ms`);
                        }
                        break;

                    case 'event':
                        // Interaction to Next Paint (INP) - this needs to be actively tracked and updated
                        // INP is the longest duration of a set of interaction events, often excluding outliers.
                        // This is a simplified approach, a dedicated library like 'web-vitals' is better for precise INP.
                        const interactionTypes = ['click', 'mousedown', 'keydown', 'pointerdown']; // Common interaction types
                        if (interactionTypes.includes(entry.name) && entry.duration > 0) {
                            // Calculate interaction latency (input delay + processing time + presentation delay)
                            const interactionLatency = entry.duration; // Simplified for this example
                            if (interactionLatency > inpValue) {
                                inpValue = interactionLatency;
                                console.log(`\n--- Interaction to Next Paint (INP) Update ---`);
                                console.log(`New Max Interaction (${entry.name}): ${inpValue.toFixed(2)}ms (Good: < 200ms)`);
                                console.log(`Time to process event handlers: ${(entry.processingEnd - entry.processingStart).toFixed(2)}ms`);
                                console.log(`Input delay: ${(entry.processingStart - entry.startTime).toFixed(2)}ms`);
                            }
                        }
                        break;

                    // Add more entry types for even deeper insights:
                    // case 'long-animation-frame': // LoAFs (Experimental)
                    //     console.log(`\n--- Long Animation Frame (LoAF) ---`);
                    //     console.log(`Duration: ${entry.duration.toFixed(2)}ms`);
                    //     console.log(`Scripts:`, entry.scripts); // Shows scripts contributing to the long frame
                    //     break;
                    // case 'element': // Element Timing (Experimental)
                    //     console.log(`\n--- Element Timing ---`);
                    //     console.log(`Element:`, entry.element);
                    //     console.log(`Render Time: ${entry.renderTime.toFixed(2)}ms`);
                    //     break;
                }
            });
        });

        // Observe all relevant entry types
        observer.observe({
            entryTypes: [
                'paint',
                'largest-contentful-paint',
                'layout-shift',
                'longtask',
                'resource',
                'mark',
                'measure',
                'event', // For INP
                // 'long-animation-frame', // Uncomment if supported and desired
                // 'element' // Uncomment if supported and desired
            ],
            buffered: true // Get entries that occurred before the observer was created
        });

        // Optional: Disconnect observers after a certain time or event if you only need initial load data
        // For continuous monitoring (like in an extension), you'd keep them active.
        setTimeout(() => {
            console.groupEnd(); // End Real-time Metrics group
            console.log('\n--- Summary of Core Web Vitals (Final if no more shifts/interactions) ---');
            console.log(`Final Cumulative Layout Shift (CLS): ${cumulativeLayoutShift.toFixed(4)} (Good: < 0.1)`);
            console.log(`Final Total Blocking Time (TBT): ${totalBlockingTime.toFixed(2)}ms (Good: < 200ms)`);
            console.log(`Largest Interaction to Next Paint (INP): ${inpValue.toFixed(2)}ms (Good: < 200ms)`);
            console.log('Note: LCP and FCP are logged when they occur. CLS, TBT, and INP are cumulative and updated.');
            console.log('For continuous monitoring in an extension, consider sending data to a background script.');
        }, 10000); // Wait 10 seconds to capture most initial load events
    } else {
        console.warn('`PerformanceObserver` not available for real-time metrics.');
    }

    // --- 4. Memory Usage (Chrome-specific, non-standard) ---
    if (window.performance && window.performance.memory) {
        console.log('\n--- Memory Usage (Chrome-specific) ---');
        console.log(`Total JS Heap Size: ${(window.performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`Used JS Heap Size: ${(window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`JS Heap Size Limit: ${(window.performance.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2)} MB`);
    } else {
        console.warn('`window.performance.memory` not available or non-standard.');
    }

    // --- 5. Network Information (Experimental/Non-standard in some browsers) ---
    if (navigator.connection) {
        console.log('\n--- Network Information (Navigator.connection) ---');
        console.log(`Effective Connection Type: ${navigator.connection.effectiveType}`);
        console.log(`Round-trip Time (RTT): ${navigator.connection.rtt}ms`);
        console.log(`Downlink: ${navigator.connection.downlink} Mbps`);
        console.log(`Save Data: ${navigator.connection.saveData ? 'Yes' : 'No'}`);
    } else {
        console.warn('`navigator.connection` not available or experimental.');
    }

    // --- 6. Hardware Concurrency ---
    if (navigator.hardwareConcurrency) {
        console.log('\n--- Hardware Concurrency ---');
        console.log(`Logical CPU Cores: ${navigator.hardwareConcurrency}`);
    }

    // --- Example of custom User Timing (if you control the page's JS) ---
    // If you were inserting this into a page, you could add:
    // performance.mark('myCustomStart');
    // // ... some logic ...
    // performance.mark('myCustomEnd');
    // performance.measure('myCustomOperation', 'myCustomStart', 'myCustomEnd');
    console.log('\n--- Note on User Timing ---');
    console.log('Custom "mark" and "measure" entries will appear if the page uses `performance.mark()` and `performance.measure()`.');
}

// Run the function to log insights
if (document.readyState === 'complete') {
    // If the page is already loaded, run immediately
    logPagePerformanceInsights();
} else {
    // Otherwise, wait for the page to fully load
    window.addEventListener('load', logPagePerformanceInsights);
}

// Also, listen for DOMContentLoaded for earlier metrics if needed
window.addEventListener('DOMContentLoaded', () => {
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    if (navigationEntry) {
        console.log(`\n--- DOMContentLoaded Event Fired ---`);
        console.log(`DOM Content Loaded (Event): ${(navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime).toFixed(2)}ms`);
    }
});

console.log('Performance insight collection initiated. Metrics will appear as they become available.');
/**
 * Composer Inspector - Chrome Extension for Piano Experience Flow Visualization
 * Copyright (C) 2025 Rupert Knowles
 * Licensed under GNU GPL-3.0 - see LICENSE file for details
 */

(() => {
    if (window.hasTpTracerInjected) return;
    window.hasTpTracerInjected = true;

    const OriginalXHR = window.XMLHttpRequest;
    let shouldCaptureTrace = false;

    function ProxyXHR() {
        const xhr = new OriginalXHR();
        const open = xhr.open;
        xhr.open = function(method, url, ...rest) {
            this._url = url;
            return open.call(this, method, url, ...rest);
        };

        xhr.addEventListener('load', function() {
            if (shouldCaptureTrace && this._url && this._url.includes('execute?aid')) {
                let body = this.responseText;
                try { body = JSON.parse(body); } catch (e) {}
                // Dispatch event for the listener script to catch
                document.dispatchEvent(new CustomEvent('TpTraceCaptured', { detail: body }));
                shouldCaptureTrace = false; // Reset flag after capture
            }
        });
        return xhr;
    }

    window.XMLHttpRequest = ProxyXHR;

    // Function to execute the trace when requested
    function executeTpTrace() {
        if (window.tp && tp.experience && typeof tp.experience.execute === 'function') {
            try {
                shouldCaptureTrace = true; // Enable capture for the next call
                window.tp.debug = true;
                tp.experience.execute();
                return true;
            } catch (e) {
                shouldCaptureTrace = false; // Reset on error
                return false;
            }
        }
        return false;
    }

    // Listen for trace execution requests from content script
    document.addEventListener('ExecuteTpTrace', executeTpTrace);
})();
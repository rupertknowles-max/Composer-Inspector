/**
 * Composer Inspector - Chrome Extension for Piano Experience Flow Visualization
 * Copyright (C) 2025 Rupert Knowles
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Mermaid after it loads
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            maxTextSize: 900000,
            securityLevel: 'loose',
            theme: 'base',
            themeVariables: {
                primaryColor: '#F4F7FA',
                primaryTextColor: '#1A1A1A',
                primaryBorderColor: '#5F6C7B',
                lineColor: 'rgba(95, 108, 123, 0.3)',
                secondaryColor: '#D8EAFE',
                tertiaryColor: '#CDEFD6',
                background: '#F4F7FA',
                mainBkg: '#F4F7FA',
                nodeBorder: '#5F6C7B',
                clusterBkg: '#ffffff',
                clusterBorder: '#5F6C7B',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
                fontSize: '14px',
                nodePadding: '16'
            },
            flowchart: {
                padding: 16
            }
        });
    }
    const captureButton = document.getElementById('captureButton');
    const visualizeButton = document.getElementById('visualizeButton');
    const clearButton = document.getElementById('clearButton');
    const resultsContainer = document.getElementById('results-container');
    const headerPageTitle = document.getElementById('headerPageTitle');
    const mermaidOutput = document.getElementById('mermaid-output');
    const errorDiv = document.getElementById('error');
    const inputContainer = document.getElementById('inputContainer');
    const hideFailedToggle = document.getElementById('hideFailedToggle');
    const hideNoShowOfferToggle = document.getElementById('hideNoShowOfferToggle');
    const legendToggle = document.getElementById('legendToggle');
    const legendSection = document.getElementById('legendBelowCollapse');
    const collapsibleDivider = document.getElementById('collapsibleDivider');
    const dividerLabel = document.getElementById('dividerLabel');
    const dividerArrow = document.getElementById('dividerArrow');

    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX, startY;
    let currentSvg = null;
    let hideFailed = true;
    let hideNoShowOffer = false;
    let lastDebugMessages = null;
    let lastExperienceMap = null;
    let currentTraceData = null;

    const displayData = (data, pageTitle = null) => {
        currentTraceData = data;
        if (data) {
            resultsContainer.textContent = JSON.stringify(data, null, 2);
            resultsContainer.className = '';
            visualizeButton.disabled = false;

            // Update header with page title if available
            if (pageTitle) {
                headerPageTitle.textContent = ' - ' + pageTitle;
            } else {
                headerPageTitle.textContent = '';
            }
        } else {
            resultsContainer.textContent = 'No trace has been captured yet.';
            resultsContainer.className = 'status';
            visualizeButton.disabled = true;
            headerPageTitle.textContent = '';
        }
    };

    // Toggle event listeners
    hideFailedToggle.addEventListener('change', () => {
        hideFailed = hideFailedToggle.checked;
        if (lastDebugMessages && lastExperienceMap) {
            const mermaidString = parseDebugMessages(lastDebugMessages, lastExperienceMap);
            renderDiagram(mermaidString);
        }
    });

    hideNoShowOfferToggle.addEventListener('change', () => {
        hideNoShowOffer = hideNoShowOfferToggle.checked;
        if (lastDebugMessages && lastExperienceMap) {
            const mermaidString = parseDebugMessages(lastDebugMessages, lastExperienceMap);
            renderDiagram(mermaidString);
        }
    });

    legendToggle.addEventListener('change', () => {
        if (legendToggle.checked) {
            legendSection.style.display = 'block';
        } else {
            legendSection.style.display = 'none';
        }
    });

    // Collapsible divider functionality
    collapsibleDivider.addEventListener('click', () => {
        const isCollapsed = inputContainer.classList.toggle('collapsed');
        dividerArrow.classList.toggle('collapsed', isCollapsed);
        dividerLabel.textContent = isCollapsed ? 'Show Input' : 'Hide Input';
    });

    // Load existing trace on page load
    chrome.storage.local.get(['lastTpTrace', 'lastTpTracePageTitle'], (result) => {
        displayData(result.lastTpTrace, result.lastTpTracePageTitle);
    });

    captureButton.addEventListener('click', async () => {
        captureButton.disabled = true;
        captureButton.textContent = 'Capturing...';
        resultsContainer.textContent = 'Looking for tabs with Piano Experience running...';
        resultsContainer.className = 'status';
        errorDiv.textContent = '';
        
        try {
            const tabs = await chrome.tabs.query({});
            let targetTab = null;
            
            for (const tab of tabs) {
                if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                    try {
                        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                        targetTab = tab;
                        break;
                    } catch (e) {
                        // Content script not loaded in this tab, continue
                    }
                }
            }
            
            if (!targetTab) {
                resultsContainer.textContent = 'No suitable tabs found. Make sure you have a page with Piano Experience running open in another tab.';
                resultsContainer.className = 'error';
                return;
            }
            
            resultsContainer.textContent = `Attempting to capture trace from: ${targetTab.title}`;
            resultsContainer.className = 'status';
            
            const response = await chrome.tabs.sendMessage(targetTab.id, { action: 'captureTrace' });

            if (response && response.success) {
                // Store the page title immediately
                chrome.storage.local.set({ 'lastTpTracePageTitle': targetTab.title });

                resultsContainer.textContent = 'Trace capture initiated. Waiting for results...';
                resultsContainer.className = 'status';

                setTimeout(() => {
                    chrome.storage.local.get(['lastTpTrace', 'lastTpTracePageTitle'], (result) => {
                        if (result.lastTpTrace) {
                            displayData(result.lastTpTrace, result.lastTpTracePageTitle);
                            resultsContainer.className = 'success';
                        } else {
                            resultsContainer.textContent = 'No trace captured. Make sure the target page has Piano Experience running and try again.';
                            resultsContainer.className = 'error';
                        }
                    });
                }, 3000);
            } else {
                resultsContainer.textContent = 'Failed to initiate trace capture.';
                resultsContainer.className = 'error';
            }
        } catch (error) {
            resultsContainer.textContent = 'Error: Could not communicate with tabs. Make sure you have a page with Piano Experience running open.';
            resultsContainer.className = 'error';
            console.error('Capture error:', error);
        } finally {
            captureButton.disabled = false;
            captureButton.textContent = 'Capture Trace';
        }
    });

    visualizeButton.addEventListener('click', async () => {
        if (!currentTraceData) {
            errorDiv.textContent = 'No trace data available. Please capture a trace first.';
            return;
        }

        errorDiv.textContent = '';
        mermaidOutput.innerHTML = 'Processing visualization...';

        try {
            const data = currentTraceData;
            const debugMessages = data.models.result.debugMessages;
            const experiences = data.models.result.experiences;
            
            if (!debugMessages || !experiences) {
                errorDiv.textContent = 'JSON does not contain the required "debugMessages" or "experiences" properties.';
                mermaidOutput.innerHTML = '';
                return;
            }

            const experienceMap = experiences.reduce((map, exp) => {
                map[exp.id] = exp.title;
                return map;
            }, {});

            lastDebugMessages = debugMessages;
            lastExperienceMap = experienceMap;

            const mermaidString = parseDebugMessages(debugMessages, experienceMap);
            renderDiagram(mermaidString);
        } catch (e) {
            errorDiv.textContent = 'Error processing trace data: ' + e.message;
            mermaidOutput.innerHTML = '';
        }
    });

    clearButton.addEventListener('click', () => {
        chrome.storage.local.remove(['lastTpTrace', 'lastTpTracePageTitle'], () => {
            resultsContainer.textContent = 'Stored trace has been cleared.';
            resultsContainer.className = 'status';
            currentTraceData = null;
            visualizeButton.disabled = true;
            mermaidOutput.innerHTML = '';
            errorDiv.textContent = '';
            lastDebugMessages = null;
            lastExperienceMap = null;
            headerPageTitle.textContent = '';
        });
    });

    // Listen for storage changes to update live
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (changes.lastTpTrace || changes.lastTpTracePageTitle) {
            // Reload both trace and page title to keep them in sync
            chrome.storage.local.get(['lastTpTrace', 'lastTpTracePageTitle'], (result) => {
                displayData(result.lastTpTrace, result.lastTpTracePageTitle);
            });
        }
    });

    // Visualization functions (from viz.html)
    function setupZoomControls() {
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const zoomResetBtn = document.getElementById('zoomReset');
        const zoomFitBtn = document.getElementById('zoomFit');

        if (zoomInBtn) zoomInBtn.onclick = () => {
            scale *= 1.2;
            applyTransform();
        };

        if (zoomOutBtn) zoomOutBtn.onclick = () => {
            scale /= 1.2;
            applyTransform();
        };

        if (zoomResetBtn) zoomResetBtn.onclick = () => {
            scale = 1;
            translateX = 0;
            translateY = 0;
            applyTransform();
        };

        if (zoomFitBtn) zoomFitBtn.onclick = () => {
            if (!currentSvg) return;
            const container = mermaidOutput;
            const svgRect = currentSvg.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            const scaleX = containerRect.width / svgRect.width;
            const scaleY = containerRect.height / svgRect.height;
            scale = Math.min(scaleX, scaleY) * 0.9;
            translateX = 0;
            translateY = 0;
            applyTransform();
        };
    }

    function applyTransform() {
        if (currentSvg) {
            currentSvg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        }
    }

    function setupDragging(svg) {
        currentSvg = svg;
        svg.style.transformOrigin = '0 0';

        svg.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            applyTransform();
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        mermaidOutput.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scale *= delta;
            applyTransform();
        });
    }


    function renderDiagram(mermaidString) {
        if (typeof mermaid === 'undefined') {
            errorDiv.textContent = 'Mermaid library not loaded yet. Please reload the page and try again.';
            return;
        }

        try {
            // Clear previous content
            mermaidOutput.innerHTML = 'Rendering diagram...';
            
            // Create container for the diagram
            const container = document.createElement('div');
            container.id = 'mermaid-container';
            container.style.position = 'relative';
            container.style.width = '100%';
            container.style.height = '100%';
            
            // Create element for mermaid to render into
            const graphDiv = document.createElement('div');
            graphDiv.className = 'mermaid';
            graphDiv.innerHTML = mermaidString;
            container.appendChild(graphDiv);
            
            // Add zoom controls
            const zoomControls = document.createElement('div');
            zoomControls.className = 'zoom-controls';
            zoomControls.innerHTML = `
                <button id="zoomIn" title="Zoom In">+</button>
                <button id="zoomOut" title="Zoom Out">-</button>
                <button id="zoomReset" title="Reset Zoom">R</button>
                <button id="zoomFit" title="Fit to Screen">F</button>
            `;
            container.appendChild(zoomControls);
            
            // Clear and add container
            mermaidOutput.innerHTML = '';
            mermaidOutput.appendChild(container);
            
            // Render the mermaid diagram
            mermaid.init(undefined, graphDiv);
            
            // Setup interactions after rendering
            setTimeout(() => {
                const svgElement = container.querySelector('svg');
                if (svgElement) {
                    setupZoomControls();
                    setupDragging(svgElement);

                    // Apply rounded corners to all nodes
                    const nodeRects = svgElement.querySelectorAll('.node rect');
                    nodeRects.forEach(rect => {
                        rect.setAttribute('rx', '6');
                        rect.setAttribute('ry', '6');
                    });

                    scale = 1;
                    translateX = 0;
                    translateY = 0;
                }
            }, 100);
            
        } catch (e) {
            console.error("Mermaid rendering error:", e);
            errorDiv.textContent = 'Error rendering diagram. ' + e.message;
            mermaidOutput.innerHTML = `<pre style="padding: 20px; background: #f8f9fa; border-radius: 4px; overflow-x: auto;">${mermaidString.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
        }
    }


    function parseDebugMessages(messages, experienceMap) {
        let mermaidGraph = "graph TD\n    Start([Page Load])\n\n";
        let nodeCounter = 0;
        let moduleSequenceCounter = 1;

        const experienceChunks = [];
        let currentChunk = [];
        for (const msg of messages) {
            if (msg.startsWith("[ Executing EBL") && currentChunk.length > 0) {
                experienceChunks.push(currentChunk);
                currentChunk = [];
            }
            currentChunk.push(msg);
        }
        if (currentChunk.length > 0) {
            experienceChunks.push(currentChunk);
        }

        const allNodeDefs = new Map();
        const allStyleAssignments = new Map();

        // First filter: Hide experiences that failed page matching
        let chunksToProcess = hideFailed
            ? experienceChunks.filter(chunk => {
                for (const msg of chunk) {
                    if (msg.includes("Content resolver result: false")) {
                        return false;
                    }
                    if (msg.includes("Content resolver result: true")) {
                        return true;
                    }
                }
                return true;
            })
            : experienceChunks;

        // Second filter: Hide experiences without action modules
        if (hideNoShowOffer) {
            const actionModuleTypes = ['showOffer', 'applyCss', 'showTemplate', 'setCookie', 'nonSiteAction', 'showForm', 'runJs', 'setResponseVariable'];
            chunksToProcess = chunksToProcess.filter(chunk => {
                for (const msg of chunk) {
                    const modTypeMatch = msg.match(/moduleType:LITERAL = (\w+)/);
                    if (modTypeMatch && actionModuleTypes.includes(modTypeMatch[1])) {
                        return true;
                    }
                }
                return false;
            });
        }

        for (const chunk of chunksToProcess) {
            const tidMatch = chunk[0].match(/tid `(.+?)`/);
            const expId = tidMatch ? tidMatch[1] : `UNKNOWN_${nodeCounter}`;
            const expTitle = experienceMap[expId] || expId;
            
            const expNodeId = `EXP${nodeCounter++}`;
            mermaidGraph += `    %% Experience: ${expId}\n`;
            mermaidGraph += `    Start --> ${expNodeId}\n`;
            allNodeDefs.set(expNodeId, `${expNodeId}["${expTitle.replace(/"/g, '').replace(/[<>]/g, '')} - ${expId}"]`);
            allStyleAssignments.set(expNodeId, 'experienceClass');

            let contextNode = expNodeId;
            let lastReason = "";
            let moduleStack = [];

            for (let msgIndex = 0; msgIndex < chunk.length; msgIndex++) {
                const msg = chunk[msgIndex];
                
                // Capture Reasons
                if (msg.includes("Include check:") && msg.includes("= true")) lastReason = "URL matched";
                if (msg.includes("Target all pages: true")) lastReason = "All pages targeted";
                if (msg.includes("Target include tags:") && msg.includes("Result: false")) lastReason = "Tags mismatch";
                if (msg.includes("Result of 'login status' check is false")) lastReason = "User not logged in";
                if (msg.includes("Result of 'utm parameters' check is false")) lastReason = "UTM param mismatch";
                if (msg.includes("Target everybody else: true")) lastReason = "Anonymous user matched";

                // Page Request Detection
                const pageRequestMatch = msg.match(/Page request result: (true|false)/);
                if (pageRequestMatch) {
                    const result = pageRequestMatch[1];
                    const prId = `PR${nodeCounter++}`;
                    
                    const edge = lastReason ? `-->|${lastReason}|` : '-->';
                    mermaidGraph += `    ${contextNode} ${edge} ${prId}\n`;
                    allNodeDefs.set(prId, `${prId}["Page Request - Result: ${result.toUpperCase()}"]`);
                    allStyleAssignments.set(prId, result === 'true' ? 'successClass' : 'failClass');
                    contextNode = prId;
                    lastReason = "";
                }

                // Module Invocation
                let invokeMatch = msg.match(/Invoking (\w+) with following params: \[(.+)\]/) || 
                                  msg.match(/Invoking (\w+) with following params:\s*\[([^\]]+)\]/s);
                
                if (invokeMatch) {
                    const sequenceNumber = moduleSequenceCounter++;
                    const modId = invokeMatch[1];
                    const paramsStr = invokeMatch[2];
                    
                    const edge = lastReason ? `-->|${lastReason}|` : '-->';
                    mermaidGraph += `    ${contextNode} ${edge} ${modId}\n`;

                    const modType = paramsStr.match(/moduleType:LITERAL = (\w+)/)?.[1] || 'N/A';
                    const modName = paramsStr.match(/name:LITERAL = ([^,\]]+)/)?.[1] || modId;
                    const numberedModName = `[${sequenceNumber}] ${modName.replace(/"/g, '').replace(/[<>]/g, '')}`;
                    const details = extractModuleDetails(paramsStr, chunk, modType, msgIndex);

                    let nodeLabel = '';
                    if (modType === 'contentSegment' || modType === 'userSegment') {
                        nodeLabel = `${modId}["${numberedModName}<br/>ID: ${modId}"]`;
                    } else if (modType === 'interaction') {
                        const selectorMatch = paramsStr.match(/elementSelector=([^,\]]+)/);
                        const selector = selectorMatch ? selectorMatch[1] : '';
                        nodeLabel = `${modId}["${numberedModName} - Interaction - Element: ${selector}<br/>ID: ${modId}"]`;
                    } else if (modType === 'applyCss') {
                        const classMatch = paramsStr.match(/classes=([^,\]]+)/);
                        const elemMatch = paramsStr.match(/elements=([^,\]]+)/);
                        let cssDetails = '';
                        if (classMatch && elemMatch) {
                            cssDetails = ` - Class: ${classMatch[1]} - Element: ${elemMatch[1]}`;
                        }
                        nodeLabel = `${modId}["${numberedModName} - Apply CSS${cssDetails}<br/>ID: ${modId}"]`;
                    } else if (modType === 'runJs') {
                        nodeLabel = `${modId}["${numberedModName} - Run JS<br/>ID: ${modId}"]`;
                    } else if (modType === 'viewportExit') {
                        const detectMode = paramsStr.match(/detectExitMode:LITERAL = (\w+)/)?.[1] || 'top';
                        nodeLabel = `${modId}["${numberedModName} - Viewport Exit - Mode: ${detectMode}<br/>ID: ${modId}"]`;
                    } else {
                        nodeLabel = `${modId}["${numberedModName} - ${modType}<br/>ID: ${modId}"]`;
                    }

                    allNodeDefs.set(modId, nodeLabel);
                    
                    if (modType === 'showOffer' || modType === 'applyCss' || modType === 'showTemplate' || modType === 'setCookie' || modType === 'nonSiteAction' || modType === 'showForm' || modType === 'runJs' || modType === 'setResponseVariable') {
                        allStyleAssignments.set(modId, 'showOfferClass');
                    } else if (modType === 'frequencyCap' || modType === 'splitTest') {
                        allStyleAssignments.set(modId, 'pageViewMeterClass');
                    } else if (modType === 'userSegment') {
                        allStyleAssignments.set(modId, 'userSegmentClass');
                    } else if (modType === 'pageViewMeter' || modType === 'interaction' || modType === 'idle' || modType === 'timer' || modType === 'viewportExit' || modType === 'scrollDepth') {
                        allStyleAssignments.set(modId, 'interactionClass');
                    } else {
                        allStyleAssignments.set(modId, 'moduleClass');
                    }
                    contextNode = modId;
                    moduleStack.push(modId);
                    lastReason = "";
                }

                // Result Node
                let resultMatch = msg.match(/(?:Content resolver result|Result of '.*?' check is): (true|false)/);
                if (resultMatch) {
                    const result = resultMatch[1];
                    const resId = `RES${nodeCounter++}`;
                    
                    mermaidGraph += `    ${contextNode} --> ${resId}\n`;
                    allNodeDefs.set(resId, `${resId}["Result: ${result.toUpperCase()}"]`);
                    allStyleAssignments.set(resId, result === 'true' ? 'successClass' : 'failClass');

                    if (result === 'false' && !lastReason) lastReason = "Condition failed";
                    if (result === 'true' && !lastReason) lastReason = "Condition passed";
                    contextNode = resId;
                }
                
                // Termination
                if (msg.includes("won't be invoked")) {
                     const termId = `TERM${nodeCounter++}`;
                     const edge = lastReason ? `-->|${lastReason}|` : '-->';
                     mermaidGraph += `    ${contextNode} ${edge} ${termId}\n`;
                     allNodeDefs.set(termId, `${termId}["X Experience Terminated - ${lastReason}"]`);
                     allStyleAssignments.set(termId, 'terminateClass');
                     lastReason = "";
                }

                // Backtracking
                if (msg.startsWith("<-- Backtracking from")) {
                     const backId = `BACK${nodeCounter++}`;
                     const edge = lastReason ? `-->|${lastReason}|` : '-->';
                     mermaidGraph += `    ${contextNode} ${edge} ${backId}\n`;
                     allNodeDefs.set(backId, `${backId}["<- Backtrack"]`);
                     allStyleAssignments.set(backId, 'terminateClass');
                     moduleStack.pop();
                     contextNode = moduleStack.length > 0 ? moduleStack[moduleStack.length -1] : expNodeId;
                     lastReason = "";
                }

                // Success
                if (msg.includes("All routes have been evaluated")) {
                    const lastModule = moduleStack.length > 0 ? moduleStack[moduleStack.length - 1] : null;
                    if (lastModule) {
                        const successId = `SUCCESS${nodeCounter++}`;
                        mermaidGraph += `    ${lastModule} --> ${successId}\n`;
                        allNodeDefs.set(successId, `${successId}["OK Experience Completed"]`);
                        allStyleAssignments.set(successId, 'successClass');
                    }
                }
            }
            mermaidGraph += '\n';
        }

        // Append all definitions and styles at the end
        mermaidGraph += "    %% Node Definitions\n";
        allNodeDefs.forEach(def => mermaidGraph += `    ${def}\n`);

        mermaidGraph += "\n    %% Styling\n";
        mermaidGraph += "    classDef successClass fill:#B4E197,stroke:#7EBC5C,stroke-width:1px,color:#1A1A1A\n";
        mermaidGraph += "    classDef failClass fill:#F58F7C,stroke:#E65D47,stroke-width:1px,color:#1A1A1A\n";
        mermaidGraph += "    classDef moduleClass fill:#D8EAFE,stroke:#5BA3D0,stroke-width:1px,color:#1A1A1A\n";
        mermaidGraph += "    classDef showOfferClass fill:#FFECC7,stroke:#E5C15B,stroke-width:1px,color:#1A1A1A\n";
        mermaidGraph += "    classDef splitTestClass fill:#FADADD,stroke:#E89AA1,stroke-width:1px,color:#1A1A1A\n";
        mermaidGraph += "    classDef pageViewMeterClass fill:#FADADD,stroke:#E89AA1,stroke-width:1px,color:#1A1A1A\n";
        mermaidGraph += "    classDef userSegmentClass fill:#CDEFD6,stroke:#6BC17E,stroke-width:1px,color:#1A1A1A\n";
        mermaidGraph += "    classDef interactionClass fill:#F5E6FF,stroke:#C598E0,stroke-width:1px,color:#1A1A1A\n";
        mermaidGraph += "    classDef experienceClass fill:#F4F7FA,stroke:#5F6C7B,stroke-width:1px,color:#1A1A1A\n";
        mermaidGraph += "    classDef terminateClass fill:#E8ECEF,stroke:#5F6C7B,stroke-width:1px,color:#1A1A1A\n";
        
        const classAssignments = {};
        allStyleAssignments.forEach((className, nodeId) => {
            if (!classAssignments[className]) {
                classAssignments[className] = [];
            }
            classAssignments[className].push(nodeId);
        });

        for (const className in classAssignments) {
            mermaidGraph += `    class ${classAssignments[className].join(',')} ${className}\n`;
        }
        
        console.log('Generated Mermaid graph:', mermaidGraph);
        return mermaidGraph;
    }

    function extractModuleDetails(paramsStr, chunk, modType, currentMsgIndex) {
        let details = [];
        
        // Extract login status
        const loginStatus = paramsStr.match(/loginStatus:LITERAL = LoginStatus\(isEnabled=true, isLoggedIn=(true|false), isUnregisteredOrLoggedOut=(true|false)\)/);
        if (loginStatus) {
            if (loginStatus[1] === 'true') details.push('LoggedIn');
            if (loginStatus[2] === 'true') details.push('Anonymous');
        }
        
        if (paramsStr.includes("targetEverybodyElse:LITERAL = true")) details.push("AllUsers");
        
        const utm = paramsStr.match(/utmParameters:LITERAL = UtmParametersGroup\(.*?value=(\w+).*?\)/);
        if (utm) details.push(`UTM:${utm[1]}`);

        const offerId = paramsStr.match(/offerId:LITERAL = (\w+)/);
        if (offerId) details.push(`Offer:${offerId[1]}`);

        const templateId = paramsStr.match(/templateId:LITERAL = (\w+)/);
        if (templateId) details.push(`Template:${templateId[1]}`);
        
        // Enhanced meter details
        if (modType === 'pageViewMeter') {
            const meterName = paramsStr.match(/meterName:LITERAL = (\w+)/);
            if (meterName) details.push(`Meter:${meterName[1]}`);

            // Look ahead in chunk for meter statistics
            for (let i = currentMsgIndex; i < Math.min(currentMsgIndex + 15, chunk.length); i++) {
                const meterMsg = chunk[i];
                const viewsMatch = meterMsg.match(/Total page view count = (\d+)/);
                const expireMatch = meterMsg.match(/expire at = (\d+)/);
                const maxViewsMatch = meterMsg.match(/maxViews = (\d+)/);

                if (viewsMatch && !details.some(d => d.startsWith("Views:"))) {
                    details.push(`Views:${viewsMatch[1]}`);
                }
                if (expireMatch && !details.some(d => d.startsWith("Limit:"))) {
                    details.push(`Limit:${expireMatch[1]}`);
                }
                if (maxViewsMatch && !details.some(d => d.startsWith("Max:"))) {
                    details.push(`Max:${maxViewsMatch[1]}`);
                }
            }
        }
        
        // Contextual details from surrounding log messages
        for(const msg of chunk) {
            if (modType !== 'userSegment' && modType !== 'showOffer') {
                const urlMatch = msg.match(/Include check: .* matches (.*?) = true/);
                if(urlMatch && !details.some(d => d.startsWith("URL:"))) {
                    const url = urlMatch[1].length > 50 ? urlMatch[1].substring(0, 47) + '...' : urlMatch[1];
                    details.push(`URL:${url}`);
                }
            }

            const tagMatch = msg.match(/Target include tags: \[(.*?)\].*Result: (true|false)/);
            if(tagMatch && !details.some(d => d.startsWith("Tags:"))) {
                const tags = tagMatch[1].length > 50 ? tagMatch[1].substring(0, 47) + '...' : tagMatch[1];
                const result = tagMatch[2];
                details.push(`Tags:${tags} (${result})`);
            }

            if(msg.includes("Target all pages: true") && !details.some(d => d.startsWith("AllPages"))) {
                details.push(`AllPages`);
            }
        }

        return details.length > 0 ? `<br/>${details.join('<br/>')}` : "";
    }
});
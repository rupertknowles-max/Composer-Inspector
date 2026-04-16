# Composer Inspector

A Chrome extension for visualising Piano Experience flow diagrams from execution traces.

## Overview

Composer Inspector captures and visualizes the execution flow of Piano experiences, showing:
- Experience execution paths
- Module invocations and results
- Page matching and user segmentation logic
- Action modules (showOffer, applyCss, etc.)
- Interactive flow diagrams with zoom and pan controls

## Features

- **One-Click Capture**: Capture execution traces from any tab running Piano Experience
- **Interactive Visualization**: Mermaid-based flow diagrams with zoom, pan, and fullscreen support
- **Smart Filtering**:
  - Hide experiences that fail page matching
  - Hide experiences without action modules
  - Toggle legend display
- **Persistent Storage**: Traces persist across browser sessions
- **Page Context**: Shows which page the trace was captured from

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the extension directory

### Usage

1. Navigate to a page with Piano Experience running
2. Click the Composer Inspector icon in your Chrome toolbar
3. Click "Capture Trace" to capture the execution trace
4. Click "Visualise" to see the interactive flow diagram
5. Use the filter toggles to customize the view
6. Use zoom controls or mouse wheel to navigate the diagram

## Visualization Legend

- **Green (Action)**: Action modules (showOffer, applyCss, runJs, etc.)
- **Blue (Page Segment)**: Content resolver modules
- **Purple (User Segment)**: User segmentation modules
- **Orange (Branch)**: Branching logic (split tests, frequency caps)
- **Yellow (Interaction)**: User interaction modules (pageViewMeter, click, scroll, etc.)
- **Light Green (Success)**: Successful results
- **Red (Failed)**: Failed conditions

## Technical Details

This extension:
- Intercepts XHR calls to capture Piano execution traces
- Uses content scripts in both MAIN and ISOLATED worlds
- Stores traces in `chrome.storage.local`
- Renders diagrams using Mermaid.js

## Development

Key files:
- `manifest.json` - Extension configuration
- `background.js` - Service worker handling extension icon clicks
- `injector.js` - Content script injected into MAIN world to capture XHR
- `listener.js` - Content script in ISOLATED world for message passing
- `popup.html` / `popup.js` - Main UI and visualization logic

## License

Copyright (C) 2025 Rupert Knowles

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.

## Contributing

Contributions are welcome! Please ensure any modifications maintain GPL-3.0 compatibility.

## Disclaimer

This extension is not affiliated with or endorsed by Piano Software Inc. It is an independent tool for debugging and understanding Piano Experience execution.

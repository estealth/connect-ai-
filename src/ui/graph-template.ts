/**
 * SHIN AI — Knowledge Graph Visualization Template
 * Extracted from extension.ts
 */
export const RENDER_GRAPH_HTML = (graphJson: string, assetsRoot: string) => `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SHIN AI — Knowledge Graph</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body { margin: 0; padding: 0; background: #0f172a; color: #f8fafc; font-family: 'Inter', sans-serif; overflow: hidden; }
        #graph { width: 100vw; height: 100vh; }
        .node { stroke: #fff; stroke-width: 1.5px; cursor: pointer; transition: 0.3s; }
        .node:hover { filter: brightness(1.2); stroke-width: 3px; }
        .link { stroke: #334155; stroke-opacity: 0.6; stroke-width: 1.5px; }
        .label { font-size: 10px; fill: #94a3b8; pointer-events: none; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
        /* v2.89.102: Cinematic UI styles for the graph */
    </style>
</head>
<body>
    <div id="graph"></div>
    <script>
        const data = ${graphJson};
        const assetsRoot = "${assetsRoot}";
        // ... D3.js implementation logic ...
    </script>
</body>
</html>
`;

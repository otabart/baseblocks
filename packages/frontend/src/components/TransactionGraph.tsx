"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import SideAppbar from './SideAppbar';

interface TransactionNode extends d3.SimulationNodeDatum {
  id: string;
  txCount: number;
  isSender: boolean;
  isReceiver: boolean;
  lastActiveBlock: number;
}

interface TransactionLink extends d3.SimulationLinkDatum<TransactionNode> {
  source: string | TransactionNode;
  target: string | TransactionNode;
  value: string;
  hash: string;
  block: number;
}

const TransactionGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<{ nodes: TransactionNode[]; links: TransactionLink[] }>({
    nodes: [],
    links: [],
  });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [totalTxs, setTotalTxs] = useState(0);
  const simulation = useRef<d3.Simulation<TransactionNode, TransactionLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const STALE_BLOCK_THRESHOLD = 10;
  const LINK_RETENTION_BLOCKS = 5;
  const ACTIVITY_THRESHOLD = 5;

  // Resize observer
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("http://localhost:3001/events");
    eventSource.onmessage = (event) => {
      if (!isPaused) {
        const data = JSON.parse(event.data);
        if (data.type === "new_transactions") {
          setCurrentBlock((prev) => prev + 1);
          updateGraph(data.data, currentBlock + 1);
          setTotalTxs((prev) => prev + data.data.length);
        }
      }
    };
    eventSource.onerror = (error) => console.error("SSE error:", error);
    return () => eventSource.close();
  }, [isPaused, currentBlock]);

  const updateGraph = (newTxs: { hash: string; from: string; to: string; value: string }[], blockNumber: number) => {
    setGraphData((prev) => {
      const nodeMap = new Map(prev.nodes.map((node) => [node.id, node]));
      newTxs.forEach((tx) => {
        [tx.from, tx.to].forEach((addr) => {
          if (addr) {
            const node = nodeMap.get(addr) || {
              id: addr,
              txCount: 0,
              isSender: false,
              isReceiver: false,
              lastActiveBlock: blockNumber,
            };
            node.txCount += 1;
            node.lastActiveBlock = blockNumber;
            if (addr === tx.from) node.isSender = true;
            if (addr === tx.to) node.isReceiver = true;
            nodeMap.set(addr, node);
          }
        });
      });

      const newLinks = newTxs.map((tx) => ({
        source: tx.from,
        target: tx.to,
        value: tx.value,
        hash: tx.hash,
        block: blockNumber,
      }));

      const updatedNodes = Array.from(nodeMap.values()).filter(
        (node) => blockNumber - node.lastActiveBlock <= STALE_BLOCK_THRESHOLD
      );
      const updatedLinks = [...prev.links, ...newLinks].filter(
        (link) => blockNumber - link.block <= LINK_RETENTION_BLOCKS
      );

      return { nodes: updatedNodes, links: updatedLinks };
    });
  };

  // D3 simulation setup
  useEffect(() => {
    if (!svgRef.current || dimensions.width <= 0 || dimensions.height <= 0) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height);

    svg.selectAll("*").remove();
    const g = svg.append("g").attr("class", "graph");

    simulation.current = d3
      .forceSimulation<TransactionNode, TransactionLink>()
      .force("link", d3.forceLink<TransactionNode, TransactionLink>().id((d) => d.id).distance(100))
      .force("charge", d3.forceManyBody<TransactionNode>().strength(-50))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .alphaDecay(0.05);

    simulation.current.on("tick", () => {
      g.selectAll<SVGLineElement, TransactionLink>(".link")
        .attr("x1", (d) => (d.source as TransactionNode).x || 0)
        .attr("y1", (d) => (d.source as TransactionNode).y || 0)
        .attr("x2", (d) => (d.target as TransactionNode).x || 0)
        .attr("y2", (d) => (d.target as TransactionNode).y || 0);

      g.selectAll<SVGCircleElement, TransactionNode>(".node")
        .attr("cx", (d) => d.x || 0)
        .attr("cy", (d) => d.y || 0);
    });

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);
    zoomRef.current = zoom;

    updateVisualization();

    return () => {
      simulation.current?.stop();
    };
  }, [dimensions]);

  const fitGraph = useCallback(() => {
    if (!svgRef.current || graphData.nodes.length === 0 || !zoomRef.current) return;

    const nodes = graphData.nodes.filter((d) => d.x !== undefined && d.y !== undefined);
    if (nodes.length === 0) return;

    const bounds = {
      minX: d3.min(nodes, (d) => d.x) || 0,
      maxX: d3.max(nodes, (d) => d.x) || 0,
      minY: d3.min(nodes, (d) => d.y) || 0,
      maxY: d3.max(nodes, (d) => d.y) || 0,
    };

    const padding = 20;
    const graphWidth = bounds.maxX - bounds.minX;
    const graphHeight = bounds.maxY - bounds.minY;

    if (graphWidth === 0 || graphHeight === 0) return;

    const scale = Math.min(
      (dimensions.width - 2 * padding) / graphWidth,
      (dimensions.height - 2 * padding) / graphHeight
    );
    const translateX = (dimensions.width - graphWidth * scale) / 2 - bounds.minX * scale;
    const translateY = (dimensions.height - graphHeight * scale) / 2 - bounds.minY * scale;

    const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);

    d3.select(svgRef.current)
      .transition()
      .duration(750)
      .call(zoomRef.current.transform, transform);
  }, [dimensions, graphData]);

  useEffect(() => {
    updateVisualization();
    setTimeout(fitGraph, 500);
  }, [graphData, fitGraph]);

  const updateVisualization = () => {
    if (!svgRef.current || !tooltipRef.current) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const g = svg.select<SVGGElement>(".graph");
    const tooltip = d3.select<HTMLDivElement, unknown>(tooltipRef.current);

    const link = g.selectAll<SVGLineElement, TransactionLink>(".link")
      .data(graphData.links, (d: TransactionLink) => d.hash);
    link.enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#6b7280")
      .attr("stroke-opacity", "0.6")
      .attr("stroke-width", 1.5);
    link.exit().remove();

    const node = g.selectAll<SVGCircleElement, TransactionNode>(".node")
      .data(graphData.nodes, (d: TransactionNode) => d.id);
    const nodeEnter = node.enter()
      .append("circle")
      .attr("class", "node")
      .attr("r", (d) => Math.min(5 + Math.log(d.txCount || 1) * 5, 20))
      .attr("fill", (d) => {
        const age = currentBlock - d.lastActiveBlock;
        const opacity = Math.max(0.3, 1 - age / STALE_BLOCK_THRESHOLD);
        return d.isSender && d.isReceiver
          ? `rgba(168, 85, 247, ${opacity})`
          : d.isSender
          ? `rgba(16, 185, 129, ${opacity})`
          : `rgba(99, 102, 241, ${opacity})`;
      })
      .attr("stroke", (d) => (d.txCount >= ACTIVITY_THRESHOLD ? "#f59e0b" : "#9ca3af"))
      .attr("stroke-width", (d) => (d.txCount >= ACTIVITY_THRESHOLD ? 2 : 1))
      .attr("opacity", 0);

    nodeEnter.transition()
      .duration(500)
      .attr("opacity", 1);

    nodeEnter
      .on("mouseover", function (this: SVGCircleElement, event: MouseEvent, d: TransactionNode) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", Math.min(5 + Math.log(d.txCount || 1) * 5, 20) * 1.5);
        tooltip
          .style("display", "block")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(`Address: ${d.id}<br>Transactions: ${d.txCount}<br>Last Active: Block ${d.lastActiveBlock}`);
      })
      .on("mouseout", function (this: SVGCircleElement, _event: MouseEvent, d: TransactionNode) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", Math.min(5 + Math.log(d.txCount || 1) * 5, 20));
        tooltip.style("display", "none");
      });

    node.exit()
      .transition()
      .duration(500)
      .attr("opacity", 0)
      .remove();

    if (simulation.current) {
      simulation.current.nodes(graphData.nodes);
      simulation.current.force<d3.ForceLink<TransactionNode, TransactionLink>>("link")!.links(graphData.links);
      simulation.current.alpha(1).restart();
    }
  };

  return (
    <>
      <SideAppbar
        nodes={graphData.nodes}
        links={graphData.links}
        totalTxs={totalTxs}
        currentBlock={currentBlock}
      />
      <div ref={containerRef} className="relative h-full w-full bg-transparent">
        <svg ref={svgRef} className="absolute inset-0" />
        <div
          ref={tooltipRef}
          className="absolute bg-gray-800 text-gray-100 p-2 rounded shadow-lg border border-gray-700 text-sm pointer-events-none hidden"
        />
        <div className="absolute top-2 right-2 space-x-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              isPaused ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
            } text-white`}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
        {graphData.nodes.length === 0 && (
          <p className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-600 text-lg">
            Waiting for transactions...
          </p>
        )}
      </div>
    </>
  );
};

export default TransactionGraph;
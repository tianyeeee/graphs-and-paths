import { expect } from "chai";
import Graph from "../src/graph";
import { EdgePoint, Location, Path, SimpleEdge, SimpleNode } from "../src/types";
import * as TestGraphs from "./testGraphs";

describe("constructor", () => {
    it("should fail if node ID is repeated", () => {
        const nodes: SimpleNode[] = [
            { id: 0, location: { x: 0, y: 0 } },
            { id: 0, location: { x: 0, y: 1 } },
        ];
        expect(() => Graph.create(nodes, [])).to.throw(/0/);
    });

    it("should fail if edge ID is repeated", () => {
        const nodes: SimpleNode[] = [
            { id: 0, location: { x: 0, y: 0 } },
            { id: 1, location: { x: 0, y: 1 } },
            { id: 2, location: { x: 1, y: 0 } },
        ];
        const edges: SimpleEdge[] = [
            { id: 0, startNodeId: 0, endNodeId: 1 },
            { id: 0, startNodeId: 1, endNodeId: 2 },
        ];
        expect(() => Graph.create(nodes, edges)).to.throw(/0/);
    });

    it("should fail if edge references nonexistent node", () => {
        const nodes: SimpleNode[] = [
            { id: 0, location: { x: 0, y: 0 } },
            { id: 1, location: { x: 0, y: 1 } },
        ];
        const edges: SimpleEdge[] = [{ id: 0, startNodeId: 0, endNodeId: 2 }];
        expect(() => Graph.create(nodes, edges)).to.throw(/2/);
    });
});

describe("getAllNodes()", () => {
    it("should return nothing on an empty graph", () => {
        const graph = Graph.create([], []);
        expect(graph.getAllNodes()).to.be.empty;
    });

    it("should return a node with no edges if it is entire graph", () => {
        const node = TestGraphs.getSingleNode().getAllNodes()[0];
        expect(node.id).to.equal(0);
        expect(node.location).to.deep.equal({ x: 0, y: 0 });
        expect(node.edgeIds).to.be.empty;
    });

    it("should return nodes with edge between them on such a graph", () => {
        const nodes = TestGraphs.getTwoNodes().getAllNodes();
        expect(nodes).to.have.lengthOf(2);
        const [nodeA, nodeB] = nodes;
        expect(nodeA.id).to.equal("A");
        expect(nodeB.id).to.equal("B");
        expect(nodeA.edgeIds).to.deep.equal(["AB"]);
        expect(nodeB.edgeIds).to.deep.equal(["AB"]);
    });
});

describe("getNode()", () => {
    it("should return the requested node", () => {
        const node = TestGraphs.getSingleNode().getNode(0);
        expect(node.id).to.equal(0);
    });

    it("should return undefined if node does not exist", () => {
        expect(TestGraphs.getSingleNode().getNode(1)).to.be.undefined;
    });
});

describe("getAllEdges()", () => {
    it("should return nothing on an empty graph", () => {
        const graph = Graph.create([], []);
        expect(graph.getAllEdges()).to.be.empty;
    });

    it("should return the edge on a graph with a single edge", () => {
        const edges = TestGraphs.getTwoNodes().getAllEdges();
        expect(edges).to.have.lengthOf(1);
        const [edge] = edges;
        expect(edge.id).to.equal("AB");
        expect(edge.startNodeId).to.equal("A");
        expect(edge.endNodeId).to.equal("B");
        expect(edge.innerLocations).to.be.empty;
        expect(edge.length).to.equal(1);
    });
});

describe("getEdge()", () => {
    it("should return the requested edge", () => {
        const edge = TestGraphs.getTwoNodes().getEdge("AB");
        expect(edge.id).to.equal("AB");
    });

    it("should return undefined if edge does not exist", () => {
        expect(TestGraphs.getTwoNodes().getEdge(1)).to.be.undefined;
    });
});

describe("getEdgesOfNode()", () => {
    it("should return edges with node as their endpoint", () => {
        const edges = TestGraphs.getTriangle().getEdgesOfNode("A");
        const edgeIds = edges.map((edge) => edge.id).sort();
        expect(edgeIds).to.deep.equal(["AB", "CA"]);
    });

    it("should throw on nonexistent node ID", () => {
        expect(() => TestGraphs.getTriangle().getEdgesOfNode(-1)).to.throw(/-1/);
    });
});

describe("getEndpointsOfEdge()", () => {
    it("should return nodes at ends of edge", () => {
        const endpoints = TestGraphs.getTriangle().getEndpointsOfEdge("CA");
        expect(endpoints.map((node) => node.id)).to.deep.equal(["C", "A"]);
    });

    it("should throw on nonexistent edge ID", () => {
        expect(() => TestGraphs.getTriangle().getEndpointsOfEdge(-1)).to.throw(/-1/);
    });
});

describe("getOtherEndpoint()", () => {
    it("should return the other endpoint of an edge", () => {
        const endpoint = TestGraphs.getTwoNodes().getOtherEndpoint("AB", "A");
        expect(endpoint.id).to.equal("B");
    });

    it("should throw on nonexistent edge ID", () => {
        expect(() => TestGraphs.getTwoNodes().getOtherEndpoint("TD", "A")).to.throw(/TD/);
    });

    it("should throw if node is not an endpoint of edge", () => {
        expect(() => TestGraphs.getTriangle().getOtherEndpoint("AB", "C")).to.throw(/endpoint/);
    });
});

describe("getNeighbors()", () => {
    it("should return the neighbors of a node", () => {
        const neighbors = TestGraphs.getTriangle().getNeighbors("A");
        expect(neighbors.map((node) => node.id).sort()).to.deep.equal(["B", "C"]);
    });

    it("should throw nonexistent node ID", () => {
        expect(() => TestGraphs.getTriangle().getNeighbors("TD")).to.throw(/TD/);
    });
});

describe("getLocation()", () => {
    it("should return the correct location on an edge with no inner points", () => {
        const nodes: SimpleNode[] = [
            { id: "A", location: { x: 10, y: 10 } },
            { id: "B", location: { x: 40, y: 50 } },
        ];
        const edges: SimpleEdge[] = [{ id: "AB", startNodeId: "A", endNodeId: "B" }];
        const graph = Graph.create(nodes, edges);
        const distances = [0, 10, 50];
        const expectedLocations: Location[] = [
            { x: 10, y: 10 },
            { x: 16, y: 18 },
            { x: 40, y: 50 },
        ];
        const actualLocations = distances.map((distance) => graph.getLocation({ edgeId: "AB", distance }));
        expect(actualLocations).to.deep.equal(expectedLocations);
    });

    it("should return the correct location on an edge with inner points", () => {
        // Path is a "stairwell" with two steps.
        const nodes: SimpleNode[] = [
            { id: "A", location: { x: 0, y: 0 } },
            { id: "B", location: { x: 2, y: 2 } },
        ];
        const edges: SimpleEdge[] = [{
            id: "AB",
            startNodeId: "A",
            endNodeId: "B",
            innerLocations: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
        }];
        const graph = Graph.create(nodes, edges);
        const distances = [0, 1, 2.5, 4];
        const expectedLocations: Location[] = [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1.5, y: 1 },
            { x: 2, y: 2 },
        ];
        const actualLocations = distances.map((distance) => graph.getLocation({ edgeId: "AB", distance }));
        expect(actualLocations).to.deep.equal(expectedLocations);
    });

    it("should behave in double imprecision corner case", () => {
        // Fact: 2/3 + 1/3 === 1, but 1 - 2/3 - 1/3 !== 0 in floating point arithmatic.
        // This test checks that this does not cause trouble for us.
        const nodes: SimpleNode[] = [
            { id: "A", location: { x: 0, y: 0 } },
            { id: "B", location: { x: 2 / 3, y: 1 / 3 } },
        ];
        const edges: SimpleEdge[] = [{
            id: "AB",
            startNodeId: "A",
            endNodeId: "B",
            innerLocations: [{ x: 2 / 3, y: 0 }],
        }];
        const graph = Graph.create(nodes, edges);
        const { length } = graph.getEdge("AB");
        expect(graph.getLocation({ edgeId: "AB", distance: length })).to.deep.equal({ x: 2 / 3, y: 1 / 3 });
    });

    it("should throw on nonexistent edgeId", () => {
        expect(() => TestGraphs.getTriangle().getLocation({ edgeId: "TD", distance: 0 })).to.throw(/TD/);
    });

    it("should return start on negative distance", () => {
        expect(TestGraphs.getTriangle().getLocation({ edgeId: "AB", distance: -1 })).to.deep.equal({ x: 0, y: 0 });
    });

    it("should return end on distance greater than edge length", () => {
        expect(TestGraphs.getTriangle().getLocation({ edgeId: "AB", distance: 10 })).to.deep.equal({ x: 1, y: 0 });
    });
});

describe("lengths", () => {
    it("should be correct for edge with no inner locations", () => {
        const nodes: SimpleNode[] = [
            { id: 0, location: { x: 1, y: 1 } },
            { id: 1, location: { x: 4, y: -3 } },
        ];
        const edges: SimpleEdge[] = [{ id: 0, startNodeId: 0, endNodeId: 1 }];
        const edge = Graph.create(nodes, edges).getEdge(0);
        expect(edge.length).to.equal(5);
    });

    it("should be correct for edge with inner locations", () => {
        const nodes: SimpleNode[] = [
            { id: 0, location: { x: 0, y: 0 } },
            { id: 1, location: { x: 0, y: 6 } },
        ];
        const edges: SimpleEdge[] = [{
            id: 0,
            startNodeId: 0,
            endNodeId: 1,
            innerLocations: [{ x: 4, y: 3 }],
        }];
        const edge = Graph.create(nodes, edges).getEdge(0);
        expect(edge.length).to.equal(10);
    });
});

describe("coalesced()", () => {
    it("should return identical graph if nothing to coalesce", () => {
        const graph = TestGraphs.getTwoNodes();
        const coalesced = graph.coalesced();
        expectGraphsToBeEqual(coalesced, graph);
    });

    it("should coalesce segmented curve into single curve", () => {
        const graph = TestGraphs.getFourNodes().coalesced();
        const expectedNodes: SimpleNode[] = [
            { id: "A", location: { x: 0, y: 0 } },
            { id: "D", location: { x: 3, y: 0 } },
        ];
        const expectedEdges: SimpleEdge[] = [
            {
                id: "AB",
                startNodeId: "A",
                endNodeId: "D",
                innerLocations: [{ x: 1, y: 0 }, { x: 2, y: 0 }],
            },
        ];
        const expectedGraph = Graph.create(expectedNodes, expectedEdges);
        expectGraphsToBeEqual(graph, expectedGraph);
    });

    it("should coalesce segmented arms of three-armed star", () => {
        const nodes: SimpleNode[] = [
            { id: "center", location: { x: 0, y: 0 } },
            { id: "rightArmJoint", location: { x: 1, y: 0 } },
            { id: "rightArmEnd", location: { x: 2, y: 0 } },
            { id: "topArmJoint", location: { x: 0, y: 1 } },
            { id: "topArmEnd", location: { x: 0, y: 2 } },
            { id: "leftArmJoint", location: { x: -1, y: 0 } },
            { id: "leftArmEnd", location: { x: -2, y: 0 } },
        ];
        const edges: SimpleEdge[] = [
            { id: "rightArm1", startNodeId: "center", endNodeId: "rightArmJoint" },
            { id: "rightArm2", startNodeId: "rightArmJoint", endNodeId: "rightArmEnd" },
            { id: "topArm1", startNodeId: "center", endNodeId: "topArmJoint" },
            { id: "topArm2", startNodeId: "topArmJoint", endNodeId: "topArmEnd" },
            { id: "leftArm1", startNodeId: "center", endNodeId: "leftArmJoint" },
            { id: "leftArm2", startNodeId: "leftArmJoint", endNodeId: "leftArmEnd" },
        ];
        const expectedNodes: SimpleNode[] = [
            { id: "center", location: { x: 0, y: 0 } },
            { id: "rightArmEnd", location: { x: 2, y: 0 } },
            { id: "topArmEnd", location: { x: 0, y: 2 } },
            { id: "leftArmEnd", location: { x: -2, y: 0 } },
        ];
        const expectedEdges: SimpleEdge[] = [
            {
                id: "rightArm1",
                startNodeId: "center",
                endNodeId: "rightArmEnd",
                innerLocations: [{ x: 1, y: 0 }],
            },
            {
                id: "topArm1",
                startNodeId: "center",
                endNodeId: "topArmEnd",
                innerLocations: [{ x: 0, y: 1 }],
            },
            {
                id: "leftArm1",
                startNodeId: "center",
                endNodeId: "leftArmEnd",
                innerLocations: [{ x: -1, y: 0 }],
            },
        ];
        const graph = Graph.create(nodes, edges).coalesced();
        const expectedGraph = Graph.create(expectedNodes, expectedEdges);
        expectGraphsToBeEqual(graph, expectedGraph);
    });

    it("should preserve inner locations in correct order", () => {
        const nodes: SimpleNode[] = [
            { id: "A", location: { x: 0, y: 0 } },
            { id: "B", location: { x: 3, y: 0 } },
            { id: "C", location: { x: 3, y: 3 } },
        ];
        const edges: SimpleEdge[] = [
            {
                id: "AB",
                startNodeId: "A",
                endNodeId: "B",
                innerLocations: [{ x: 1, y: 0 }, { x: 2, y: 0 }],
            },
            {
                id: "CB",
                startNodeId: "C",
                endNodeId: "B",
                innerLocations: [{ x: 3, y: 2 }, { x: 3, y: 1 }],
            },
        ];
        const expectedNodes: SimpleNode[] = [
            { id: "A", location: { x: 0, y: 0 } },
            { id: "C", location: { x: 3, y: 3 } },
        ];
        const expectedEdges: SimpleEdge[] = [{
            id: "AB",
            startNodeId: "A",
            endNodeId: "C",
            innerLocations: [
                { x: 1, y: 0 },
                { x: 2, y: 0 },
                { x: 3, y: 0 },
                { x: 3, y: 1 },
                { x: 3, y: 2 },
            ],
        }];
        const graph = Graph.create(nodes, edges).coalesced();
        const expectedGraph = Graph.create(expectedNodes, expectedEdges);
        expectGraphsToBeEqual(graph, expectedGraph);
    });

    it("should handle an isolated cycle", () => {
        const expectedNodes: SimpleNode[] = [{ id: "A", location: { x: 0, y: 0 } }];
        const expectedEdges: SimpleEdge[] = [{
            id: "AB",
            startNodeId: "A",
            endNodeId: "A",
            innerLocations: [{ x: 1, y: 0 }, { x: 0, y: 1 }],
        }];
        const graph = TestGraphs.getTriangle().coalesced();
        const expectedGraph = Graph.create(expectedNodes, expectedEdges);
        expectGraphsToBeEqual(graph, expectedGraph);
    });
});

describe("getConnectedComponents()", () => {
    it("should return the original graph if connected", () => {
        const graph = TestGraphs.getTwoNodes();
        const components = graph.getConnectedComponents();
        expect(components).to.have.lengthOf(1);
        expectGraphsToBeEqual(components[0], graph);
    });

    it("should return multiple components if not connected", () => {
        const nodeA = { id: "A", location: { x: 0, y: 0 } };
        const nodeB = { id: "B", location: { x: 1, y: 0 } };
        const nodeO = { id: "O", location: { x: 0, y: 1 } };
        const nodeX = { id: "X", location: { x: 2, y: 0 } };
        const nodeY = { id: "Y", location: { x: 2, y: 1 } };

        const edgeAB = { id: "AB", startNodeId: "A", endNodeId: "B" };
        const edgeXY = { id: "XY", startNodeId: "X", endNodeId: "Y" };

        const nodes: SimpleNode[] = [nodeA, nodeB, nodeO, nodeX, nodeY];
        const edges: SimpleEdge[] = [edgeAB, edgeXY];
        const expectedNodes: SimpleNode[][] = [[nodeA, nodeB], [nodeO], [nodeX, nodeY]];
        const expectedEdges: SimpleEdge[][] = [[edgeAB], [], [edgeXY]];
        const components = Graph.create(nodes, edges).getConnectedComponents();
        expect(components).to.have.length(3);
        for (let i = 0; i < 3; i++) {
            const expectedComponent = Graph.create(expectedNodes[i], expectedEdges[i]);
            expectGraphsToBeEqual(components[i], expectedComponent);
        }
    });

    it("should work if cycles are present", () => {
        const graph = TestGraphs.getTriangle();
        const components = graph.getConnectedComponents();
        expect(components).to.have.lengthOf(1);
        expectGraphsToBeEqual(components[0], graph);
    });
});

describe("getConnectedComponentsForNode()", () => {
    it("should return the original graph if connected", () => {
        const graph = TestGraphs.getTwoNodes();
        const component = graph.getConnectedComponentOfNode("A");
        expectGraphsToBeEqual(component, graph);
    });

    it("should return a single componenet if disconnected", () => {
        const nodeA = { id: "A", location: { x: 0, y: 0 } };
        const nodeB = { id: "B", location: { x: 1, y: 0 } };
        const nodeO = { id: "O", location: { x: 0, y: 1 } };
        const nodeX = { id: "X", location: { x: 2, y: 0 } };
        const nodeY = { id: "Y", location: { x: 2, y: 1 } };

        const edgeAB = { id: "AB", startNodeId: "A", endNodeId: "B" };
        const edgeXY = { id: "XY", startNodeId: "X", endNodeId: "Y" };

        const nodes: SimpleNode[] = [nodeA, nodeB, nodeO, nodeX, nodeY];
        const edges: SimpleEdge[] = [edgeAB, edgeXY];
        const expectedNodes: SimpleNode[] = [nodeA, nodeB];
        const expectedEdges: SimpleEdge[] = [edgeAB];
        const component = Graph.create(nodes, edges).getConnectedComponentOfNode("A");
        const expectedComponent = Graph.create(expectedNodes, expectedEdges);
        expectGraphsToBeEqual(component, expectedComponent);
    });

    it("should work if cycles are present", () => {
        const graph = TestGraphs.getTriangle();
        const component = graph.getConnectedComponentOfNode("A");
        expectGraphsToBeEqual(component, graph);
    });
});

describe("getShortestPath()", () => {
    it("should return a path crossing over nodes", () => {
        const graph = TestGraphs.getFourNodes();
        const start: EdgePoint = { edgeId: "AB", distance: 0.5 };
        const end: EdgePoint = { edgeId: "CD", distance: 0.5 };
        const expectedPath: Path = {
            start,
            end,
            orientedEdges: [
                { edge: graph.getEdge("AB"), isForward: true },
                { edge: graph.getEdge("BC"), isForward: true },
                { edge: graph.getEdge("CD"), isForward: true },
            ],
            nodes: [graph.getNode("B"), graph.getNode("C")],
            length: 2,
        };
        const path = graph.getShortestPath(start, end);
        expect(path).to.deep.equal(expectedPath);
    });

    it("should return a path crossing over nodes in reverse", () => {
        const graph = TestGraphs.getFourNodes();
        const start: EdgePoint = { edgeId: "CD", distance: 0.5 };
        const end: EdgePoint = { edgeId: "AB", distance: 0.5 };
        const expectedPath: Path = {
            start,
            end,
            orientedEdges: [
                { edge: graph.getEdge("CD"), isForward: false },
                { edge: graph.getEdge("BC"), isForward: false },
                { edge: graph.getEdge("AB"), isForward: false },
            ],
            nodes: [graph.getNode("C"), graph.getNode("B")],
            length: 2,
        };
        const path = graph.getShortestPath(start, end);
        expect(path).to.deep.equal(expectedPath);
    });

    it("should return the shortest path in a triangle", () => {
        const graph = TestGraphs.getTriangle();
        const start: EdgePoint = { edgeId: "CA", distance: 0.75 };
        const end: EdgePoint = { edgeId: "BC", distance: 0.25 };
        const expectedPath: Path = {
            start,
            end,
            orientedEdges: [
                { edge: graph.getEdge("CA"), isForward: true },
                { edge: graph.getEdge("AB"), isForward: true },
                { edge: graph.getEdge("BC"), isForward: true },
            ],
            nodes: [graph.getNode("A"), graph.getNode("B")],
            length: 1.5,
        };
        const path = graph.getShortestPath(start, end);
        expect(path).to.deep.equal(expectedPath);
    });

    it("should return single edge path if start and end are on the same edge", () => {
        const graph = TestGraphs.getTwoNodes();
        const start: EdgePoint = { edgeId: "AB", distance: 0.25 };
        const end: EdgePoint = { edgeId: "AB", distance: 0.75 };
        const expectedPath: Path = {
            start,
            end,
            orientedEdges: [{ edge: graph.getEdge("AB"), isForward: true }],
            nodes: [],
            length: 0.5,
        };
        const path = graph.getShortestPath(start, end);
        expect(path).to.deep.equal(expectedPath);
    });

    it("should return single edge path if start and end are on the same edge in reverse", () => {
        // Same as last test but with start and end switched.
        const graph = TestGraphs.getTwoNodes();
        const start: EdgePoint = { edgeId: "AB", distance: 0.75 };
        const end: EdgePoint = { edgeId: "AB", distance: 0.25 };
        const expectedPath: Path = {
            start,
            end,
            orientedEdges: [{ edge: graph.getEdge("AB"), isForward: false }],
            nodes: [],
            length: 0.5,
        };
        const path = graph.getShortestPath(start, end);
        expect(path).to.deep.equal(expectedPath);
    });

    it("should work if start and end are on the same edge but shortest path goes through other edges", () => {
        const nodes: SimpleNode[] = [
            { id: "A", location: { x: 0, y: 0 } },
            { id: "B", location: { x: 1, y: 0 } },
        ];
        const edges: SimpleEdge[] = [
            {
                id: "longEdge",
                startNodeId: "A",
                endNodeId: "B",
                innerLocations: [{ x: 0, y: 1 }, { x: 1, y: 1 }],
            },
            {
                id: "shortEdge",
                startNodeId: "A",
                endNodeId: "B",
            },
        ];
        const graph = Graph.create(nodes, edges);
        const start = { edgeId: "longEdge", distance: 0.25 };
        const end = { edgeId: "longEdge", distance: 2.75 };
        const expectedPath: Path = {
            start,
            end,
            orientedEdges: [
                { edge: graph.getEdge("longEdge"), isForward: false },
                { edge: graph.getEdge("shortEdge"), isForward: true },
                { edge: graph.getEdge("longEdge"), isForward: false },
            ],
            nodes: [graph.getNode("A"), graph.getNode("B")],
            length: 1.5,
        };
        const path = graph.getShortestPath(start, end);
        expect(path).to.deep.equal(expectedPath);
    });
});

describe("advancePath()", () => {
    const graph = TestGraphs.getFourNodes();
    const path: Path = {
        start: { edgeId: "AB", distance: 0.5 },
        end: { edgeId: "CD", distance: 0.5 },
        orientedEdges: [
            { edge: graph.getEdge("AB"), isForward: true },
            { edge: graph.getEdge("BC"), isForward: true },
            { edge: graph.getEdge("CD"), isForward: true },
        ],
        nodes: [graph.getNode("B"), graph.getNode("C")],
        length: 2,
    };

    it("should return the same path if distance is zero", () => {
        const advanced = graph.advancePath(path, 0);
        expect(advanced).to.deep.equal(path);
    });

    it("should advance path, dropping nodes and edges", () => {
        const advanced = graph.advancePath(path, 1.75);
        const expected: Path = {
            start: { edgeId: "CD", distance: 0.25 },
            end: { edgeId: "CD", distance: 0.5 },
            orientedEdges: [{ edge: graph.getEdge("CD"), isForward: true}],
            nodes: [],
            length: 0.25,
        };
        expect(advanced).to.deep.equal(expected);
    });

    it("should return a single-point path if distance is greater than length", () => {
        const advanced = graph.advancePath(path, 3);
        const expected: Path = {
            start: { edgeId: "CD", distance: 0.5 },
            end: { edgeId: "CD", distance: 0.5 },
            orientedEdges: [{ edge: graph.getEdge("CD"), isForward: true}],
            nodes: [],
            length: 0,
        };
        expect(advanced).to.deep.equal(expected);
    });
});

function expectGraphsToBeEqual(actual: Graph, expected: Graph): void {
    expect(actual.getAllNodes()).to.deep.equal(expected.getAllNodes());
    expect(actual.getAllEdges()).to.deep.equal(expected.getAllEdges());
}

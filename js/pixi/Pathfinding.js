// A* Pathfinding implementation
export class Pathfinding {
    constructor(terrain) {
        this.terrain = terrain;
        this.tileSize = terrain.tileSize;
    }

    // Find path from start to end using A* algorithm
    findPath(startX, startY, endX, endY) {
        // Convert world coordinates to tile coordinates
        const startTileX = Math.floor(startX / this.tileSize);
        const startTileY = Math.floor(startY / this.tileSize);
        const endTileX = Math.floor(endX / this.tileSize);
        const endTileY = Math.floor(endY / this.tileSize);

        // Check if destination is valid
        if (!this.terrain.isWalkable(endX, endY)) {
            return null;
        }

        // A* implementation
        const openList = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const startKey = `${startTileX},${startTileY}`;
        const endKey = `${endTileX},${endTileY}`;

        openList.push({ x: startTileX, y: startTileY });
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(startTileX, startTileY, endTileX, endTileY));

        while (openList.length > 0) {
            // Find node with lowest fScore
            openList.sort((a, b) => {
                const fA = fScore.get(`${a.x},${a.y}`) || Infinity;
                const fB = fScore.get(`${b.x},${b.y}`) || Infinity;
                return fA - fB;
            });

            const current = openList.shift();
            const currentKey = `${current.x},${current.y}`;

            if (current.x === endTileX && current.y === endTileY) {
                // Reconstruct path
                return this.reconstructPath(cameFrom, current);
            }

            closedSet.add(currentKey);

            // Check all 8 neighbors (including diagonals)
            const neighbors = this.getNeighbors(current.x, current.y);

            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;

                if (closedSet.has(neighborKey)) continue;

                // Check if walkable
                if (!this.terrain.isWalkable(neighbor.x * this.tileSize, neighbor.y * this.tileSize)) {
                    continue;
                }

                // Calculate tentative gScore
                const tentativeG = (gScore.get(currentKey) || 0) + neighbor.cost;

                // Check if neighbor is in open list
                const inOpenList = openList.some(n => n.x === neighbor.x && n.y === neighbor.y);

                if (!inOpenList || tentativeG < (gScore.get(neighborKey) || Infinity)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);
                    fScore.set(neighborKey, tentativeG + this.heuristic(neighbor.x, neighbor.y, endTileX, endTileY));

                    if (!inOpenList) {
                        openList.push({ x: neighbor.x, y: neighbor.y });
                    }
                }
            }
        }

        // No path found
        return null;
    }

    // Get neighboring tiles
    getNeighbors(x, y) {
        const neighbors = [];
        const dirs = [
            { dx: 0, dy: -1, cost: 1 },   // N
            { dx: 1, dy: -1, cost: 1.4 }, // NE
            { dx: 1, dy: 0, cost: 1 },    // E
            { dx: 1, dy: 1, cost: 1.4 },  // SE
            { dx: 0, dy: 1, cost: 1 },    // S
            { dx: -1, dy: 1, cost: 1.4 }, // SW
            { dx: -1, dy: 0, cost: 1 },   // W
            { dx: -1, dy: -1, cost: 1.4 } // NW
        ];

        for (const dir of dirs) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            
            if (nx >= 0 && nx < this.terrain.width && 
                ny >= 0 && ny < this.terrain.height) {
                neighbors.push({ x: nx, y: ny, cost: dir.cost });
            }
        }

        return neighbors;
    }

    // Heuristic function (Euclidean distance)
    heuristic(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    // Reconstruct path from cameFrom map
    reconstructPath(cameFrom, current) {
        const path = [];
        let curr = current;
        
        while (curr) {
            // Convert tile coordinates back to world coordinates (center of tile)
            path.unshift({
                x: curr.x * this.tileSize + this.tileSize / 2,
                y: curr.y * this.tileSize + this.tileSize / 2
            });
            curr = cameFrom.get(`${curr.x},${curr.y}`);
        }

        return path;
    }

    // Calculate direction (0-15) from dx, dy
    // Must match the formula used in Unit.go(): dx = cos((N+4)*PI/8), dy = sin((N+4)*PI/8)
    static getDirection(dx, dy) {
        // Convert to angle
        let angle = Math.atan2(dy, dx);
        
        // Reverse the original formula: angle = (N+4)*PI/8
        // So: N = (angle / (PI/8)) - 4
        let direction = (angle / (Math.PI / 8)) - 4;
        
        // Normalize to 0-15 range
        direction = Math.round(direction) % 16;
        if (direction < 0) direction += 16;
        
        return direction;
    }
}

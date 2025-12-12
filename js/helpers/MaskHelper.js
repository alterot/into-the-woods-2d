// ===== MASK HELPER =====
// Handles mask pixel reading and grid generation for pathfinding
// Caches canvas/context to avoid repeated creation
class MaskHelper {
    constructor(maskTexture) {
        if (!maskTexture) {
            throw new Error('MaskHelper requires a valid mask texture');
        }

        // Get the source image from the Phaser texture
        const sourceImage = maskTexture.getSourceImage();

        // Create and cache canvas/context once
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = sourceImage.width;
        this.canvas.height = sourceImage.height;
        this.ctx.drawImage(sourceImage, 0, 0);

        // Store dimensions for validation
        this.width = sourceImage.width;
        this.height = sourceImage.height;
    }

    /**
     * Get the color classification of a pixel at given coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {string} Color classification: 'green', 'red', 'blue', 'black', or 'other'
     */
    getPixelColor(x, y) {
        // Bounds check
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 'black'; // Out of bounds treated as blocked
        }

        const imageData = this.ctx.getImageData(x, y, 1, 1);
        const pixel = imageData.data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];

        // Green = walkable
        if (r === 0 && g === 255 && b === 0) {
            return 'green';
        }
        // Red = interactive object (kummel / runsten / liknande)
        if (r === 255 && g === 0 && b === 0) {
            return 'red';
        }
        // Blue = transition zone (t.ex. nästa scen)
        if (r === 0 && g === 0 && b === 255) {
            return 'blue';
        }
        // Black = "ingen klickyta" (osynlig vägg / utanför karta)
        if (r === 0 && g === 0 && b === 0) {
            return 'black';
        }

        // Other colors
        return 'other';
    }

    /**
     * Create a pathfinding grid by sampling the mask image
     * @param {number} gridSize - Size of each grid cell in pixels
     * @returns {number[][]} 2D array where 0 = walkable, 1 = blocked
     */
    createGrid(gridSize) {
        // Calculate grid dimensions
        const cols = Math.ceil(this.width / gridSize);
        const rows = Math.ceil(this.height / gridSize);

        // Initialize grid array
        const grid = [];

        // Sample each grid cell
        for (let row = 0; row < rows; row++) {
            grid[row] = [];
            for (let col = 0; col < cols; col++) {
                // Sample the center of the grid cell
                const x = col * gridSize + gridSize / 2;
                const y = row * gridSize + gridSize / 2;

                // Get pixel color at this position
                const imageData = this.ctx.getImageData(x, y, 1, 1);
                const pixel = imageData.data;
                const r = pixel[0];
                const g = pixel[1];
                const b = pixel[2];

                // Green = walkable (0), anything else = blocked (1)
                if (r === 0 && g === 255 && b === 0) {
                    grid[row][col] = 0; // Walkable
                } else {
                    grid[row][col] = 1; // Blocked
                }
            }
        }

        return grid;
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.canvas = null;
        this.ctx = null;
    }
}

export default MaskHelper;

// Add image loading at the top of the file
const playerImage = new Image();
playerImage.src = 'hockey-player.png';  // Save the provided image as hockey-player.png

class Player {
    constructor(x, y, color, controls) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.color = color;
        this.speed = 5;
        this.controls = controls;
    }

    move(keys) {
        if (keys[this.controls.up]) this.y -= this.speed;
        if (keys[this.controls.down]) this.y += this.speed;
        if (keys[this.controls.left]) this.x -= this.speed;
        if (keys[this.controls.right]) this.x += this.speed;

        // Keep player within bounds
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

// Add constant for rink dimensions and features
const RINK = {
    CORNER_RADIUS: 40,
    FACEOFF_CIRCLE_RADIUS: 30,
    BLUE_LINE_DISTANCE: 235,  // Distance from center to blue line
    LINE_WIDTH: 2,
    CENTER_CIRCLE_RADIUS: 30,
    GAME_DURATION: 120, // 2 minutes in seconds
    COLORS: {
        BOUNDARY: '#003087',  // Navy blue
        ICE: '#FFFFFF',      // White ice
        RED_LINES: '#c8102e', // NHL red
        BLUE_LINES: '#003087' // NHL blue
    }
};

class Puck {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.dx = 0;
        this.dy = 0;
        this.friction = 0.999;
    }

    move() {
        this.x += this.dx;
        this.y += this.dy;
        this.dx *= this.friction;
        this.dy *= this.friction;
        
        // Handle corner collisions
        this.handleCornerCollisions();
        
        // Handle straight wall collisions
        this.handleWallCollisions();
    }

    handleCornerCollisions() {
        const corners = [
            {x: RINK.CORNER_RADIUS, y: RINK.CORNER_RADIUS},
            {x: RINK.CORNER_RADIUS, y: canvas.height - RINK.CORNER_RADIUS},
            {x: canvas.width - RINK.CORNER_RADIUS, y: RINK.CORNER_RADIUS},
            {x: canvas.width - RINK.CORNER_RADIUS, y: canvas.height - RINK.CORNER_RADIUS}
        ];

        corners.forEach(corner => {
            // First check if we're actually in the corner region
            const inCornerRegion = (
                (corner.x <= RINK.CORNER_RADIUS && this.x <= RINK.CORNER_RADIUS) ||
                (corner.x >= canvas.width - RINK.CORNER_RADIUS && this.x >= canvas.width - RINK.CORNER_RADIUS)
            ) && (
                (corner.y <= RINK.CORNER_RADIUS && this.y <= RINK.CORNER_RADIUS) ||
                (corner.y >= canvas.height - RINK.CORNER_RADIUS && this.y >= canvas.height - RINK.CORNER_RADIUS)
            );

            if (inCornerRegion) {
                const dx = this.x - corner.x;
                const dy = this.y - corner.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Only bounce if we're actually hitting the curved boundary
                if (distance < RINK.CORNER_RADIUS - this.radius) {
                    // Calculate normal vector from corner center to puck
                    const nx = dx / distance;
                    const ny = dy / distance;

                    // Move puck to the curve surface
                    this.x = corner.x + (RINK.CORNER_RADIUS - this.radius) * nx;
                    this.y = corner.y + (RINK.CORNER_RADIUS - this.radius) * ny;

                    // Calculate reflection vector
                    const dotProduct = (this.dx * nx + this.dy * ny);
                    
                    // Apply bounce only to the perpendicular component of velocity
                    this.dx = this.dx - 2 * dotProduct * nx;
                    this.dy = this.dy - 2 * dotProduct * ny;

                    // Apply bounce coefficient
                    this.dx *= 0.8;
                    this.dy *= 0.8;
                }
            }
        });
    }

    handleWallCollisions() {
        // Vertical walls
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.dx *= -0.8;
        } else if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.dx *= -0.8;
        }

        // Horizontal walls
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.dy *= -0.8;
        } else if (this.y + this.radius > canvas.height) {
            this.y = canvas.height - this.radius;
            this.dy *= -0.8;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.closePath();
    }
}

// Add new Score class
class Score {
    constructor() {
        this.redScore = 0;
        this.blueScore = 0;
    }

    draw(ctx) {
        ctx.font = '32px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        // Draw scoreboard background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(canvas.width/2 - 100, 10, 200, 40);
        // Draw scores
        ctx.fillStyle = 'red';
        ctx.fillText(this.redScore, canvas.width/2 - 40, 40);
        ctx.fillStyle = 'black';
        ctx.fillText('-', canvas.width/2, 40);
        ctx.fillStyle = 'blue';
        ctx.fillText(this.blueScore, canvas.width/2 + 40, 40);
    }
}

// Add new Goal class
class Goal {
    constructor(x, y, isLeft) {
        this.x = x;
        this.y = y;
        this.width = 15;
        this.height = 80;
        this.isLeft = isLeft;
        // Goal post positions
        this.posts = {
            top: this.y,
            bottom: this.y + this.height,
            front: isLeft ? this.x : this.x + this.width,
            back: isLeft ? this.x + this.width : this.x
        };
    }

    checkGoal(puck) {
        return (
            puck.x > this.x && 
            puck.x < this.x + this.width &&
            puck.y > this.y && 
            puck.y < this.y + this.height
        );
    }

    draw(ctx, color) {
        // Draw goal net
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.fill();
        
        // Draw goal posts
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        // Top post
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        // Bottom post
        ctx.moveTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        // Front post
        ctx.moveTo(this.posts.front, this.y);
        ctx.lineTo(this.posts.front, this.y + this.height);
        ctx.stroke();
    }
}

// Add Timer class
class Timer {
    constructor(duration) {
        this.duration = duration;
        this.timeLeft = duration;
        this.lastTime = Date.now();
    }

    update() {
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (this.timeLeft > 0) {
            this.timeLeft -= deltaTime;
            if (this.timeLeft < 0) this.timeLeft = 0;
        }
    }

    draw(ctx) {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = Math.floor(this.timeLeft % 60);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        ctx.font = '32px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText(timeString, canvas.width/2, 80);
    }

    isGameOver() {
        return this.timeLeft <= 0;
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Reset canvas size
canvas.width = 800;
canvas.height = 400;

// Create players
const player1 = new Player(200, canvas.height/2, 'red', {
    up: 'w',
    down: 's',
    left: 'a',
    right: 'd'
});

const player2 = new Player(600, canvas.height/2, 'blue', {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight'
});

// Create puck
const puck = new Puck(canvas.width/2, canvas.height/2);

// Create score tracker
const score = new Score();

// Create goals
const leftGoal = new Goal(10, canvas.height/2 - 40, true);
const rightGoal = new Goal(canvas.width - 25, canvas.height/2 - 40, false);

// Create timer
const timer = new Timer(RINK.GAME_DURATION);

// Track pressed keys
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

function checkCollision(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < circle1.radius + circle2.radius;
}

function gameLoop() {
    // Update timer
    timer.update();

    // Clear canvas and draw rink
    drawRink();

    // Draw scoreboard and timer
    score.draw(ctx);
    timer.draw(ctx);

    // Only update game if time hasn't run out
    if (!timer.isGameOver()) {
        // Move and draw players
        player1.move(keys);
        player2.move(keys);
        player1.draw(ctx);
        player2.draw(ctx);

        // Handle collisions
        if (checkCollision(player1, puck)) {
            const dx = puck.x - player1.x;
            const dy = puck.y - player1.y;
            const angle = Math.atan2(dy, dx);
            const speed = 10;
            puck.dx = Math.cos(angle) * speed;
            puck.dy = Math.sin(angle) * speed;
        }

        if (checkCollision(player2, puck)) {
            const dx = puck.x - player2.x;
            const dy = puck.y - player2.y;
            const angle = Math.atan2(dy, dx);
            const speed = 10;
            puck.dx = Math.cos(angle) * speed;
            puck.dy = Math.sin(angle) * speed;
        }

        // Check for goals
        if (leftGoal.checkGoal(puck)) {
            score.blueScore++;
            resetPuck();
        }
        if (rightGoal.checkGoal(puck)) {
            score.redScore++;
            resetPuck();
        }

        // Move and draw puck
        puck.move();
        puck.draw(ctx);
    } else {
        // Draw game over message
        ctx.font = '48px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', canvas.width/2, canvas.height/2);
        
        // Show winner
        const winner = score.redScore > score.blueScore ? 'Red' : 
                      score.blueScore > score.redScore ? 'Blue' : 'Tie';
        ctx.font = '32px Arial';
        ctx.fillText(winner === 'Tie' ? 'It\'s a Tie!' : `${winner} Wins!`, 
                    canvas.width/2, canvas.height/2 + 50);
    }

    requestAnimationFrame(gameLoop);
}

function drawRink() {
    // Fill ice surface with white
    ctx.fillStyle = RINK.COLORS.ICE;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw blue lines with increased thickness
    ctx.beginPath();
    ctx.strokeStyle = RINK.COLORS.BLUE_LINES;
    ctx.lineWidth = 4;
    
    // Left blue line
    ctx.moveTo(canvas.width/2 - RINK.BLUE_LINE_DISTANCE, 0);
    ctx.lineTo(canvas.width/2 - RINK.BLUE_LINE_DISTANCE, canvas.height);
    
    // Right blue line
    ctx.moveTo(canvas.width/2 + RINK.BLUE_LINE_DISTANCE, 0);
    ctx.lineTo(canvas.width/2 + RINK.BLUE_LINE_DISTANCE, canvas.height);
    ctx.stroke();

    // Draw center red line
    ctx.beginPath();
    ctx.strokeStyle = RINK.COLORS.RED_LINES;
    ctx.lineWidth = 2;
    ctx.moveTo(canvas.width/2, 0);
    ctx.lineTo(canvas.width/2, canvas.height);
    ctx.stroke();

    // Draw center circle
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, RINK.CENTER_CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = RINK.COLORS.BLUE_LINES;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw the main rink outline last (on top)
    ctx.beginPath();
    ctx.strokeStyle = RINK.COLORS.BOUNDARY;
    ctx.lineWidth = 4;

    // Draw rounded rectangle for rink boundary
    ctx.moveTo(canvas.width - RINK.CORNER_RADIUS, 0);
    ctx.arcTo(canvas.width, 0, canvas.width, RINK.CORNER_RADIUS, RINK.CORNER_RADIUS);
    ctx.lineTo(canvas.width, canvas.height - RINK.CORNER_RADIUS);
    ctx.arcTo(canvas.width, canvas.height, canvas.width - RINK.CORNER_RADIUS, canvas.height, RINK.CORNER_RADIUS);
    ctx.lineTo(RINK.CORNER_RADIUS, canvas.height);
    ctx.arcTo(0, canvas.height, 0, canvas.height - RINK.CORNER_RADIUS, RINK.CORNER_RADIUS);
    ctx.lineTo(0, RINK.CORNER_RADIUS);
    ctx.arcTo(0, 0, RINK.CORNER_RADIUS, 0, RINK.CORNER_RADIUS);
    ctx.lineTo(canvas.width - RINK.CORNER_RADIUS, 0);
    ctx.stroke();

    // Draw goals
    leftGoal.draw(ctx, RINK.COLORS.RED_LINES);
    rightGoal.draw(ctx, RINK.COLORS.RED_LINES);
}

// Add function to reset puck after goal
function resetPuck() {
    puck.x = canvas.width/2;
    puck.y = canvas.height/2;
    puck.dx = 0;
    puck.dy = 0;
}

// Start the game
gameLoop(); 
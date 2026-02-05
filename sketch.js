// Anna Wasson
// Lab 4: Pong (responsive version)

// ---------- Responsive helpers ----------
let baseW = 400;
let baseH = 400;

// scale factor based on smallest side (keep gameplay proportions)
function s(v) {
  return v * scaleFactor;
}

let scaleFactor = 1;

// ---------- Game state ----------
let xBall, yBall;
let xSpeed, ySpeed;
let score = 0;

let paddleX = 0; // was x
let paddleYBase = 375;

let paddleSpeedBase = 10;

// device motion
let accX = 0,
  accY = 0,
  accZ = 0;
let rrateX = 0,
  rrateY = 0,
  rrateZ = 0;

// device orientation
let rotateDegrees = 0;
let frontToBack = 0;
let leftToRight = 0;

let askButton;

function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  angleMode(DEGREES);

  resetScale();
  resetBall();

  // permission / listeners
  if (
    typeof DeviceMotionEvent?.requestPermission === "function" &&
    typeof DeviceOrientationEvent?.requestPermission === "function"
  ) {
    askButton = createButton("Permission");
    askButton.position(10, 10);
    askButton.mousePressed(handlePermissionButtonPressed);
  } else {
    window.addEventListener("devicemotion", deviceMotionHandler, true);
    window.addEventListener("deviceorientation", deviceTurnedHandler, true);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  resetScale();

  // keep paddle in range after resize
  paddleX = constrain(paddleX, paddleHalfW(), width - paddleHalfW());
  // keep ball in range after resize
  xBall = constrain(xBall, ballR(), width - ballR());
  yBall = constrain(yBall, ballR(), height - ballR());
}

function resetScale() {
  scaleFactor = min(width / baseW, height / baseH);
}

function resetBall() {
  xBall = random(width * 0.25, width * 0.75);
  yBall = ballR() + s(30);

  // real random speeds (scaled)
  xSpeed = random([ -1, 1 ]) * random(s(2), s(7));
  ySpeed = random([ -1, 1 ]) * random(s(2), s(7));

  // make sure ball goes generally downward at start (optional)
  if (ySpeed < 0) ySpeed *= -1;
}

function draw() {
  background(0);

  // ---------- Input -> paddle movement ----------
  let paddleSpeed = s(paddleSpeedBase);

  // tilt zones
  if (leftToRight > 20) {
    paddleX += paddleSpeed;
  } else if (leftToRight < -20) {
    paddleX -= paddleSpeed;
  }

  // keep paddle inside screen
  paddleX = constrain(paddleX, paddleHalfW(), width - paddleHalfW());

  // ---------- Ball ----------
  moveBall();
  bounceWalls();
  bouncePaddle();

  // ---------- Draw ----------
  drawTiltArrow();
  drawBall();
  drawPaddle();
  drawHUD();
}

function drawTiltArrow() {
  // simple arrow indicator at center
  push();
  translate(width / 2, height / 2);

  noStroke();
  if (leftToRight > 20) {
    fill(255, 0, 0);
    push();
    rotate(90);
    triangle(s(-30), s(-40), 0, s(-100), s(30), s(-40));
    pop();
  } else if (leftToRight < -20) {
    fill(0, 0, 255);
    push();
    rotate(-90);
    triangle(s(-30), s(-40), 0, s(-100), s(30), s(-40));
    pop();
  } else if (frontToBack > 40) {
    fill(255);
    push();
    rotate(-180);
    triangle(s(-30), s(-40), 0, s(-100), s(30), s(-40));
    pop();
  } else if (frontToBack < 0) {
    fill(255);
    triangle(s(-30), s(-40), 0, s(-100), s(30), s(-40));
  }

  pop();
}

function drawBall() {
  fill("#d9c3f7");
  noStroke();
  ellipse(xBall, yBall, ballR() * 2, ballR() * 2);
}

function drawPaddle() {
  fill("#ffffff");
  noStroke();
  rect(paddleX, paddleY(), paddleW(), paddleH());
}

function drawHUD() {
  // Score (top-left, responsive)
  fill("#d9c3f7");
  noStroke();
  textSize(s(24));
  textAlign(LEFT, TOP);
  text("Score: " + score, s(10), s(10));

  // Debug text (slightly below, responsive)
  fill(255);
  textSize(s(12));
  let y0 = s(50);

  text("acceleration:", s(10), y0);
  text(
    nf(accX, 1, 2) + ", " + nf(accY, 1, 2) + ", " + nf(accZ, 1, 2),
    s(10),
    y0 + s(16)
  );

  text("rotation rate:", s(10), y0 + s(40));
  text(
    nf(rrateX, 1, 2) + ", " + nf(rrateY, 1, 2) + ", " + nf(rrateZ, 1, 2),
    s(10),
    y0 + s(56)
  );

  text("device orientation:", s(10), y0 + s(80));
  text(
    nf(rotateDegrees, 1, 2) +
      ", " +
      nf(leftToRight, 1, 2) +
      ", " +
      nf(frontToBack, 1, 2),
    s(10),
    y0 + s(96)
  );
}

// ---------- Physics ----------
function moveBall() {
  xBall += xSpeed;
  yBall += ySpeed;
}

function bounceWalls() {
  // left/right
  if (xBall < ballR() || xBall > width - ballR()) {
    xSpeed *= -1;
    xBall = constrain(xBall, ballR(), width - ballR());
  }
  // top
  if (yBall < ballR()) {
    ySpeed *= -1;
    yBall = ballR();
  }
  // bottom: you can choose reset or bounce. Here: reset + score stays
  if (yBall > height - ballR()) {
    // optional: reset score if miss
    // score = 0;
    resetBall();
  }
}

function bouncePaddle() {
  // paddle hit test (using paddle rect bounds)
  let px = paddleX;
  let py = paddleY();
  let halfW = paddleHalfW();
  let halfH = paddleH() / 2;

  let hitX = xBall > px - halfW && xBall < px + halfW;
  let hitY = yBall + ballR() >= py - halfH && yBall - ballR() <= py + halfH;

  // only bounce when moving downward (prevents double-bounce)
  if (hitX && hitY && ySpeed > 0) {
    ySpeed *= -1;

    // add a little angle effect based on where it hits the paddle
    let offset = (xBall - px) / halfW; // -1..1
    xSpeed += offset * s(1.5);

    score++;
    yBall = py - halfH - ballR(); // push ball above paddle
  }
}

// ---------- Size getters (responsive) ----------
function ballR() {
  return s(10); // base 10 in 400x400
}
function paddleW() {
  return s(90);
}
function paddleH() {
  return s(15);
}
function paddleHalfW() {
  return paddleW() / 2;
}
function paddleY() {
  // keep it near bottom regardless of height
  return height - s(25);
}

// ---------- Permissions / Sensors ----------
function handlePermissionButtonPressed() {
  DeviceMotionEvent.requestPermission().then((response) => {
    if (response === "granted") {
      window.addEventListener("devicemotion", deviceMotionHandler, true);
    }
  });

  DeviceOrientationEvent.requestPermission()
    .then((response) => {
      if (response === "granted") {
        window.addEventListener("deviceorientation", deviceTurnedHandler, true);
      }
    })
    .catch(console.error);
}

function deviceMotionHandler(event) {
  // some devices can be null
  accX = event.acceleration?.x ?? 0;
  accY = event.acceleration?.y ?? 0;
  accZ = event.acceleration?.z ?? 0;

  rrateZ = event.rotationRate?.alpha ?? 0;
  rrateX = event.rotationRate?.beta ?? 0;
  rrateY = event.rotationRate?.gamma ?? 0;
}

function deviceTurnedHandler(event) {
  rotateDegrees = event.alpha ?? 0;
  frontToBack = event.beta ?? 0;
  leftToRight = event.gamma ?? 0;
}

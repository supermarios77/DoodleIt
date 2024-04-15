// Define constants
const hints = {
    'apple': 'Fruit with a stem and a leaf on top',
    'bowtie': 'A symmetrical accessory worn around the neck',
    'candle': 'A cylindrical object with a wick on top',
    'door': 'A rectangular object with a knob or handle',
    'envelope': 'A paper container used for sending letters',
    'fish': 'An aquatic creature with fins and gills',
    'guitar': 'A musical instrument with strings and a body',
    'ice cream': 'A frozen dessert usually served in a cone or a cup',
    'lightning': 'A sudden electrostatic discharge during a thunderstorm',
    'moon': 'A natural satellite that orbits around the Earth',
    'mountain': 'A large landform that rises above the surrounding land',
    'star': 'A luminous celestial object visible in the night sky',
    'tent': 'A portable shelter typically used for camping',
    'toothbrush': 'An oral hygiene instrument used for cleaning teeth',
    'wristwatch': 'A timekeeping device worn on the wrist'
};

const MODEL_URL = 'model/model.json';
let model;
let currentHintIndex = 0;
let timer; // Timer variable
const hintsPerGame = 4; // Number of hints per game
let remainingHints = shuffle(Object.keys(hints)); // Shuffle the hints array
let correctGuesses = 0; // Counter for correct guesses
let predictedClass; // Predicted class variable
let isGameStarted = false; // Flag to track if the game is started

// Add event listener for the clear canvas button
document.getElementById('clear-canvas-btn').addEventListener('click', clearCanvas);

// Define a function to clear the canvas
function clearCanvas() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Function to start the game
function startGame() {
    isGameStarted = true;
    document.getElementById('start-game-btn').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    loadModel().then(startDrawing);

    // Start the timer
    startTimer();
}

// Function to load the TensorFlow model
async function loadModel() {
    try {
        model = await tf.loadLayersModel(MODEL_URL);
        console.log('Model loaded successfully:', model);
    } catch (error) {
        console.error('Failed to load the model:', error);
    }
}

// Function to start drawing
function startDrawing() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Ensure canvas size is fixed
    canvas.width = 400;
    canvas.height = 400;

    let isDrawing = false;

    canvas.addEventListener('mousedown', () => {
        isDrawing = true;
    });

    canvas.addEventListener('mousemove', (event) => {
        if (isDrawing) {
            draw(event.offsetX, event.offsetY, ctx);
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
        evaluateDrawing(canvas);
    });

    setTimeout(() => {
        displayHint();
    }, 2000);
}

// Function to draw on canvas
function draw(x, y, ctx) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
}

// Function to display hint
function displayHint() {
    const hintElement = document.getElementById('hint');
    const currentObject = remainingHints[currentHintIndex];
    const currentHint = hints[currentObject];
    hintElement.textContent = 'Hint: ' + currentHint;

    // Check if the timer is already running
    if (!isTimerRunning()) {
        // Start the timer only if it's not already running
        startTimer();
    }

    // Speak out loud the hint
    speakText('Hint: ' + currentHint);
}

// Function to check if the timer is running
function isTimerRunning() {
    return timer !== null;
}


// Function to evaluate drawing
async function evaluateDrawing(canvas) {
    if (!isGameStarted) return; // Do nothing if the game is not started

    const hintElement = document.getElementById('hint');
    const predictionElement = document.getElementById('prediction');

    const currentHint = hints[remainingHints[currentHintIndex]];

    // Speak out loud the hint only if it hasn't been spoken before
    if (currentHint !== hintElement.textContent.replace('Hint: ', '')) {
        hintElement.textContent = 'Hint: ' + currentHint;
        speakText('Hint: ' + currentHint);
    }

    // Convert the drawn image data to a tensor
    const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const tensor = tf.browser.fromPixels(imageData, 1).resizeBilinear([28, 28]).toFloat().div(255).reshape([1, 28, 28, 1]);

    // Make predictions using the model
    const prediction = model.predict(tensor);
    const classIndex = prediction.argMax(1).dataSync()[0];
    predictedClass = Object.keys(hints)[classIndex];

    // Speak out loud the prediction
    speakText('We think you are drawing ' + predictedClass);

    if (predictedClass === remainingHints[currentHintIndex]) {
        predictionElement.textContent = 'Correct! You drew a ' + predictedClass;
        correctGuesses++;
    } else {
        predictionElement.textContent = 'Incorrect! The correct object was: ' + remainingHints[currentHintIndex];
    }

    currentHintIndex++;

    // If no hints remaining or time's up, display the correct answer
    if (currentHintIndex >= hintsPerGame || remainingHints.length === 0) {
        timesUp();
    } else {
        displayHint(); // Display the next hint
    }
}

// Function to display game results
function displayResults() {
    let results = 'Results:\n';
    for (let i = 0; i < hintsPerGame; i++) {
        const object = remainingHints[i];
        if (object) {
            results += object + ': ' + (object === predictedClass ? 'Correct' : 'Incorrect') + '\n';
        }
    }
    alert(results);
}

// Function to start the timer
function startTimer() {
    const timerElement = document.getElementById('timer');
    let timeLeft = 30; // 30 seconds timer
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timerElement.textContent = 'Time left: ' + timeLeft + 's';
            timeLeft--;
        } else {
            clearInterval(timer);
            timerElement.textContent = 'Time\'s up!';
            evaluateDrawingTimeout();
        }
    }, 1000);
}

// Function to handle time's up scenario
function evaluateDrawingTimeout() {
    const hintElement = document.getElementById('hint');
    const predictionElement = document.getElementById('prediction');

    const currentHint = hints[remainingHints[currentHintIndex]];
    hintElement.textContent = 'Hint: ' + currentHint;
    predictionElement.textContent = 'Time\'s up! The correct object was: ' + remainingHints[currentHintIndex];
    currentHintIndex++;

    // Speak out loud the time's up message and the correct object
    speakText('Time\'s up! The correct object was ' + remainingHints[currentHintIndex - 1]);

    // Display the results after a short delay
    setTimeout(displayResults, 2000);
}

// Function to clear the "Time's up!" message
function clearTimesUp() {
    const hintElement = document.getElementById('hint');
    hintElement.textContent = 'Hint: ' + hints[remainingHints[currentHintIndex]];
    speakText('Hint: ' + hints[remainingHints[currentHintIndex]])
}

// Function to clear spoken text
function clearSpokenText() {
    const spokenTextElement = document.getElementById('spoken-text');
    spokenTextElement.textContent = '';
}

// Function to display game results
function displayResults() {
    let results = 'Results:\n';
    for (let i = 0; i < hintsPerGame; i++) {
        const object = remainingHints[i];
        if (object) {
            results += object + ': ' + (object === predictedClass ? 'Correct' : 'Incorrect') + '\n';
        }
    }
    alert(results);
}

// Function to shuffle array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Function to speak text
function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}
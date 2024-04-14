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

// Add event listener for the clear canvas button
document.getElementById('clear-canvas-btn').addEventListener('click', clearCanvas);

// Add event listener for the start game button
document.getElementById('start-game-btn').addEventListener('click', startGame);

// Define a function to clear the canvas
function clearCanvas() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Function to speak text using the SpeechSynthesis API
function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}

// Load the TensorFlow model
async function loadModel() {
    try {
        model = await tf.loadLayersModel(MODEL_URL);
        console.log('Model loaded successfully:', model);
    } catch (error) {
        console.error('Failed to load the model:', error);
    }
}

// Display the hint for the current object
function displayHint() {
    const hintElement = document.getElementById('hint');
    const currentObject = remainingHints[currentHintIndex];
    const currentHint = hints[currentObject];
    hintElement.textContent = `Draw a ${currentObject}. Hint: ${currentHint}`;

    // Restart the timer for each new hint
    restartTimer();

    // Clear the "Time's Up" message when a new hint is displayed
    clearTimesUp();

    // Clear the spoken text when a new hint is displayed
    clearSpokenText();
}

// Make a prediction based on the drawing
async function predict(canvas) {
    // Preprocess the canvas drawing
    const preprocessedData = await preprocessData(canvas);

    // Make predictions
    const predictions = model.predict(preprocessedData);

    // Get the predicted class index
    const predictedIndex = predictions.argMax(-1).dataSync()[0];

    // Map the class index to a human-readable class name
    const classNames = Object.keys(hints);
    predictedClass = classNames[predictedIndex]; // Assign the predicted class to the global variable

    return predictedClass;
}

// Preprocess the canvas drawing data
async function preprocessData(canvas) {
    try {
        // Convert the canvas drawing to an image
        const imgData = canvas.toDataURL();

        // Create a new Promise to load image asynchronously
        const img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = imgData;
        });

        // Create a tensor from the image data
        const tensor = tf.browser.fromPixels(img);

        // Convert RGB image data to grayscale
        const grayscaleTensor = tensor.mean(2).expandDims(2);

        // Resize the image to 28x28
        const resizedTensor = tf.image.resizeBilinear(grayscaleTensor, [28, 28]);

        // Normalize pixel values to the range [0, 1]
        const normalizedTensor = resizedTensor.toFloat().div(255);

        // Expand dimensions to match the expected input shape of the model
        const preprocessedData = normalizedTensor.expandDims(0);

        return preprocessedData;
    } catch (error) {
        console.error('Error preprocessing data:', error);
        return null;
    }
}

// Start the drawing process
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

    // Display the first hint after a delay
    setTimeout(() => {
        displayHint();
    }, 2000);
}

// Draw on the canvas
function draw(x, y, ctx) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
}

// Evaluate the drawing
async function evaluateDrawing(canvas) {
    const hintElement = document.getElementById('hint');
    const predictionElement = document.getElementById('prediction');

    const currentHint = hints[remainingHints[currentHintIndex]];
    hintElement.textContent = `Hint: ${currentHint}`;

    // Speak out loud the hint
    speakText(`Hint: ${currentHint}`);

    // Make prediction
    predictedClass = await predict(canvas);

    // Speak out loud the predicted class
    speakText(`We think you are drawing ${predictedClass}`);

    if (predictedClass === remainingHints[currentHintIndex]) {
        // Correct guess
        predictionElement.textContent = `Correct! You drew a ${predictedClass}`;
        correctGuesses++;

        currentHintIndex++;

        // Clear the canvas after 2 seconds
        setTimeout(() => {
            clearCanvas();
            predictionElement.textContent = '';
        }, 2000);
    } else {
        // Incorrect guess
        predictionElement.textContent = `Keep drawing to match the hint. We think you are drawing ${predictedClass}`;
    }

    // If no hints remaining or time's up, display the correct answer
    if (currentHintIndex >= hintsPerGame || remainingHints.length === 0) {
        clearTimeout(timer); // Stop the timer
        timesUp();
    } else {
        displayHint(); // Display the next hint
    }
}

// Start the game
function startGame() {
    // Hide the start button and show the game elements
    document.getElementById('start-game-btn').style.display = 'none';
    document.getElementById('game').style.display = 'block';

    // Load the model and start drawing
    loadModel().then(startDrawing);

    // Start the timer
    startTimer();
}

// Start the timer
function startTimer() {
    const timerElement = document.getElementById('timer');
    let timeLeft = 30; // 30 seconds timer
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timerElement.textContent = `Time left: ${timeLeft}s`;
            timeLeft--;
        } else {
            clearInterval(timer);
            timerElement.textContent = 'Time\'s up!';
            evaluateDrawingTimeout();
        }
    }, 1000);
}

// Restart the timer
function restartTimer() {
    clearInterval(timer);
    startTimer();
}

// Handle timeout scenario
function evaluateDrawingTimeout() {
    const hintElement = document.getElementById('hint');
    const predictionElement = document.getElementById('prediction');

    const currentHint = hints[remainingHints[currentHintIndex]];
    hintElement.textContent = `Hint: ${currentHint}`;
    predictionElement.textContent = `Time's up! The correct object was: ${remainingHints[currentHintIndex]}`;
    currentHintIndex++;

    // Speak out loud the time's up message and the correct object
    speakText(`Time's up! The correct object was ${remainingHints[currentHintIndex - 1]}`);

    // Display the results after a short delay
    setTimeout(displayResults, 2000);
}

// Clear the "Time's Up" message
function clearTimesUp() {
    const hintElement = document.getElementById('hint');
    hintElement.textContent = `Hint: ${hints[remainingHints[currentHintIndex]]}`;
    speakText(`Hint: ${hints[remainingHints[currentHintIndex]]}`);
}

// Clear the spoken text
function clearSpokenText() {
    const spokenTextElement = document.getElementById('spoken-text');
    spokenTextElement.textContent = '';
}

// Display the results
function displayResults() {
    let results = 'Results:\n';
    for (let i = 0; i < hintsPerGame; i++) {
        const object = remainingHints[i];
        if (object) {
            results += `${object}: ${object === predictedClass ? 'Correct' : 'Incorrect'}\n`;
        }
    }
    alert(results);
}

// Function to shuffle an array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
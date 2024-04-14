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

// Define a function to clear the canvas
function clearCanvas() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}

async function loadModel() {
    try {
        model = await tf.loadLayersModel(MODEL_URL);
        console.log('Model loaded successfully:', model);
    } catch (error) {
        console.error('Failed to load the model:', error);
    }
}

function displayHint() {
    const hintElement = document.getElementById('hint');
    const currentObject = remainingHints[currentHintIndex];
    const currentHint = hints[currentObject];
    hintElement.textContent = 'Draw a ' + currentObject + '. Hint: ' + currentHint;

    // Restart the timer for each new hint
    restartTimer();

    // Clear the "Time's Up" message when a new hint is displayed
    clearTimesUp();

    // Clear the spoken text when a new hint is displayed
    clearSpokenText();
}

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

// Preprocessing function for live data
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

// Start the game
function startGame() {
    document.getElementById('start-game-btn').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    loadModel().then(startDrawing);

    // Start the timer
    startTimer();
}

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

function restartTimer() {
    clearInterval(timer);
    startTimer();
}

// Evaluate the drawing when the timer reaches zero
function evaluateDrawingTimeout() {
    const hintElement = document.getElementById('hint');
    const predictionElement = document.getElementById('prediction');

    // Check if the hint has already been spoken
    if (!hintSpoken) {
        const currentHint = hints[remainingHints[currentHintIndex]];
        hintElement.textContent = `Hint: ${currentHint}`;

        // Speak out loud the time's up message and the correct object
        speakText(`Time's up! The correct object was ${remainingHints[currentHintIndex]}`);
        
        // Set the flag to true to indicate that the hint has been spoken
        hintSpoken = true;
    }
    
    predictionElement.textContent = 'Time\'s up!';

    // Display the results after a short delay
    setTimeout(displayResults, 2000);
}

// Evaluate the drawing
async function evaluateDrawing(canvas) {
    const hintElement = document.getElementById('hint');
    const predictionElement = document.getElementById('prediction');

    const currentHint = hints[remainingHints[currentHintIndex]];
    hintElement.textContent = `Hint: ${currentHint}`;

    // Check if the hint has already been spoken
    if (!hintSpoken) {
        // Speak out loud the hint
        speakText(`Hint: ${currentHint}`);
        
        // Set the flag to true to indicate that the hint has been spoken
        hintSpoken = true;
    }

    // Make prediction
    predictedClass = await predict(canvas);

    // Speak out loud the predicted class
    speakText(`We think you are drawing ${predictedClass}`);

    if (predictedClass === remainingHints[currentHintIndex]) {
        // Correct guess
        predictionElement.textContent = `Correct! You drew a ${predictedClass}`;
        correctGuesses++;

        currentHintIndex++;

        // Reset the flag for the next hint
        hintSpoken = false;

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
        clearInterval(timer); // Stop the timer
        timesUp();
    } else {
        displayHint(); // Display the next hint
    }
}
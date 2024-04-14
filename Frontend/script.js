// Define constants
const MODEL_URL = 'model/model.json';
let model;
let currentHintIndex = 0;
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
    const currentHint = hints[Object.keys(hints)[currentHintIndex]];
    hintElement.textContent = 'Hint: ' + currentHint;
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
    const predictedClass = classNames[predictedIndex];

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

    displayHint();
}

function draw(x, y, ctx) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
}

async function evaluateDrawing(canvas) {
    const predictedClass = await predict(canvas);
    const hintElement = document.getElementById('hint');
    const predictionElement = document.getElementById('prediction');

    const currentHint = hints[Object.keys(hints)[currentHintIndex]];
    hintElement.textContent = 'Hint: ' + currentHint;

    if (predictedClass === Object.keys(hints)[currentHintIndex]) {
        predictionElement.textContent = 'Correct! You drew a ' + predictedClass;
        currentHintIndex++;
        displayHint();
    } else {
        predictionElement.textContent = 'Keep drawing to match the hint';
    }
}

function startGame() {
    document.getElementById('start-game-btn').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    loadModel().then(startDrawing);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-game-btn').addEventListener('click', startGame);
});
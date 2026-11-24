
const quizId = document.body.dataset.quizId;
const message = document.getElementById("message");
const startForm = document.getElementById("start-form");
const questionBox = document.getElementById("question-box");
const optionsDiv = document.getElementById("options");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const submitButton = document.getElementById("submit-button");

const timeLeftElement = document.getElementById("time-left");
const timerElement = document.getElementById("timer");
const feedbackDiv = document.getElementById("answer-feedback");

// Progress tracking elements
const answeredCountElement = document.getElementById("answered-count");
const unansweredCountElement = document.getElementById("unanswered-count");
const progressFill = document.getElementById("progress-fill");

let quiz = null;
let playerName = "";
let currentIndex = 0;
let startTime = 0;
let timerInterval = null;
let timeRemaining = 0;
let quizInProgress = false;
let isSubmitting = false;

const answers = {};
const feedback = {};
const checking = {};

// Shuffle questions randomly using Fisher-Yates algorithm
function shuffleQuestions() {
    for (let i = quiz.questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [quiz.questions[i], quiz.questions[j]] =
            [quiz.questions[j], quiz.questions[i]];
    }
}

// Update progress only after successful backend checking
function updateProgress() {
    if (!quiz) {
        return;
    }

    const totalQuestions = quiz.questions.length;
    const answeredQuestions = Object.keys(feedback).length;
    const unansweredQuestions = totalQuestions - answeredQuestions;

    const percentage = totalQuestions > 0
        ? (answeredQuestions / totalQuestions) * 100
        : 0;

    answeredCountElement.textContent =
        "Answered: " + answeredQuestions;

    unansweredCountElement.textContent =
        "Unanswered: " + unansweredQuestions;

    progressFill.style.width = percentage + "%";

    progressFill.setAttribute(
        "aria-valuenow",
        Math.round(percentage)
    );
}

// Load quiz
async function loadQuiz() {
    try {
        const response = await fetch("/api/quizzes/" + quizId);

        if (!response.ok) {
            document.getElementById("quiz-title").textContent = "Quiz";
            message.textContent = "Quiz not found.";
            return;
        }

        quiz = await response.json();

        document.getElementById("quiz-title").textContent = quiz.title;
        document.getElementById("quiz-description").textContent = quiz.description;
        document.getElementById("quiz-category").textContent = quiz.category;
        document.getElementById("quiz-difficulty").textContent = quiz.difficulty;
        document.getElementById("quiz-question-count").textContent =
            quiz.question_count;

        if (quiz.questions.length === 0) {
            message.textContent = "This quiz has no questions yet.";
            return;
        }

        startForm.hidden = false;

    } catch (error) {
        message.textContent = "Unable to load quiz. Please try again.";
    }
}

// Show answer feedback
function showFeedback(question) {
    const result = feedback[question.id];

    feedbackDiv.replaceChildren();
    feedbackDiv.className = "";

    if (!result) {
        return;
    }

    const correctLabel = result.correct_option;

    document.querySelectorAll("#options .option").forEach(function (label) {
        const radio = label.querySelector("input");

        radio.disabled = true;

        if (radio.value === correctLabel) {
            label.classList.add("correct-option");
        }

        if (!result.is_correct && radio.value === answers[question.id]) {
            label.classList.add("wrong-option");
        }
    });

    const status = document.createElement("p");

    if (result.is_correct) {
        status.textContent = "✅ Correct answer!";
        feedbackDiv.classList.add("correct-feedback");
    } else {
        status.textContent = "❌ Incorrect answer.";
        feedbackDiv.classList.add("wrong-feedback");

        const correctAnswer = document.createElement("p");
        correctAnswer.textContent = "Correct answer: " + correctLabel;
        feedbackDiv.appendChild(correctAnswer);
    }

    feedbackDiv.appendChild(status);

    const explanation = document.createElement("p");
    explanation.textContent = result.explanation
        ? "Explanation: " + result.explanation
        : "No explanation available.";

    feedbackDiv.appendChild(explanation);
}

// Check selected answer using backend API
async function checkAnswer(question, letter) {
    const questionId = question.id;

    if (checking[questionId] || feedback[questionId]) {
        return;
    }

    checking[questionId] = true;

    document.querySelectorAll("#options input").forEach(function (radio) {
        radio.disabled = true;
    });

    feedbackDiv.textContent = "Checking your answer...";

    try {
        const response = await fetch(
            "/api/quizzes/" + quizId +
            "/questions/" + questionId + "/check",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    answer: letter
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to check answer.");
        }

        // Save feedback only after successful backend response
        feedback[questionId] = result;

        // Update progress after successful checking
        updateProgress();

        if (quiz.questions[currentIndex].id === questionId) {
            showFeedback(question);
        }

    } catch (error) {
        delete answers[questionId];

        if (quiz.questions[currentIndex].id === questionId) {
            feedbackDiv.textContent =
                error.message || "Unable to check answer. Please try again.";

            document.querySelectorAll("#options input").forEach(function (radio) {
                radio.disabled = false;
                radio.checked = false;
            });
        }

    } finally {
        delete checking[questionId];
    }
}

// Display options
function showOption(question, letter) {
    const label = document.createElement("label");
    label.className = "option";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "option";
    radio.value = letter;
    radio.checked = answers[question.id] === letter;

    radio.addEventListener("change", function () {
        answers[question.id] = letter;
        checkAnswer(question, letter);
    });

    const text = document.createElement("span");
    text.textContent =
        letter + ". " + question["option_" + letter.toLowerCase()];

    label.appendChild(radio);
    label.appendChild(text);
    optionsDiv.appendChild(label);
}

// Display current question
function showQuestion() {
    const question = quiz.questions[currentIndex];
    const isLast = currentIndex === quiz.questions.length - 1;

    document.getElementById("progress").textContent =
        "Question " + (currentIndex + 1) + " of " + quiz.questions.length;

    document.getElementById("question-text").textContent = question.text;

    optionsDiv.innerHTML = "";
    feedbackDiv.replaceChildren();
    feedbackDiv.className = "";

    const availableOptions = question.question_type === "true_false"
        ? ["A", "B"]
        : ["A", "B", "C", "D"];

    availableOptions.forEach(function (letter) {
        showOption(question, letter);
    });

    if (feedback[question.id]) {
        showFeedback(question);
    } else if (checking[question.id]) {
        document.querySelectorAll("#options input").forEach(function (radio) {
            radio.disabled = true;
        });

        feedbackDiv.textContent = "Checking your answer...";
    }

    prevButton.disabled = currentIndex === 0;
    nextButton.hidden = isLast;
    submitButton.hidden = !isLast;
}

// Prevent accidental closing during quiz
window.addEventListener("beforeunload", (event) => {
    if (quizInProgress) {
        event.preventDefault();
        event.returnValue = "";
    }
});

// Update countdown display
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    timeLeftElement.textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");

    if (timeRemaining <= 60) {
        timerElement.classList.add("timer-warning");
    } else {
        timerElement.classList.remove("timer-warning");
    }
}

// Start countdown
function startTimer() {
    timeRemaining = quiz.questions.length * 60;

    updateTimerDisplay();

    timerInterval = setInterval(function () {
        timeRemaining--;

        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;

            message.textContent =
                "⏰ Time is up! Your quiz is being submitted.";

            submitQuiz();
        }
    }, 1000);
}

// Submit quiz
async function submitQuiz() {
    if (isSubmitting) {
        return;
    }

    isSubmitting = true;

    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    const seconds = Math.round((Date.now() - startTime) / 1000);

    submitButton.disabled = true;
    nextButton.disabled = true;
    prevButton.disabled = true;

    try {
        const response = await fetch("/api/quizzes/" + quizId + "/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                player_name: playerName,
                answers: answers,
                time_taken_seconds: seconds
            })
        });

        const result = await response.json();

        if (!response.ok) {
            message.textContent =
                result.error || "Unable to submit quiz.";

            isSubmitting = false;
            submitButton.disabled = false;
            nextButton.disabled = false;
            prevButton.disabled = false;
            return;
        }

        result.player_name = playerName;

        sessionStorage.setItem("result", JSON.stringify(result));

        quizInProgress = false;

        window.location.href = "/result";

    } catch (error) {
        message.textContent =
            "Network error. Please check your connection and try again.";

        isSubmitting = false;
        submitButton.disabled = false;
        nextButton.disabled = false;
        prevButton.disabled = false;
    }
}

// Start quiz
startForm.addEventListener("submit", function (event) {
    event.preventDefault();

    playerName = document.getElementById("player-name").value.trim();

    if (playerName === "") {
        message.textContent = "Please enter your name.";
        return;
    }

    message.textContent = "";

    startForm.hidden = true;
    questionBox.hidden = false;

    currentIndex = 0;
    startTime = Date.now();
    quizInProgress = true;

    shuffleQuestions();

    // Start progress from zero
    updateProgress();

    showQuestion();
    startTimer();
});

// Previous question
prevButton.addEventListener("click", function () {
    if (currentIndex > 0) {
        currentIndex--;
        showQuestion();
    }
});

// Next question
nextButton.addEventListener("click", function () {
    if (currentIndex < quiz.questions.length - 1) {
        currentIndex++;
        showQuestion();
    }
});

// Manual submission
submitButton.addEventListener("click", submitQuiz);

// Load quiz when page opens
loadQuiz();

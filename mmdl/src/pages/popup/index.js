import "../../style.css";

let progressBar;

// Buttons
let downloadBtn;

// Messages
let infoAlert;
let successAlert;
let warningAlert;
let errorAlert;

// Inputs
let filenameInput;
let videoFormatInput;

document.addEventListener("DOMContentLoaded", function () {

    // Get the download button
    downloadBtn = document.getElementById("downloadBtn");

    // Get the alerts
    infoAlert = document.getElementById("infoAlert");
    successAlert = document.getElementById("successAlert");
    warningAlert = document.getElementById("warningAlert");
    errorAlert = document.getElementById("errorAlert");

    // Get the input elements
    filenameInput = document.getElementById("filenameInput");
    videoFormatInput = document.getElementById("videoFormatInput");

    progressBar = document.getElementById("progressBar");

    // Add event listeners
    downloadBtn.addEventListener("click", downloadVideo);
});

function hasWarning() {
    if (!filenameInput.value) {
        warningAlert.classList.remove("hidden");
        warningAlert.classList.add("flex");
        warningAlert.children[1].textContent = "Please enter a filename.";

        // Add the border-warning class to the input
        filenameInput.classList.add("border-warning");

        return true;
    }

    return false;
}

function clearWarnings() {
    warningAlert.classList.remove("flex");
    warningAlert.classList.add("hidden");

    // Remove the border-warning class from the input
    filenameInput.classList.remove("border-warning");
}

function hasError() {
    if (videoFormatInput.value === "Video Format") {
        errorAlert.classList.remove("hidden");
        errorAlert.classList.add("flex");
        errorAlert.children[1].textContent = "Please select a video format.";

        // Add the border-warning class to the input
        videoFormatInput.classList.add("border-error");

        return true;
    }

    return false;
}

function clearErrors() {
    errorAlert.classList.remove("flex");
    errorAlert.classList.add("hidden");

    // Remove the border-warning class from the input
    videoFormatInput.classList.remove("border-error");
}

function downloadVideo() {
    if (hasWarning()) {
        return;
    }

    clearWarnings();

    if (hasError()) {
        return;
    }

    clearErrors();

    // Get the video name and format
    const videoName = filenameInput.value;
    const videoFormat = videoFormatInput.value;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["content/content.js"],
        }, () => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "downloadVideo", videoName, videoFormat });
        });
    });
}

function initializeProgressBar(totalChunks) {
    progressBar.max = totalChunks;
    progressBar.value = 0;

    // Set the info alert to visible
    infoAlert.classList.remove("hidden");
    infoAlert.classList.add("flex");
    infoAlert.children[1].textContent = "Downloading video...";

    // Disable the download button
    downloadBtn.disabled = true;
}

function updateProgressBar(chunkIndex) {
    progressBar.value = chunkIndex;
}

function finishProgressBar() {
    progressBar.value = progressBar.max;

    // Set the info alert to hidden
    infoAlert.classList.remove("flex");
    infoAlert.classList.add("hidden");

    // Set the success alert to visible
    successAlert.classList.remove("hidden");
    successAlert.classList.remove("animate-pulse");
    successAlert.classList.add("flex");
    successAlert.children[1].textContent = "Video downloaded successfully!";

    // Enable the download button
    downloadBtn.disabled = false;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.status === "downloadStarted") {
        console.log("Download started");
        initializeProgressBar(message.totalChunks);
    } else if (message.status === "chunkLoaded") {
        console.log("Chunk loaded");
        updateProgressBar(message.chunkIndex);
    } else if (message.status === "downloadFinished") {
        console.log("Download finished");
        finishProgressBar();
    }
});

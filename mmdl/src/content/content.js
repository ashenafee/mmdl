// Get the current URL
var url = window.location.href;

/**
 * Fetches the video chunks and returns a list of URLs.
 *
 * @param {string} chunklistUrl - The URL of the chunklist file.
 * @returns {Promise<string[]>} The list of URLs of the video chunks.
 */
async function fetchVideoChunks(chunklistUrl) {
    // Fetch
    const response = await fetch(chunklistUrl);
    const data = await response.text();

    // Parse the chunklist data
    const chunklist = data.split("\n");

    // Keep only the lines that contain the chunk URLs (.ts)
    const chunkLines = chunklist.filter((line) => line.endsWith(".ts"));

    // Get the chunk URLs (https://stream.library.utoronto.ca:1935/MyMedia/play/mp4:1/<ID>.mp4/media_w548935148_0.ts)
    const chunks = chunkLines.map((line) => {
        const chunkUrl =
            chunklistUrl.substring(0, chunklistUrl.lastIndexOf("/") + 1) + line;
        return chunkUrl;
    });

    // Return the list of URLs
    return chunks;
}

/**
 * Loads a video chunk and returns it as an ArrayBuffer.
 *
 * @param {string} chunkUrl - The URL of the video chunk.
 * @returns {Promise<ArrayBuffer>} The video chunk data.
 */
async function loadChunk(chunkUrl) {
    try {
        const response = await fetch(chunkUrl);
        return await response.arrayBuffer();
    } catch (error) {
        console.error("Error fetching chunk:", error);
        throw error;
    }
}

/**
 * Downloads the video by concatenating all video chunks into a single Blob and creating a download link.
 *
 * @param {string} chunklistUrl - The URL of the chunklist file.
 * @param {string} videoName - The name of the video.
 * @param {string} videoFormat - The format of the video.
 */
function downloadVideo(chunklistUrl, videoName, videoFormat) {
    fetchVideoChunks(chunklistUrl).then(async (chunks) => {
        // Send a message to indicate that the download has started
        chrome.runtime.sendMessage({
            status: "downloadStarted",
            totalChunks: chunks.length,
        });

        // Load all chunks
        const chunkData = await Promise.all(
            chunks.map((chunkUrl, index) => {
                return loadChunk(chunkUrl).then((chunk) => {
                    // Send a message for each chunk loaded
                    chrome.runtime.sendMessage({
                        status: "chunkLoaded",
                        chunkIndex: index + 1,
                    });
                    return chunk;
                });
            })
        );

        // Concatenate all chunks into a single Blob
        const videoBlob = new Blob(chunkData, { type: "video/mp4" });

        // Create a download link for the video
        const videoUrl = URL.createObjectURL(videoBlob);
        const a = document.createElement("a");
        a.href = videoUrl;
        a.download = videoName + "." + videoFormat;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Send a message to indicate that the download has finished
        chrome.runtime.sendMessage({ status: "downloadFinished" });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "downloadVideo") {
        if (
            url.startsWith("https://play.library.utoronto.ca/") ||
            url.includes("play.library.utoronto.ca/")
        ) {
            // Extract the video ID from the URL (last part of the URL)
            var videoId = url.substring(url.lastIndexOf("/") + 1);

            // Construct the chunklist URL
            var chunklistUrl =
                "https://stream.library.utoronto.ca:1935/MyMedia/play/mp4:1/" +
                videoId +
                ".mp4/chunklist.m3u8";

            // Fetch the video chunks
            downloadVideo(chunklistUrl, message.videoName, message.videoFormat);
        }
    }
});

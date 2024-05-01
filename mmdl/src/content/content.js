import mime from "mime";

/**
 * @type {string}
 */
const url = window.location.href;

/**
 * Fetches the video chunks and returns a list of URLs.
 *
 * @param {string} chunklistUrl - The URL of the chunklist file.
 * @returns {Promise<string[]>} The list of URLs of the video chunks.
 */
async function fetchVideoChunks(chunklistUrl) {
    const response = await fetch(chunklistUrl);
    const data = await response.text();

    const chunklist = data.split("\n");
    const chunkLines = chunklist.filter((line) => line.endsWith(".ts"));

    const chunks = chunkLines.map((line) => {
        const chunkUrl =
            chunklistUrl.substring(0, chunklistUrl.lastIndexOf("/") + 1) + line;
        return chunkUrl;
    });

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
        /** @type {chrome.runtime.MessageSender} */
        const sendMessage = chrome.runtime.sendMessage;

        sendMessage({ status: "downloadStarted", totalChunks: chunks.length });

        const chunkData = await Promise.all(
            chunks.map(async (chunkUrl, index) => {
                const chunk = await loadChunk(chunkUrl);
                sendMessage({ status: "chunkLoaded", chunkIndex: index + 1 });
                return chunk;
            })
        );

        const videoBlob = new Blob(chunkData, {
            type: mime.getType(videoFormat),
        });
        const videoUrl = URL.createObjectURL(videoBlob);
        const a = document.createElement("a");
        a.href = videoUrl;
        a.download = `${videoName}.${videoFormat}`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        sendMessage({ status: "downloadFinished" });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "downloadVideo") {
        if (
            url.startsWith("https://play.library.utoronto.ca/") ||
            url.includes("play.library.utoronto.ca/")
        ) {
            const videoId = url.substring(url.lastIndexOf("/") + 1);
            const chunklistUrl = `https://stream.library.utoronto.ca:1935/MyMedia/play/mp4:1/${videoId}.mp4/chunklist.m3u8`;

            downloadVideo(chunklistUrl, message.videoName, message.videoFormat);
        }
    }
});

// Configuración del worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("pdfFile");
    const extractTextButton = document.getElementById("extractText");
    const highlightContainer = document.getElementById("highlightContainer");
    const playButton = document.getElementById("play");
    const pauseButton = document.getElementById("pause");
    const stopButton = document.getElementById("stop");

    let lines = [];
    let currentLineIndex = 0;
    let paragraphElements = [];
    let isPlaying = false;
    let currentAudio = null;

    extractTextButton.addEventListener("click", async () => {
        if (fileInput.files.length === 0) {
            alert("Por favor, selecciona un archivo PDF.");
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = async function () {
            try {
                const typedArray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
                let extractedText = "";

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContentObj = await page.getTextContent();
                    let pageText = textContentObj.items.map(item => item.str).join(" ");
                    pageText = pageText.replace(/-\s+/g, "");
                    pageText = pageText.replace(/\s+/g, " ").trim();
                    pageText = pageText.replace(/([.?!])\s+/g, "$1\n\n");
                    extractedText += pageText + "\n\n";
                }

                lines = extractedText.split("\n").filter(line => line.trim() !== "");
                displayHighlightableText();
            } catch (error) {
                console.error("Error al extraer texto del PDF:", error);
                alert("Ocurrió un error al procesar el PDF.");
            }
        };

        reader.readAsArrayBuffer(file);
    });

    function displayHighlightableText() {
        highlightContainer.innerHTML = "";
        paragraphElements = [];
        let paragraph = "";
        let paragraphNode;

        lines.forEach((line) => {
            if (line.trim() !== "") {
                paragraph += line + " ";
            }
            if (line.endsWith(".") || line.endsWith("?") || line.endsWith("!") || paragraph.length > 100) {
                paragraphNode = document.createElement("p");
                paragraphNode.textContent = paragraph.trim();
                highlightContainer.appendChild(paragraphNode);
                paragraphElements.push(paragraphNode);
                paragraph = "";
            }
        });

        if (paragraph.trim()) {
            paragraphNode = document.createElement("p");
            paragraphNode.textContent = paragraph.trim();
            highlightContainer.appendChild(paragraphNode);
            paragraphElements.push(paragraphNode);
        }
    }

    playButton.addEventListener("click", () => {
        if (lines.length === 0) {
            alert("No hay texto para leer.");
            return;
        }
        if (!isPlaying) {
            isPlaying = true;
            currentLineIndex = 0;
            playButton.textContent = "Reanudar";
            readNextLine();
        } else if (currentAudio) {
            currentAudio.play();
        }
    });

    pauseButton.addEventListener("click", () => {
        if (isPlaying && currentAudio) {
            currentAudio.pause();
            playButton.textContent = "Reanudar";
        }
    });

    stopButton.addEventListener("click", () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        isPlaying = false;
        currentLineIndex = 0;
        paragraphElements.forEach(p => p.classList.remove("highlight"));
        playButton.textContent = "Reproducir";
    });

    function readNextLine() {
        if (currentLineIndex < lines.length && isPlaying) {
            const textToRead = lines[currentLineIndex].trim();
            if (textToRead) {
                highlightLine(currentLineIndex);

                fetch("/backend/polly_test.php", { // Asegúrate de que la ruta sea correcta en tu servidor
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ textToRead: textToRead })
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errorData => {
                            throw new Error(errorData.error || "Error en respuesta: " + response.status);
                        });
                    }
                    return response.blob();
                })
                .then(blob => {
                    const audioURL = URL.createObjectURL(blob);
                    currentAudio = new Audio(audioURL);
                    currentAudio.play();
                    currentAudio.onended = () => {
                        currentLineIndex++;
                        readNextLine();
                    };
                })
                .catch(error => {
                    console.error("Error al reproducir audio:", error);
                    currentLineIndex++;
                    readNextLine(); // continuar incluso si hay error
                });
            } else {
                currentLineIndex++;
                readNextLine();
            }
        } else {
            isPlaying = false;
            playButton.textContent = "Reproducir";
            paragraphElements.forEach(p => p.classList.remove("highlight"));
        }
    }

    function highlightLine(index) {
        paragraphElements.forEach(p => p.classList.remove("highlight"));
        if (index < 0 || index >= lines.length) return;
        const currentLine = lines[index].trim();
        for (let p of paragraphElements) {
            if (p.textContent.includes(currentLine)) {
                p.classList.add("highlight");
                p.scrollIntoView({ behavior: "smooth", block: "center" });
                break;
            }
        }
    }

    // Accesibilidad por teclado
    document.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();

        if (key === "s") {
            fileInput.click();
        } else if (key === "e") {
            extractTextButton.click();
        } else if (key === "p" || key === " ") {
            event.preventDefault();
            if (!isPlaying) {
                playButton.click();
            } else {
                pauseButton.click();
            }
        } else if (key === "r") {
            stopButton.click();
        }
    });
});

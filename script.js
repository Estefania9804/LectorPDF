document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("pdfFile");
    const extractTextButton = document.getElementById("extractText");
    const highlightContainer = document.getElementById("highlightContainer");

    const playButton = document.getElementById("play");
    const pauseButton = document.getElementById("pause");
    const stopButton = document.getElementById("stop");

    let speechSynthesisUtterance;
    let isPaused = false;
    let lines = [];
    let currentLineIndex = 0;
    let paragraphElements = []; // Guardará referencias a los párrafos

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
                    
                    // Extraer solo los strings y unirlos
                    let pageText = textContentObj.items.map(item => item.str).join(" ");

                    // 1️⃣ Reparar palabras separadas por guion al final de línea
                    pageText = pageText.replace(/-\s+/g, "");

                    // 2️⃣ Eliminar espacios dobles y caracteres extraños
                    pageText = pageText.replace(/\s+/g, " ").trim();

                    // 3️⃣ Agregar salto de línea después de cada oración
                    pageText = pageText.replace(/([.?!])\s+/g, "$1\n\n");

                    extractedText += pageText + "\n\n";
                }

                lines = extractedText.split("\n").filter(line => line.trim() !== ""); // Eliminar líneas vacías
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
        paragraphElements = []; // Reiniciar referencias

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

        if (!isPaused) {
            speechSynthesis.cancel();
            currentLineIndex = 0;
            readLine();
        } else {
            speechSynthesis.resume();
        }

        isPaused = false;
    });

    function readLine() {
        if (currentLineIndex >= lines.length) {
            return;
        }

        const line = lines[currentLineIndex].trim();
        if (line) {
            highlightLine(currentLineIndex);
            speechSynthesisUtterance = new SpeechSynthesisUtterance(line);
            speechSynthesisUtterance.onend = () => {
                currentLineIndex++;
                readLine();
            };
            speechSynthesis.speak(speechSynthesisUtterance);
        } else {
            currentLineIndex++;
            readLine();
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

    pauseButton.addEventListener("click", () => {
        speechSynthesis.pause();
        isPaused = true;
    });

    stopButton.addEventListener("click", () => {
        speechSynthesis.cancel();
        isPaused = false;
        currentLineIndex = 0;
        paragraphElements.forEach(p => p.classList.remove("highlight"));
    });
});

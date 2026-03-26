import OpenAI from "openai";
import crypto from "node:crypto";

const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

const AiModels = ["inception/mercury-2", "arcee-ai/trinity-large-preview:free"];

let tries = 0;

const port = 3500

// Words from completed rounds only (avoid leaking current-round guesses to later players).
let previousWords = [];
let currentWords = [];

let games = 0

let correct = true

let active = false

const group = new Map()

const server = Bun.serve({
    port: port,
    fetch(request, server) {
        if (server.upgrade(request)) {
            return
        }
        return new Response("Hellooo World!")
    },
    websocket: {
        open(ws) {
            console.log("connection opened")
            const welcomeMessage = "Welcome to two AIs try to guess the same word!!!"
            ws.send(JSON.stringify({type: "welcome", message: welcomeMessage, previousWords}))
            ws.subscribe("guess-group")
            group.set(ws, true)
        },
        close(ws) {
            console.log("connection closed")
            group.delete(ws)
        },
        message(ws, message) {
            if (message == "on") {
                active = true
                game()
                ws.send(JSON.stringify({type:"started", message:"Game has started!"}))
            }
            if (message == "off") {
                active = false
                ws.send(JSON.stringify({type:"stopped", message:"Game has stopped!"}))
            }
        }
    }
})

console.log("websocket server is running on: " + port)

let gameId = ""

async function game() {
    while(active == true) {
        if (correct == true) {
            gameId = crypto.randomUUID();
            previousWords = []
            tries = 0
            correct = false
        }
        console.log("Game ID: " + gameId);
        while (correct == false) {
            tries += 1
            console.log("Try: " + tries)

            for (let i = 0; i < AiModels.length; i++) {
                const model = AiModels[i];
                const previousWordsMessage =
                    previousWords.length > 0 ? previousWords.join(", ") : "(none yet)";

                const completion = await client.chat.completions.create({
                    model: model,
                    messages: [
                        {
                            role: "system",
                            content: `You are AI Player #${i + 1} playing a game called "Guess the same word". You are playing with other AI players and you all need to try to guess the same word by going off what the others said in previous rounds. Pick a word that you think others might also pick based on the context. Do NOT talk about strategy. Write your word as <word>YOUR WORD</word>. Game ID: ${gameId} (do not mention).`,
                        },
                        {
                            role: "user",
                            content:
                                `Round ${tries}. Please enter a single word.\n` +
                                `Previous rounds words: ${previousWordsMessage}`,
                        }
                        
                    ],
                    temperature: 1.0,
                })

                console.log("Player #" + (i + 1) + " Message: " + completion.choices[0].message.content)

                const lowerCase = completion.choices[0].message.content.toLowerCase()

                const match = lowerCase.match(/<word>(.*?)<\/word>/);
                const result = match ? match[1].trim() : "(invalid)";

                currentWords.push(result)
            }
            // Add all words to previousWords AFTER all models have responded
            previousWords.push(...currentWords)

            console.log("Current words: " + currentWords)

            const wordCounts = currentWords.reduce((countMap, word) => {
            countMap[word] = (countMap[word] || 0) + 1;
            return countMap;
            }, {});

            console.log(wordCounts);

            console.log("length: " + currentWords.length)

            if (Object.keys(wordCounts).length === 1) {
                console.log("All words are the same well done!")
                correct = true
                games += 1
            }
            else {
                console.log("All word aren't the same, please try again.")
            }

            for (const ws of group.keys()) {
                ws.send(JSON.stringify({type:"round", game: games, gameId: gameId, models: AiModels, guess: currentWords, status: correct}))
            }

            currentWords = []

        }
    }
}
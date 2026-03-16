import OpenAI from "openai";
import crypto from "node:crypto";

const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

const AiModels = ["arcee-ai/trinity-large-preview:free", "inception/mercury-2"];

let tries = 0;

// Words from completed rounds only (avoid leaking current-round guesses to later players).
let previousWords = [];
let currentWords = [];

let correct = false

const gameId = crypto.randomUUID();
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
    }
    else {
        console.log("All word aren't the same, please try again.")
    }
    currentWords = []


}

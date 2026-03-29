import OpenAI from "openai";
import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_DEFAULT_KEY);


const AiModels = ["x-ai/grok-4.20-beta", "anthropic/claude-sonnet-4.6", "inception/mercury-2", "nvidia/nemotron-3-super-120b-a12b", "google/gemini-3.1-pro-preview", "kwaipilot/kat-coder-pro-v2", "z-ai/glm-5", "openai/gpt-5.2"];

let tries = 0;

const port = 3500

let previousWords = [];
let currentWords = [];

let games = 0
let currentGameNumber = 0

let correct = true

let active = false

let usePrerecordedGames = true

const themes = ["Minecraft", "Real", "Magical", "Sports", "Game", "item", "technology", "english", "office", "programming", "languages", "verbs", "robotics", "computers", "art", "food", "movie", "drink"]

let currentThemes = []

function hasLiveListeners() {
    return [...group.values()].some(state => !state.usePrerecorded);
}

function resetLiveGameState() {
    gameId = "";
    currentGameNumber = 0;
    currentAIModels = [];
    currentThemes = [];
    currentWords = [];
    previousWords = [];
    tries = 0;
    correct = true;
}

function getDifferentRandomThemes(count) {
    return themes.sort(() => Math.random() - 0.5).slice(0, count);
}

async function saveRoundToDatabase(gameId, gameNumber, model1, model2, theme, roundNumber, model1Word, model2Word, matched) {
    await supabase.from('rounds').insert({
        id: crypto.randomUUID(),
        game_id: gameId,
        game_number: gameNumber,
        created_at: new Date().toISOString(),
        model_1: model1,
        model_2: model2,
        theme: theme,
        round_number: roundNumber,
        model_1_word: model1Word,
        model_2_word: model2Word,
        matched: matched
    });
}

const group = new Map()

async function getRandomPrerecordedGame() {
    const { data: completedGames } = await supabase
        .from("rounds")
        .select("game_id")
        .eq("matched", true)
        .gt("round_number", 1);
    const uniqueGameIds = [...new Set((completedGames ?? []).map(row => row.game_id).filter(Boolean))];
    if (uniqueGameIds.length === 0) return null;

    const randomGameId = uniqueGameIds[Math.floor(Math.random() * uniqueGameIds.length)];
    const { data: rounds } = await supabase.from("rounds")
        .select("game_id, game_number, model_1, model_2, theme, round_number, model_1_word, model_2_word, matched")
        .eq("game_id", randomGameId)
        .order("round_number", { ascending: true });

    return rounds?.length ? { gameId: randomGameId, rounds } : null;
}

async function runPrerecordedLoop(ws, playbackRunId) {
    const state = group.get(ws);
    while (group.has(ws) && state?.usePrerecorded && state?.playbackRunId === playbackRunId) {
        const prerecordedGame = await getRandomPrerecordedGame();
        if (!prerecordedGame) {
            ws.send(JSON.stringify({ type: "error", message: "No prerecorded games found.", isPrerecorded: true }));
            return;
        }

        const playbackGameNumber = prerecordedGame.rounds[0].game_number ?? games + 1;
        ws.send(JSON.stringify({ type: "started", message: "Prerecorded game loaded!", gameId: prerecordedGame.gameId, gameNumber: playbackGameNumber, isPrerecorded: true }));

        for (const round of prerecordedGame.rounds) {
            if (state.playbackRunId !== playbackRunId) return;
            ws.send(JSON.stringify({ type: "round", game: playbackGameNumber, gameNumber: playbackGameNumber, gameId: round.game_id, models: [round.model_1, round.model_2], guess: [round.model_1_word, round.model_2_word], status: round.matched, isPrerecorded: true }));
            await new Promise(resolve => setTimeout(resolve, 750));
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
}

function startPrerecordedLoop(ws) {
    const state = group.get(ws);
    if (!state) return;
    state.playbackRunId = (state.playbackRunId ?? 0) + 1;
    group.set(ws, state);
    runPrerecordedLoop(ws, state.playbackRunId).catch(console.error);
}

function ensureLiveGameRunning() {
    if (active || !hasLiveListeners()) return;
    active = true;
    game().catch(err => { console.error("Live game loop crashed:", err); active = false; });
}

const server = Bun.serve({
    port: port,
    fetch(request, server) {
        const usePrerecorded = usePrerecordedGames;
        if (server.upgrade(request, { data: { usePrerecorded } })) return;
        return new Response("Hellooo World!")
    },
    websocket: {
        open(ws) {
            console.log("connection opened")
            const usePrerecorded = Boolean(ws.data?.usePrerecorded);
            ws.send(JSON.stringify({ type: "welcome", message: "Welcome to two AIs try to guess the same word!!!", previousWords: usePrerecorded ? [] : previousWords, isPrerecorded: usePrerecorded }))
            ws.subscribe("guess-group")
            group.set(ws, { usePrerecorded, playbackRunId: 0 })
            if (usePrerecorded) startPrerecordedLoop(ws)
            else { ensureLiveGameRunning(); ws.send(JSON.stringify({ type: "started", message: "Game has started!", gameNumber: currentGameNumber || games + 1, isPrerecorded: false })) }
        },
        close(ws) {
            console.log("connection closed")
            group.delete(ws)
            if (!hasLiveListeners()) { active = false; resetLiveGameState(); }
        },
    }
})

console.log("websocket server is running on: " + port)

let gameId = ""
let currentAIModels = []

function pickRandomModels() {
    return AiModels.sort(() => Math.random() - 0.5).slice(0, 2);
}

async function game() {
    while (active) {
        if (!hasLiveListeners()) { active = false; resetLiveGameState(); break; }

        if (correct) {
            gameId = crypto.randomUUID();
            currentGameNumber = games + 1;
            previousWords = [];
            tries = 0;
            correct = false;
            currentAIModels = pickRandomModels();
            currentThemes = getDifferentRandomThemes(currentAIModels.length);
            console.log("Selected models:", currentAIModels);
            console.log("Themes:", currentThemes);
        }
        console.log("Game ID: " + gameId);

        while (!correct && active) {
            tries++;
            console.log("Try: " + tries);

            for (let i = 0; i < currentAIModels.length; i++) {
                const model = currentAIModels[i];
                const previousWordsMessage = previousWords.length > 0 ? previousWords.join(", ") : "(none yet)";
                const completion = await client.chat.completions.create({
                    model,
                    messages: [
                        { role: "system", content: `You are AI Player #${i + 1} playing a game called "Guess the same word". You are playing with other AI players and you all need to try to guess the same word by going off what the others said in previous rounds. Pick a word that you think others might also pick based on the context. Though for the first round you must generate a word based on theme: ${currentThemes[i]}, after the first round you do not need to follow the theme. Do NOT talk about strategy and you may NOT repeat the same word again after you've said it. Write your word as <word>YOUR WORD</word>. Game ID: ${gameId} (do not mention).` },
                        { role: "user", content: `Round ${tries}. Please enter a single word.\nPrevious rounds words: ${previousWordsMessage}` }
                    ],
                    temperature: 1.0,
                });

                console.log("Player #" + (i + 1) + " Message: " + completion.choices[0].message.content);
                const match = completion.choices[0].message.content.toLowerCase().match(/<word>(.*?)<\/word>/);
                currentWords.push(match ? match[1].trim() : "(invalid)");
            }

            previousWords.push(...currentWords);
            console.log("Current words:", currentWords);

            const wordCounts = currentWords.reduce((countMap, word) => { countMap[word] = (countMap[word] || 0) + 1; return countMap; }, {});
            console.log(wordCounts);

            if (Object.keys(wordCounts).length === 1) {
                console.log("All words are the same well done!");
                correct = true;
                games = currentGameNumber;
            } else {
                console.log("All words aren't the same, please try again.");
            }

            await saveRoundToDatabase(gameId, currentGameNumber, currentAIModels[0], currentAIModels[1], currentThemes.join(", "), tries, currentWords[0], currentWords[1], correct);

            for (const [ws, state] of group.entries()) {
                if (!state.usePrerecorded) ws.send(JSON.stringify({ type: "round", game: currentGameNumber, gameNumber: currentGameNumber, gameId, models: currentAIModels, guess: currentWords, status: correct, isPrerecorded: false }));
            }
            currentWords = [];
        }
    }
}

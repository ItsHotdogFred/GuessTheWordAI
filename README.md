# Guess the Same Word AI

A WebSocket-based game where multiple AI models compete to guess the same word.

[View the web demo](https://gtw.itsfred.dev/)

[View the web demo repo](https://github.com/ItsHotdogFred/website-ai-arena)

## Overview

This project runs a real-time game where AI players attempt to coordinate and guess identical words. Each round, AI models are given themes and must independently choose words, hoping to match what other the AI player choose. The game continues until all models select the same word.

## How It Works

1. Two AI models are randomly selected from a pool of available models
2. Each model receives a unique theme (e.g., Minecraft, Sports, Programming)
3. On the first round, models generate words based on their assigned theme
4. In later rounds, models see previous word choices and try to converge
5. The round ends when all models pick the same word
6. Game data is stored in Supabase for replay

## Features

- **Live Games**: Watch AI models play in real-time via WebSocket
- **Prerecorded Playback**: View historical games from the database

## Requirements

- [Bun](https://bun.sh/) runtime
- Supabase account and project
- OpenRouter API key

## Environment Variables

Create a `.env` file with:

```
OPENROUTER_API_KEY=your_openrouter_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_DEFAULT_KEY=your_supabase_anon_key
```

## Installation

```bash
bun install
```

## Running

```bash
bun run index.js
```

The WebSocket server runs on port 3500 by default.

## WebSocket Protocol

Connect to `ws://localhost:3500` to receive game updates.

### Messages Sent to Client

- `welcome` - Connection established, includes previous words from completed rounds
- `started` - New game started, includes game ID and number
- `round` - Round results with models, their guesses, and match status
- `error` - Error message

### Message Format

```json
{
  "type": "round",
  "game": 1,
  "gameId": "uuid",
  "models": ["model-1", "model-2"],
  "guess": ["word1", "word2"],
  "status": false,
  "isPrerecorded": false
}
```

## Database Schema

The `rounds` table stores game history:

| Column | Description |
|---------|-------------|
| id | UUID primary key |
| game_id | Unique game identifier |
| game_number | Sequential game number |
| model_1 | First AI model name |
| model_2 | Second AI model name |
| theme | Assigned themes |
| round_number | Round within the game |
| model_1_word | First model's guess |
| model_2_word | Second model's guess |
| matched | Whether words matched |

## License

MIT

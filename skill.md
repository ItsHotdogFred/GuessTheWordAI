# Skill: Enhance the "Guess the Same Word" Game

This skill outlines ideas to make the game more engaging for players (both AI and human). Implement any of the following features as separate tasks:

1. **Scoring System**
   - Award points for each round where all AIs guess the same word.
   - Keep a cumulative score per game session and display it after each round.

2. **Hint Generation**
   - After a configurable number of failed attempts, provide a hint (e.g., first letter, category).
   - Use the LLM to generate context‑relevant hints based on previous guesses.

3. **Time Limits**
   - Enforce a maximum time per round (e.g., 30 seconds). If a player does not respond, treat it as a miss.
   - Broadcast a countdown to all connected websockets.

4. **Difficulty Levels**
   - Add a `difficulty` setting (`easy`, `medium`, `hard`).
   - Higher difficulty reduces the temperature of the model and narrows the word list.

5. **Leaderboard**
   - Persist a leaderboard of top scores across sessions (simple JSON file or DB).
   - Show the top 5 players when a new game starts.

6. **Custom Word Lists**
   - Allow the host to upload a list of words (e.g., theme‑based). The game picks from this list instead of the full vocabulary.

7. **Multiplayer Chat**
   - Provide a chat channel where players can discuss strategies (optional, not used for guessing).

8. **Visual Feedback**
   - Send richer JSON messages (e.g., `type: "roundResult"`) that include colors or emojis for success/failure.

9. **Round Statistics**
   - After each round, report how many AI players guessed each unique word.

10. **Graceful Shutdown**
    - Add a command (`/stop`) that ends the current game and shows final scores.

---

**How to use**
- Choose one or more ideas above.
- Implement the corresponding changes in `index.js` or create new helper modules.
- Update the WebSocket message handling to broadcast new data fields.
- Test each feature locally before committing.

---

*This markdown serves as a planning document for developers to extend the game.*
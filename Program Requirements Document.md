
# 🌍 Project Requirements Document

**Project Name:** World Conquest – Geography Learning Game
**Technology Stack:** Blazor WebAssembly (.NET 9), C#, Leaflet.js/Mapbox (interactive map), EF Core (for storing scores/players if needed), SQLite/Azure (optional for persistence)

---

## 1. Project Overview

The goal is to create an educational game inspired by *Risk*, where players learn the names, positions, and capitals of world countries through gameplay. The game will run in the browser and be shareable via a public URL.

---

## 2. Core Features

### 2.1 Game Map

* Interactive **world map** divided into countries (geoJSON data).
* Hovering highlights country name.
* Clicking selects a country.
* Territories color-coded to indicate player ownership.

### 2.2 Gameplay Mechanics

* **Turn-based play** (single-player initially, multiplayer optional later).
* Players "conquer" countries by answering geography questions:

  * Identify country on the map.
  * Match capital city to country.
  * Flag recognition (optional).
* Correct answers = conquest; incorrect answers = lose attempt.

### 2.3 Player Progression

* Track territories owned by each player.
* Win condition: control all countries or meet learning objectives.
* Scoreboard and achievements (e.g., *Master of Africa*).

### 2.4 Educational Mode

* "Learn Mode" to explore countries without gameplay.
* Show country facts (capital, population, flag, region, history).

---

## 3. Technical Requirements

### 3.1 Frontend

* **Blazor WebAssembly (.NET 9)** for SPA interactivity.
* Tailwind CSS for styling.
* **Leaflet.js or Mapbox** for interactive maps (GeoJSON).
* SignalR (optional, for real-time multiplayer later).

### 3.2 Backend (Phase 1: Optional)

* Initially no backend (client-only).
* Future: **ASP.NET Core API** for multiplayer and persistent leaderboards.
* Database: SQLite (local) or Azure SQL for cloud.

### 3.3 Data Sources

* GeoJSON world borders (Natural Earth, open data).
* Country metadata: REST Countries API (capital, flag, population).

---

## 4. Architecture

* **Blazor Components**

  * `Map.razor` – renders map, handles clicks.
  * `QuestionPanel.razor` – displays quiz questions.
  * `Scoreboard.razor` – shows player status.
  * `GameEngine.cs` – manages rules/turns.
* **Services**

  * `CountryService` – fetches country data.
  * `GameService` – handles gameplay logic.
  * `StorageService` – saves progress locally (localStorage).

---

## 5. Development Phases

### Phase 1 – MVP

* Single-player mode.
* World map with selectable countries.
* Quiz questions to capture countries.
* Local storage for game state.

### Phase 2 – Extended Features

* Multiplayer (SignalR).
* Achievements and leaderboard.
* Educational facts panel.

### Phase 3 – Enhancements

* Difficulty levels (continent-only play).
* Custom maps (Europe-only, Africa-only).
* Timed challenges.

---

## 6. Non-Functional Requirements

* Responsive design (desktop + tablet).
* Fast loading (lazy-load maps).
* Accessible (keyboard and screen reader support).
* Shareable URL (hosted on Azure Static Web Apps or GitHub Pages).

---

## 7. Success Criteria

* MVP works offline (client-only).
* Players can correctly identify and "conquer" countries.
* Game is fun, educational, and sharable.

---

